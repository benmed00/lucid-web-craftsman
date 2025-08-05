// server.cjs

const jsonServer = require('json-server');
const express = require('express');
const cors = require('cors');

// Create Express app
const app = express();
const port = process.env.PORT || 3001;

// JSON Server router
const router = jsonServer.router('db.json');

// Middleware stack
app.use(cors());                          // Enable CORS (Access-Control headers)
app.use(express.json());                 // Parse JSON request bodies
app.use(jsonServer.defaults());         // Logger, static files, etc.

// Optional: Welcome route
app.get('/', (req, res) => {
  res.status(200).send('🚀 Mock API is running at /api');
});

// In-memory store for the mock cart
let mockCart = { items: [] };

// GET mock cart
app.get('/api/cart', (req, res) => {
  console.log('✅ GET /api/cart');
  res.status(200).json(mockCart);
});

// POST update mock cart
app.post('/api/cart', (req, res) => {
  try {
    const newCart = req.body;
    if (!newCart || typeof newCart !== 'object') {
      return res.status(400).json({ error: 'Invalid cart format' });
    }
    mockCart = newCart;
    console.log('✅ POST /api/cart - Updated cart:', mockCart);
    res.status(200).json(mockCart);
  } catch (error) {
    console.error('❌ Error in POST /api/cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Prefix all db.json routes with /api
app.use('/api', router);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Unexpected error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
app.listen(port, () => {
  console.log(`✅ JSON Server running at http://localhost:${port}`);
});
