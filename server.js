
const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const port = 3001;

server.use(middlewares);

// Add custom routes here if needed
server.use((req, res, next) => {
  // Add CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  
  // Continue to JSON Server router
  next();
});

// In-memory store for the mock cart
let mockCart = { items: [] }; // Default cart structure

// Custom route for cart
server.get('/api/cart', (req, res) => {
  console.log('GET /api/cart called, returning in-memory cart:', mockCart);
  res.status(200).json(mockCart);
});

server.post('/api/cart', (req, res) => {
  console.log('POST /api/cart called with body:', req.body);
  // Assuming the POST request body contains the entire new cart state
  // or the items to be set. For simplicity, replacing the whole cart.
  if (req.body) {
    mockCart = req.body;
    console.log('In-memory cart updated:', mockCart);
    res.status(200).json(mockCart);
  } else {
    res.status(400).json({ error: 'Request body is missing' });
  }
});

// Rewrite routes to add /api prefix
server.use('/api', router);

// Start server
server.listen(port, () => {
  console.log(`JSON Server is running at http://localhost:${port}`);
});
