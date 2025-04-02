const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { testConnection } = require('./config/db');
const errorHandler = require('./middleware/errorMiddleware');

// Import all route files
const userRoutes = require('./routes/userRoutes');
const attributeRoutes = require('./routes/AttributeRoutes');
const brandRoutes = require('./routes/BrandRoutes');
const categoryRoutes = require('./routes/CategoryRoutes');
const collectionRoutes = require('./routes/CollectionRoutes');
const productRoutes = require('./routes/ProductRoutes');
const productImageRoutes = require('./routes/ProductImageRoutes');
const productVariationRoutes = require('./routes/ProductVariationRoutes');
const reviewRoutes = require('./routes/ReviewRoutes');
const tagRoutes = require('./routes/TagRoutes');
const productRelationshipRoutes = require('./routes/ProductRelationshipRoutes');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', apiLimiter);

// Enable CORS
app.use(cors());

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Compression
app.use(compression());

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Database connection
testConnection()
  .then(() => {
    console.log('✅ Database connection verified');
  })
  .catch((err) => {
    console.error('❌ Failed to verify database connection:', err);
    process.exit(1);
  });

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/products', productRoutes);
app.use('/api/product-images', productImageRoutes);
app.use('/api/product-variations', productVariationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/product-relationships', productRelationshipRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'E-commerce API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Error handler
app.use(errorHandler);

// Server setup
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  server.close(() => process.exit(1));
});
