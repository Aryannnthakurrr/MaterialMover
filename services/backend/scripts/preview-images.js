/**
 * Preview Script: Generate an HTML page showing all product-image matches
 * 
 * Usage: node services/backend/scripts/preview-images.js
 * Opens a browser with all products and their matched Unsplash images.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const Product = require('../server/models/Products');

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

// Same category → search map as populate-images.js
const CATEGORY_SEARCH_MAP = {
  'Tiles': 'construction floor tiles ceramic',
  'Tiles & Flooring': 'floor tiles marble ceramic',
  'Ceramics': 'ceramic tiles building material',
  'Flooring': 'wood flooring parquet',
  'Steel Reinforcement': 'steel rebar reinforcement construction',
  'Structural Steel': 'structural steel beams construction',
  'Metals': 'metal sheets construction material',
  'Cement': 'cement bags construction material',
  'Cement & Concrete': 'concrete cement construction building',
  'Mortar': 'mortar cement construction mix',
  'Paint': 'paint cans wall coating construction',
  'Paints & Coatings': 'paint coating wall building',
  'Paint/Coatings': 'paint bucket wall coating',
  'Factory/Industrial': 'industrial building factory construction',
  'Commercial/Mall': 'commercial mall interior escalator retail',
  'Residential/Small Structures': 'residential house construction',
  'Residential Renovation': 'home renovation construction remodel',
  'Public Buildings': 'public building construction institutional',
  'High-Rise Structural': 'high rise building construction steel',
  'Bridge Components': 'bridge construction steel cables',
  'Road Construction': 'road construction asphalt paving',
  'Tunnel & Underground': 'tunnel construction underground',
  'Marine & Waterfront': 'marine construction waterfront dock',
  'Port & Marine': 'port construction marine dock',
  'Glass': 'glass panels construction building',
  'Glass & Glazing': 'glass glazing window construction',
  'Doors & Windows': 'doors windows construction building',
  'Doors': 'construction doors wooden',
  'Lumber & Wood Products': 'lumber wood planks construction',
  'Wood': 'wood timber lumber construction',
  'Bricks & Masonry': 'bricks masonry construction wall',
  'Cladding': 'cladding panels building facade',
  'Insulation': 'insulation material building construction',
  'Waterproofing': 'waterproofing membrane construction',
  'Roofing': 'roofing materials shingles construction',
  'Roofing Materials': 'roof tiles shingles construction',
  'Plumbing & Piping': 'plumbing pipes fittings construction',
  'Plumbing Materials': 'plumbing fixtures pipes construction',
  'Electrical Supplies': 'electrical wiring supplies construction',
  'Drywall': 'drywall gypsum board construction',
  'Drywall & Plaster': 'drywall plaster wall construction',
  'Aggregates': 'sand gravel aggregate construction',
  'Landscaping Materials': 'landscaping stone garden construction',
  'Fasteners & Adhesives': 'nuts bolts fasteners construction',
  'Hardware/Fasteners': 'hardware fasteners bolts construction',
  'Railings': 'railings metal staircase construction',
  'Safety & Site Equipment': 'construction safety equipment helmet',
  'Specialties': 'specialty construction materials building',
  'Specialty Materials': 'specialty building materials construction',
  'Industrial & Plant Equipment': 'industrial plant equipment construction',
  'Statues & Sculptural': 'decorative stone sculpture architectural',
  'Green Building & Sustainability': 'green building sustainable construction eco',
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const imageCache = {};

async function getImagesForCategory(category) {
  if (imageCache[category]) return imageCache[category];
  const searchTerm = CATEGORY_SEARCH_MAP[category] || `${category} construction material`;

  try {
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: { query: searchTerm, per_page: 30, orientation: 'squarish', content_filter: 'high' },
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
      timeout: 10000,
    });
    const images = response.data.results.map(r => ({
      url: r.urls.small,
      alt: r.alt_description || r.description || searchTerm,
    }));
    imageCache[category] = images;
    return images;
  } catch (err) {
    if (err.response?.status === 403) {
      console.error('⚠️  Unsplash rate limit. Waiting 60s...');
      await sleep(60000);
      return getImagesForCategory(category);
    }
    console.error(`❌ Unsplash failed for "${category}": ${err.message}`);
    imageCache[category] = [];
    return [];
  }
}

async function run() {
  console.log('🔗 Connecting to MongoDB…');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected');

  const products = await Product.find({
    title: { $exists: true },
    $or: [{ image: { $exists: false } }, { image: null }, { image: '' }],
  }).lean();

  console.log(`📦 ${products.length} products without images`);

  // Group by category
  const byCategory = {};
  for (const p of products) {
    const cat = p.category || 'Uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  }
  const categories = Object.keys(byCategory).sort();
  console.log(`📂 ${categories.length} categories\n`);

  // Fetch images per category
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    console.log(`🔍 [${i + 1}/${categories.length}] "${cat}" (${byCategory[cat].length} products)…`);
    await getImagesForCategory(cat);
    await sleep(300);
  }

  // Build HTML
  let matched = 0, noMatch = 0;
  let cardsHtml = '';

  for (const cat of categories) {
    const prods = byCategory[cat];
    const images = imageCache[cat] || [];

    cardsHtml += `<div class="cat-section" data-category="${cat}">
  <div class="cat-header"><span>${cat}</span><span class="badge">${prods.length} products · ${images.length} images</span></div>
  <div class="grid">`;

    for (let i = 0; i < prods.length; i++) {
      const p = prods[i];
      const img = images.length > 0 ? images[i % images.length] : null;
      const title = (p.title || 'Untitled').replace(/"/g, '&quot;');
      const price = p.price ? `₹${p.price.toLocaleString()}` : '';

      if (img) {
        matched++;
        cardsHtml += `
    <div class="card">
      <img src="${img.url}" alt="${title}" loading="lazy">
      <div class="info">
        <div class="title">${title}</div>
        <div class="meta">${cat}</div>
        ${price ? `<div class="price">${price}</div>` : ''}
        <span class="tag ok">✅ Matched</span>
      </div>
    </div>`;
      } else {
        noMatch++;
        cardsHtml += `
    <div class="card">
      <div class="no-img">❌ No Image</div>
      <div class="info">
        <div class="title">${title}</div>
        <div class="meta">${cat}</div>
        ${price ? `<div class="price">${price}</div>` : ''}
        <span class="tag fail">❌ No Match</span>
      </div>
    </div>`;
      }
    }
    cardsHtml += `\n  </div>\n</div>\n`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MaterialMover — Image Preview</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;color:#333}
header{background:#1a202c;color:#fff;padding:20px 30px;text-align:center}
header h1{font-size:24px;margin-bottom:6px}
header p{font-size:14px;color:#a0aec0}
.toolbar{position:sticky;top:0;z-index:10;background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 30px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.toolbar select{padding:8px 12px;border:1px solid #cbd5e0;border-radius:6px;font-size:14px}
.toolbar .stats{margin-left:auto;font-size:13px;color:#718096}
.toolbar .stats b{color:#2d3748}
.cat-section{margin:20px 30px}
.cat-header{background:#2d3748;color:#fff;padding:10px 18px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;font-size:16px;font-weight:600}
.badge{background:#4a90d9;padding:3px 12px;border-radius:12px;font-size:12px;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;padding:18px;background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px}
.card{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;transition:box-shadow .2s}
.card:hover{box-shadow:0 4px 14px rgba(0,0,0,.12)}
.card img{width:100%;height:200px;object-fit:cover;display:block;background:#edf2f7}
.no-img{width:100%;height:200px;display:flex;align-items:center;justify-content:center;background:#fed7d7;color:#c53030;font-weight:700;font-size:16px}
.info{padding:10px 12px}
.title{font-weight:600;font-size:13px;line-height:1.3;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.meta{font-size:11px;color:#718096}
.price{font-size:13px;color:#2b6cb0;font-weight:600;margin-top:2px}
.tag{display:inline-block;margin-top:6px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
.tag.ok{background:#c6f6d5;color:#22543d}
.tag.fail{background:#fed7d7;color:#c53030}
</style>
</head>
<body>
<header>
  <h1>🏗️ MaterialMover — Image Preview</h1>
  <p>${products.length} products · ${categories.length} categories · ${matched} matched · ${noMatch} missing</p>
</header>
<div class="toolbar">
  <select id="filter" onchange="filt(this.value)">
    <option value="all">All Categories (${categories.length})</option>
    ${categories.map(c => `<option value="${c}">${c} (${byCategory[c].length})</option>`).join('\n    ')}
  </select>
  <div class="stats">✅ <b>${matched}</b> matched &nbsp;·&nbsp; ❌ <b>${noMatch}</b> no image</div>
</div>
${cardsHtml}
<script>
function filt(v){document.querySelectorAll('.cat-section').forEach(s=>{s.style.display=(v==='all'||s.dataset.category===v)?'':'none'})}
</script>
</body>
</html>`;

  const outPath = path.join(__dirname, 'image-preview.html');
  fs.writeFileSync(outPath, html);
  console.log(`\n✅ Preview: ${outPath}`);
  console.log(`   ✅ ${matched} matched · ❌ ${noMatch} missing\n`);

  require('child_process').exec(`open "${outPath}"`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
