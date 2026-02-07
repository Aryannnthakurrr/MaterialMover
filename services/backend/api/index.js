const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const express = require('express');

// init
const app = express();
app.use(require('cors')());
app.use(express.json());

// connect db
const { connectDB } = require('../server/db');
connectDB();

// serve static frontend and uploads
app.use('/', express.static(path.join(__dirname, '../../frontend/public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// routes
app.use('/api/auth', require('../server/routes/auth'));
app.use('/api/products', require('../server/routes/products'));
app.use('/api/upload', require('../server/routes/upload'));

// Basic health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// If running locally start express server
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
}

// Export serverless handler for Vercel / other serverless platforms
const serverless = require('serverless-http');
module.exports = serverless(app);
