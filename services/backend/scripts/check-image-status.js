const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const Product = require('../server/models/Products');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const total = await Product.countDocuments({});

    // Check image fields
    const withImage = await Product.countDocuments({ image: { $exists: true, $ne: null, $ne: '' } });
    const withoutImage = await Product.countDocuments({
      title: { $exists: true },
      $or: [
        { image: { $exists: false } },
        { image: null },
        { image: '' }
      ]
    });

    // Category breakdown with image counts
    const categories = await Product.aggregate([
      { $match: { title: { $exists: true } } },
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          withImage: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$image', null] },
                  { $ne: ['$image', ''] },
                  { $gt: ['$image', null] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Sample products to see image field values
    const sampleWithImage = await Product.findOne({
      title: { $exists: true },
      image: { $exists: true, $ne: null, $ne: '' }
    }, { title: 1, category: 1, image: 1 }).lean();

    const sampleWithoutImage = await Product.findOne({
      title: { $exists: true },
      $or: [{ image: { $exists: false } }, { image: null }, { image: '' }]
    }, { title: 1, category: 1, image: 1 }).lean();

    console.log('=== IMAGE STATUS ===');
    console.log('Total product docs:    ', total);
    console.log('With image:            ', withImage);
    console.log('Without image:         ', withoutImage);
    console.log('');
    console.log('=== CATEGORIES (with image counts) ===');
    categories.forEach(c => {
      const pct = c.total > 0 ? Math.round(c.withImage / c.total * 100) : 0;
      console.log(`  ${(c._id || 'null').padEnd(25)} ${c.withImage}/${c.total} (${pct}%)`);
    });
    console.log('');
    console.log('=== SAMPLE WITH IMAGE ===');
    console.log(JSON.stringify(sampleWithImage, null, 2));
    console.log('');
    console.log('=== SAMPLE WITHOUT IMAGE ===');
    console.log(JSON.stringify(sampleWithoutImage, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
