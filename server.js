const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/db');
const errorHandler = require('./middleware/errorMiddleware');
const userRoutes = require('./routes/userRoutes');
// Import all route files

const attributeRoutes = require('./routes/AttributeRoutes');
const brandRoutes = require('./routes/BrandRoutes');
const categoryRoutes = require('./routes/CategoryRoutes');
const collectionRoutes = require('./routes/CollectionRoutes');
const productRoutes = require('./routes/ProductRoutes');
const productImageRoutes = require('./routes/ProductImageRoutes');
const productVariationRoutes = require('./routes/ProductVariationRoutes');
const reviewRoutes = require('./routes/ReviewRoutes');
const tagRoutes = require('./routes/TagRoutes');
const productRelationshipRoutes = require('./routes/ProductRelationshipRoutes'); // Import the routes

// Initialize Express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  next();
});

// Database connection
testConnection()
  .then(() => {
    console.log('✅ Database connection verified');
  })
  .catch((err) => {
    console.error('❌ Failed to verify database connection:', err);
    process.exit(1);
  });

// Routes
app.use('/api/users', userRoutes); // User routes

// Use the routes
app.use('/api/users', userRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/products', productRelationshipRoutes); // Mount the product relationship routes
app.use('/api/product-images', productImageRoutes);
app.use('/api/product-variations', productVariationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/product-relationships', productRelationshipRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'E-commerce API is running',
    timestamp: new Date().toISOString(),
  });
});

// Handle 404 errors for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});
