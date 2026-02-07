/**
 * Migration Script: Geocode Existing Products
 * 
 * Finds products without location coordinates and uses the Mapbox
 * Geocoding API to convert their address into [longitude, latitude].
 * 
 * Usage:
 *   node services/backend/scripts/geocode-existing-products.js
 * 
 * Options (env vars):
 *   DRY_RUN=true        – Preview without writing to DB
 *   BATCH_SIZE=50       – Records per batch (default 50)
 *   DELAY_MS=220        – Delay between API calls in ms (default 220)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const mongoose = require('mongoose');
const axios = require('axios');
const Product = require('../server/models/Products');

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const MONGODB_URI  = process.env.MONGODB_URI;
const DRY_RUN      = process.env.DRY_RUN === 'true';
const BATCH_SIZE   = parseInt(process.env.BATCH_SIZE, 10) || 50;
const DELAY_MS     = parseInt(process.env.DELAY_MS, 10) || 220;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeAddress(address) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`;

  const response = await axios.get(url, {
    params: {
      access_token: MAPBOX_TOKEN,
      limit: 1,
      country: 'IN'
    },
    timeout: 10000
  });

  if (response.data.features && response.data.features.length > 0) {
    const feature = response.data.features[0];
    return {
      coordinates: [feature.center[0], feature.center[1]],
      formattedAddress: feature.place_name
    };
  }

  return null;
}

async function run() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }
  if (!MAPBOX_TOKEN) {
    console.error('MAPBOX_ACCESS_TOKEN not set in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const query = {
    $or: [
      { location: { $exists: false } },
      { 'location.coordinates': { $exists: false } },
      { 'location.coordinates': { $size: 0 } },
      { 'location.coordinates': null }
    ]
  };

  const totalCount = await Product.countDocuments(query);
  const allCount = await Product.countDocuments({});
  
  console.log(`\nDatabase summary:`);
  console.log(`  Total products:            ${allCount}`);
  console.log(`  Without coordinates:        ${totalCount}`);
  console.log(`  Already have coordinates:   ${allCount - totalCount}`);
  
  if (totalCount === 0) {
    console.log('\nAll products already have coordinates. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  if (DRY_RUN) {
    console.log('\nDRY RUN mode - no records will be updated');
  }

  console.log(`\nStarting geocoding of ${totalCount} products...`);
  console.log(`  Batch size: ${BATCH_SIZE} | Delay per call: ${DELAY_MS}ms`);
  console.log(`  Estimated time: ~${Math.ceil(totalCount * DELAY_MS / 1000 / 60)} minutes\n`);

  let processed = 0;
  let success = 0;
  let failed = 0;
  const failures = [];
  let skip = 0;

  while (true) {
    const batch = await Product.find(query).skip(skip).limit(BATCH_SIZE).lean();
    if (batch.length === 0) break;

    for (const product of batch) {
      processed++;
      const prefix = `[${processed}/${totalCount}]`;

      if (!product.address) {
        console.log(`${prefix} No address for "${product.title}" (${product._id}) - skipping`);
        failed++;
        failures.push({ id: product._id, title: product.title, reason: 'No address' });
        continue;
      }

      try {
        const result = await geocodeAddress(product.address);

        if (result) {
          console.log(`${prefix} "${product.title}" -> ${result.formattedAddress} [${result.coordinates}]`);

          if (!DRY_RUN) {
            await Product.updateOne(
              { _id: product._id },
              {
                $set: {
                  location: {
                    type: 'Point',
                    coordinates: result.coordinates,
                    formattedAddress: result.formattedAddress
                  }
                }
              }
            );
          }
          success++;
        } else {
          console.log(`${prefix} Could not geocode "${product.title}" - address: "${product.address}"`);
          failed++;
          failures.push({ id: product._id, title: product.title, reason: 'No results', address: product.address });
        }
      } catch (err) {
        console.log(`${prefix} Error geocoding "${product.title}": ${err.message}`);
        failed++;
        failures.push({ id: product._id, title: product.title, reason: err.message, address: product.address });

        if (err.response && err.response.status === 429) {
          console.log('  Rate limited - waiting 60 seconds...');
          await sleep(60000);
        }
      }

      await sleep(DELAY_MS);
    }

    if (DRY_RUN) {
      skip += BATCH_SIZE;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Processed:  ${processed}`);
  console.log(`  Success:    ${success}`);
  console.log(`  Failed:     ${failed}`);
  
  if (failures.length > 0) {
    console.log('\n  Failed records:');
    failures.forEach(f => {
      console.log(`  - [${f.id}] "${f.title}" -> ${f.reason}`);
    });
  }

  if (DRY_RUN) {
    console.log('\n  This was a DRY RUN. Run without DRY_RUN=true to apply changes.');
  }

  console.log('='.repeat(60));
  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
