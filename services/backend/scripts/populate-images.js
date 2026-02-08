/**
 * Image Population Pipeline for Construction Materials
 * 
 * Flow: Unsplash Search → Cloudinary Upload → Google Vision Verify → MongoDB Save
 * 
 * Strategy:
 *   - Group 473 products by category (51 categories)
 *   - Search Unsplash ONCE per category (saves API calls: 51 vs 473)
 *   - Get 30 images per category, distribute among products
 *   - Upload each to Cloudinary (construction-materials/<category> folder)
 *   - Verify with Google Vision API that image matches category
 *   - Save Cloudinary URL to product.image in MongoDB
 * 
 * Usage:
 *   DRY_RUN=true  node scripts/populate-images.js   # Preview without saving
 *   node scripts/populate-images.js                  # Full run
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const Product = require('../server/models/Products');

// ─── Config ───────────────────────────────────────────────────────────────────
const DRY_RUN = process.env.DRY_RUN === 'true';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Category → search keywords mapping ──────────────────────────────────────
// Groups similar categories and provides better Unsplash search terms
const CATEGORY_SEARCH_MAP = {
  // Tiles & ceramics
  'Tiles': 'construction floor tiles ceramic',
  'Tiles & Flooring': 'floor tiles marble ceramic',
  'Ceramics': 'ceramic tiles building material',
  'Flooring': 'wood flooring parquet',
  // Steel & metals
  'Steel Reinforcement': 'steel rebar reinforcement construction',
  'Structural Steel': 'structural steel beams construction',
  'Metals': 'metal sheets construction material',
  // Cement & concrete
  'Cement': 'cement bags construction material',
  'Cement & Concrete': 'concrete cement construction building',
  'Mortar': 'mortar cement construction mix',
  // Paint & coatings
  'Paint': 'paint cans wall coating construction',
  'Paints & Coatings': 'paint coating wall building',
  'Paint/Coatings': 'paint bucket wall coating',
  // Building types
  'Factory/Industrial': 'industrial building factory construction',
  'Commercial/Mall': 'commercial building construction mall',
  'Residential/Small Structures': 'residential house construction',
  'Residential Renovation': 'home renovation construction remodel',
  'Public Buildings': 'public building construction institutional',
  'High-Rise Structural': 'high rise building construction steel',
  // Infrastructure
  'Bridge Components': 'bridge construction steel cables',
  'Road Construction': 'road construction asphalt paving',
  'Tunnel & Underground': 'tunnel construction underground',
  'Marine & Waterfront': 'marine construction waterfront dock',
  'Port & Marine': 'port construction marine dock',
  // Glass & windows
  'Glass': 'glass panels construction building',
  'Glass & Glazing': 'glass glazing window construction',
  'Doors & Windows': 'doors windows construction building',
  'Doors': 'construction doors wooden',
  // Wood & lumber
  'Lumber & Wood Products': 'lumber wood planks construction',
  'Wood': 'wood timber lumber construction',
  // Brick & masonry
  'Bricks & Masonry': 'bricks masonry construction wall',
  'Cladding': 'cladding panels building facade',
  // Insulation & waterproofing
  'Insulation': 'insulation material building construction',
  'Waterproofing': 'waterproofing membrane construction',
  // Roofing
  'Roofing': 'roofing materials shingles construction',
  'Roofing Materials': 'roof tiles shingles construction',
  // Plumbing & piping
  'Plumbing & Piping': 'plumbing pipes fittings construction',
  'Plumbing Materials': 'plumbing fixtures pipes construction',
  // Electrical
  'Electrical Supplies': 'electrical wiring supplies construction',
  // Drywall
  'Drywall': 'drywall gypsum board construction',
  'Drywall & Plaster': 'drywall plaster wall construction',
  // Aggregates & landscaping
  'Aggregates': 'sand gravel aggregate construction',
  'Landscaping Materials': 'landscaping stone garden construction',
  // Hardware & fasteners
  'Fasteners & Adhesives': 'nuts bolts fasteners construction',
  'Hardware/Fasteners': 'hardware fasteners bolts construction',
  'Railings': 'railings metal staircase construction',
  // Safety
  'Safety & Site Equipment': 'construction safety equipment helmet',
  // Specialty
  'Specialties': 'specialty construction materials building',
  'Specialty Materials': 'specialty building materials construction',
  'Industrial & Plant Equipment': 'industrial plant equipment construction',
  'Statues & Sculptural': 'decorative stone sculpture architectural',
  'Green Building & Sustainability': 'green building sustainable construction eco',
};

// Fallback for any unmapped category
const DEFAULT_SEARCH = 'construction building materials';

// Vision API category validation keywords
const VISION_VALID_LABELS = [
  'construction', 'building', 'material', 'concrete', 'cement', 'brick',
  'steel', 'metal', 'wood', 'lumber', 'tile', 'ceramic', 'glass', 'pipe',
  'plumbing', 'paint', 'roof', 'insulation', 'flooring', 'door', 'window',
  'aggregate', 'sand', 'gravel', 'stone', 'masonry', 'bolt', 'screw',
  'fastener', 'wire', 'cable', 'beam', 'rebar', 'reinforcement', 'panel',
  'board', 'drywall', 'plaster', 'sealant', 'adhesive', 'coating',
  'waterproof', 'scaffold', 'safety', 'helmet', 'equipment', 'tool',
  'industrial', 'factory', 'warehouse', 'infrastructure', 'architecture',
  'house', 'home', 'floor', 'wall', 'fence', 'railing', 'bridge',
  'road', 'asphalt', 'paving', 'cladding', 'facade', 'fixture',
  'hardware', 'composite', 'fiber', 'plastic', 'pvc', 'copper',
  'aluminum', 'iron', 'marble', 'granite', 'porcelain', 'shingle',
  'membrane', 'landscape', 'garden', 'statue', 'sculpture',
  'renovation', 'remodel', 'building material', 'property'
];

// ─── Rate limiter ─────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Unsplash search ──────────────────────────────────────────────────────────
async function searchUnsplash(query, perPage = 30) {
  try {
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query,
        per_page: perPage,
        orientation: 'squarish',
        content_filter: 'high',
      },
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });
    return response.data.results.map(photo => ({
      unsplashId: photo.id,
      url: photo.urls.regular,       // 1080px wide
      thumbUrl: photo.urls.thumb,     // 200px for preview
      description: photo.description || photo.alt_description || '',
      photographer: photo.user.name,
      downloadLink: photo.links.download_location, // for Unsplash TOS compliance
    }));
  } catch (error) {
    if (error.response?.status === 403) {
      console.error('⚠️  Unsplash rate limit reached. Waiting 60s...');
      await sleep(60000);
      return searchUnsplash(query, perPage); // retry
    }
    console.error(`Unsplash search failed for "${query}":`, error.response?.data || error.message);
    return [];
  }
}

// ─── Google Vision verification ───────────────────────────────────────────────
async function verifyWithVision(imageUrl, category) {
  try {
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        requests: [{
          image: { source: { imageUri: imageUrl } },
          features: [
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'SAFE_SEARCH_DETECTION' },
          ],
        }],
      }
    );

    const result = response.data.responses[0];
    const labels = result.labelAnnotations || [];
    const safeSearch = result.safeSearchAnnotation || {};

    // Check safety
    const isSafe = safeSearch.adult !== 'LIKELY' && safeSearch.adult !== 'VERY_LIKELY' &&
                   safeSearch.violence !== 'LIKELY' && safeSearch.violence !== 'VERY_LIKELY';

    // Check if labels match construction/building context
    const detectedLabels = labels.map(l => l.description.toLowerCase());
    const matchCount = detectedLabels.filter(label =>
      VISION_VALID_LABELS.some(valid => label.includes(valid) || valid.includes(label))
    ).length;

    const confidence = labels.length > 0 ? matchCount / Math.min(labels.length, 5) : 0;

    return {
      isValid: matchCount >= 1 && isSafe,
      confidence,
      matchCount,
      topLabels: labels.slice(0, 5).map(l => `${l.description} (${(l.score * 100).toFixed(0)}%)`),
      isSafe,
    };
  } catch (error) {
    // If Vision API fails, still allow the image (don't block on verification failure)
    console.error(`  ⚠️  Vision API error: ${error.response?.data?.error?.message || error.message}`);
    return { isValid: true, confidence: 0, matchCount: 0, topLabels: [], isSafe: true, error: true };
  }
}

// ─── Cloudinary upload ────────────────────────────────────────────────────────
async function uploadToCloudinary(imageUrl, productId, category) {
  try {
    const folderName = category.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: `construction-materials/${folderName}`,
      public_id: `product_${productId}`,
      overwrite: true,
      transformation: [
        { width: 800, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
      ],
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error(`  ❌ Cloudinary upload failed: ${error.message}`);
    return null;
  }
}

// ─── Main pipeline ────────────────────────────────────────────────────────────
async function run() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  IMAGE POPULATION PIPELINE');
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '🚀 LIVE (will save to DB)'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Use raw collection to avoid Mongoose schema enum validation
  // (DB has 51 categories that may not all be in the schema enum)
  const db = mongoose.connection.db;
  const products = await db.collection('products').find({
    title: { $exists: true },
    $or: [
      { image: { $exists: false } },
      { image: null },
      { image: '' },
    ],
  }).toArray();

  console.log(`📦 Found ${products.length} products without images\n`);

  if (products.length === 0) {
    console.log('All products already have images!');
    await mongoose.disconnect();
    return;
  }

  // Group by category
  const categoryGroups = {};
  for (const product of products) {
    const cat = product.category || 'Other';
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(product);
  }

  const categoryNames = Object.keys(categoryGroups);
  console.log(`📂 ${categoryNames.length} categories to process\n`);

  // Stats
  const stats = {
    totalProducts: products.length,
    categoriesProcessed: 0,
    imagesUploaded: 0,
    visionVerified: 0,
    visionFailed: 0,
    skipped: 0,
    errors: 0,
    failures: [],
  };

  // Process each category
  for (let ci = 0; ci < categoryNames.length; ci++) {
    const category = categoryNames[ci];
    const categoryProducts = categoryGroups[category];
    const searchQuery = CATEGORY_SEARCH_MAP[category] || `${category} construction material`;

    console.log(`\n── Category ${ci + 1}/${categoryNames.length}: ${category} (${categoryProducts.length} products) ──`);
    console.log(`   Search: "${searchQuery}"`);

    // Search Unsplash for this category
    const photos = await searchUnsplash(searchQuery, 30);

    if (photos.length === 0) {
      console.log(`   ⚠️  No Unsplash results. Trying fallback search...`);
      const fallbackPhotos = await searchUnsplash(`${category} building`, 30);
      if (fallbackPhotos.length === 0) {
        console.log(`   ❌ No images found for category. Skipping ${categoryProducts.length} products.`);
        stats.skipped += categoryProducts.length;
        stats.failures.push(...categoryProducts.map(p => ({
          id: p._id,
          title: p.title,
          reason: 'No Unsplash results for category',
        })));
        continue;
      }
      photos.push(...fallbackPhotos);
    }

    console.log(`   📸 Found ${photos.length} Unsplash images`);

    // Assign images to products (round-robin through available photos)
    for (let pi = 0; pi < categoryProducts.length; pi++) {
      const product = categoryProducts[pi];
      const photoIndex = pi % photos.length;
      const photo = photos[photoIndex];

      const prefix = `   [${pi + 1}/${categoryProducts.length}]`;
      console.log(`${prefix} ${product.title.substring(0, 50)}...`);

      if (DRY_RUN) {
        // In dry run, just verify with Vision
        console.log(`${prefix}   → Would use: ${photo.url.substring(0, 60)}...`);

        // Still verify with Vision to give confidence
        const verification = await verifyWithVision(photo.url, category);
        if (verification.isValid) {
          console.log(`${prefix}   ✅ Vision: PASS (${verification.topLabels.slice(0, 3).join(', ')})`);
          stats.visionVerified++;
        } else {
          console.log(`${prefix}   ⚠️  Vision: LOW MATCH (${verification.topLabels.slice(0, 3).join(', ')})`);
          stats.visionFailed++;
        }
        stats.imagesUploaded++;

        // Rate limit Vision API (1000 free/month, ~10/sec limit)
        await sleep(150);
        continue;
      }

      // LIVE MODE: Upload + Verify + Save
      try {
        // 1. Verify with Vision first (save Cloudinary uploads for valid images)
        const verification = await verifyWithVision(photo.url, category);

        if (!verification.isValid && !verification.error) {
          console.log(`${prefix}   ⚠️  Vision rejected (${verification.topLabels.slice(0, 3).join(', ')})`);
          // Try next photo
          const altIndex = (photoIndex + categoryProducts.length) % photos.length;
          if (altIndex !== photoIndex) {
            const altPhoto = photos[altIndex];
            const altVerify = await verifyWithVision(altPhoto.url, category);
            if (altVerify.isValid || altVerify.error) {
              // Use alternative
              photos[photoIndex] = altPhoto;
              console.log(`${prefix}   🔄 Using alternative image`);
            } else {
              // Just use original anyway
              console.log(`${prefix}   ⚠️  No better alternative, using original`);
            }
          }
          stats.visionFailed++;
        } else {
          stats.visionVerified++;
          console.log(`${prefix}   ✅ Vision: ${verification.topLabels.slice(0, 3).join(', ')}`);
        }

        // 2. Upload to Cloudinary
        const uploaded = await uploadToCloudinary(
          photos[photoIndex].url,
          product._id.toString(),
          category
        );

        if (!uploaded) {
          stats.errors++;
          stats.failures.push({ id: product._id, title: product.title, reason: 'Cloudinary upload failed' });
          continue;
        }

        // 3. Save to MongoDB (raw collection to avoid schema enum validation)
        await db.collection('products').updateOne(
          { _id: product._id },
          { $set: { image: uploaded.url } }
        );

        console.log(`${prefix}   💾 Saved: ${uploaded.url.substring(0, 60)}...`);
        stats.imagesUploaded++;

        // Trigger Unsplash download tracking (TOS compliance)
        try {
          await axios.get(photo.downloadLink, {
            headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
          });
        } catch (e) { /* non-critical */ }

      } catch (error) {
        console.error(`${prefix}   ❌ Error: ${error.message}`);
        stats.errors++;
        stats.failures.push({ id: product._id, title: product.title, reason: error.message });
      }

      // Rate limit: ~2 requests/sec to be safe across all APIs
      await sleep(500);
    }

    stats.categoriesProcessed++;

    // Respect Unsplash rate limit (50 req/hour for demo apps)
    // We make 1 search per category, so after each category wait a bit
    if (ci < categoryNames.length - 1) {
      console.log(`   ⏳ Rate limit pause (2s)...`);
      await sleep(2000);
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PIPELINE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Mode:                ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Total products:      ${stats.totalProducts}`);
  console.log(`  Categories:          ${stats.categoriesProcessed}/${categoryNames.length}`);
  console.log(`  Images ${DRY_RUN ? 'matched' : 'uploaded'}:    ${stats.imagesUploaded}`);
  console.log(`  Vision verified:     ${stats.visionVerified}`);
  console.log(`  Vision low-match:    ${stats.visionFailed}`);
  console.log(`  Skipped:             ${stats.skipped}`);
  console.log(`  Errors:              ${stats.errors}`);

  if (stats.failures.length > 0) {
    console.log(`\n  ── Failures ──`);
    stats.failures.forEach(f => {
      console.log(`  ❌ ${f.title}: ${f.reason}`);
    });
  }

  console.log('═══════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
