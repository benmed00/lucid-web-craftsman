
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

// Custom route for cart
server.get('/api/cart', (req, res) => {
  try {
    const cart = localStorage.getItem('cart');
    res.json(cart ? JSON.parse(cart) : { items: [] });
  } catch (error) {
    console.error('Error getting cart from localStorage:', error);
    res.json({ items: [] });
  }
});

server.post('/api/cart', (req, res) => {
  try {
    localStorage.setItem('cart', JSON.stringify(req.body));
    res.json(req.body);
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
    res.status(500).json({ error: 'Failed to save cart' });
  }
});

// Rewrite routes to add /api prefix
server.use('/api', router);

// Start server
server.listen(port, () => {
  console.log(`JSON Server is running at http://localhost:${port}`);
});
