const mongoose = require('mongoose');

const MATERIAL_CATEGORIES = [
  'Wood',
  'Glass',
  'Aggregates',
  'Metals',
  'Bricks/Blocks',
  'Plastics',
  'Composites',
  'Cement',
  'Structural Materials',
  'Finishing Materials',
  'Ceramic Materials',
  'Insulation Materials',
  'Roofing Materials',
  'Landscaping Materials',
  'Adhesives/Sealants',
  'Paint/Coatings',
  'Plumbing Materials',
  'Electrical Materials',
  'Hardware/Fasteners',
  'Other'
];

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, enum: MATERIAL_CATEGORIES },
  address: { type: String, required: true },
  phone_no: { type: String, required: true },
  image: String,
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Location fields for Mapbox integration
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false
    },
    formattedAddress: String
  }
}, { timestamps: true });

// Create 2dsphere index for location-based queries
productSchema.index({ location: '2dsphere' });

// Make categories available for import
productSchema.statics.CATEGORIES = MATERIAL_CATEGORIES;

module.exports = mongoose.model('Product', productSchema);
