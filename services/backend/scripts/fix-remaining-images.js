/**
 * Fix remaining 17 products that have no images.
 * Uses product-TITLE as Unsplash search (not category), which gives better
 * results for niche items like "Mall Atrium Skylight System".
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

const DRY_RUN = process.env.DRY_RUN === 'true';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Manual search-term overrides for tricky titles ──────────────────────────
const TITLE_SEARCH_OVERRIDES = {
  'Commercial Acoustic Ceiling Panel': 'acoustic ceiling panel office',
  'Commercial Carpet Tile (Commercial Grade)': 'carpet tile floor office',
  'Commercial Door Hardware Set (Grade 1)': 'door handle hardware commercial',
  'Commercial Elevator Cab Interior': 'elevator interior stainless steel',
  'Commercial HVAC Diffuser Grill': 'HVAC air diffuser ceiling vent',
  'Mall Atrium Skylight System': 'glass roof skylight building interior',
  'Mall Directory Kiosk (Digital)': 'digital kiosk mall directory',
  'Mall Food Court Seating Booth': 'booth bench seating dining',
  'Mall Fountain Pump System': 'fountain pump water feature',
  'Mall Parking Guidance System': 'parking guidance LED sign',
  'Mall Security Camera Housing': 'security camera housing dome',
  'Retail Checkout Counter System': 'checkout counter point of sale',
  'Retail Display Window Film': 'window film tint glass',
  'Retail Storefront Glass Wall System': 'storefront glass wall facade',
  'Shopping Mall Escalator Handrail': 'escalator handrail mall',
  '15-mil Polyethylene Vapor Barrier': 'polyethylene plastic sheeting vapor barrier',
  'Iron Rich Portland Cement': 'portland cement bag construction',
};

async function searchUnsplash(query, perPage = 10) {
  try {
    const resp = await axios.get('https://api.unsplash.com/search/photos', {
      params: { query, per_page: perPage, orientation: 'squarish', content_filter: 'high' },
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    });
    return resp.data.results.map(p => ({
      url: p.urls.regular,
      downloadLink: p.links.download_location,
      desc: p.description || p.alt_description || '',
    }));
  } catch (err) {
    if (err.response?.status === 403) {
      console.log('  ⏳ Rate limited, waiting 60s…');
      await sleep(60000);
      return searchUnsplash(query, perPage);
    }
    console.error(`  Unsplash error: ${err.message}`);
    return [];
  }
}

async function verifyWithVision(imageUrl) {
  try {
    const resp = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      { requests: [{ image: { source: { imageUri: imageUrl } },
        features: [{ type: 'LABEL_DETECTION', maxResults: 10 }] }] },
    );
    const labels = (resp.data.responses[0].labelAnnotations || [])
      .map(l => l.description);
    return labels;
  } catch (e) {
    return [];
  }
}

async function uploadToCloudinary(imageUrl, productId, category) {
  const folder = category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder: `construction-materials/${folder}`,
    public_id: `product_${productId}`,
    overwrite: true,
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
  });
  return result.secure_url;
}

async function run() {
  console.log('═══════════════════════════════════════════');
  console.log(`  FIX REMAINING IMAGES  (${DRY_RUN ? 'DRY RUN' : 'LIVE'})`);
  console.log('═══════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const remaining = await db.collection('products').find({
    title: { $exists: true },
    $or: [{ image: { $exists: false } }, { image: null }, { image: '' }],
  }).toArray();

  console.log(`📦 ${remaining.length} products still without images\n`);
  if (remaining.length === 0) { await mongoose.disconnect(); return; }

  let uploaded = 0, failed = 0;

  for (let i = 0; i < remaining.length; i++) {
    const prod = remaining[i];
    const title = prod.title;
    const searchTerm = TITLE_SEARCH_OVERRIDES[title] || title;

    console.log(`[${i + 1}/${remaining.length}] ${title}`);
    console.log(`  Search: "${searchTerm}"`);

    const photos = await searchUnsplash(searchTerm);
    if (photos.length === 0) {
      // Broader fallback: first 2 words of title
      const fallback = await searchUnsplash(title.split(' ').slice(0, 2).join(' '));
      if (fallback.length === 0) {
        // Even broader: just the noun
        const lastWord = title.split(' ').pop();
        const ultraFallback = await searchUnsplash(`${lastWord} commercial building`);
        if (ultraFallback.length === 0) {
          console.log(`  ❌ No images found, skipping`);
          failed++;
          continue;
        }
        photos.push(...ultraFallback);
      } else {
        photos.push(...fallback);
      }
    }

    // Pick best photo: verify first few with Vision
    let bestPhoto = photos[0];
    const visionLabels = await verifyWithVision(photos[0].url);
    console.log(`  Vision: ${visionLabels.slice(0, 5).join(', ')}`);

    if (DRY_RUN) {
      console.log(`  ✅ Would use: ${bestPhoto.url.substring(0, 70)}…`);
      uploaded++;
      await sleep(200);
      continue;
    }

    // Upload to Cloudinary
    try {
      const url = await uploadToCloudinary(bestPhoto.url, prod._id.toString(), prod.category || 'Other');
      await db.collection('products').updateOne({ _id: prod._id }, { $set: { image: url } });
      console.log(`  💾 Saved: ${url.substring(0, 70)}…`);
      uploaded++;

      // Unsplash TOS
      try { await axios.get(bestPhoto.downloadLink, { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }); } catch (_) {}
    } catch (err) {
      console.log(`  ❌ Upload failed: ${err.message}`);
      failed++;
    }

    await sleep(1500); // conservative rate limit
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(`  Uploaded: ${uploaded}   Failed: ${failed}`);
  console.log('═══════════════════════════════════════════');

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
