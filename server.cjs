
const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();
const port = 3001;

// Initialize cart if it doesn't exist
if (!router.db.has('cart').value()) {
  router.db.defaults({ cart: { items: [] } }).write();
}

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

// Custom route for cart
server.get('/api/cart', (req, res) => {
  const cart = router.db.get('cart').value();
  if (cart && cart.items) {
    res.json(cart);
  } else {
    // If cart is not found or empty, return a default empty cart
    res.json({ items: [] });
  }
});

// To handle POST, PUT, PATCH requests, you need to use body-parser
server.use(jsonServer.bodyParser);
server.post('/api/cart', (req, res) => {
  try {
    const newCart = req.body;
    router.db.set('cart', newCart).write();
    res.json(newCart);
  } catch (error) {
    console.error('Error saving cart:', error);
    res.status(500).json({ error: 'Failed to save cart' });
  }
});

// Rewrite routes to add /api prefix
// It's important this comes AFTER the custom routes that also use /api
// or they will be overridden by the router.
server.use('/api', router);

// Start server
server.listen(port, () => {
  console.log(`JSON Server is running at http://localhost:${port}`);
});
