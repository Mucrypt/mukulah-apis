
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/db');
const errorHandler = require('./middleware/errorMiddleware');
const userRoutes = require('./routes/userRoutes');


// Initialize Express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
testConnection()
  .then(() => {
    console.log('Database connection verified');
  })
  .catch((err) => {
    console.error('Failed to verify database connection:', err);
    process.exit(1);
  });


// Routes
app.use('/api/users', userRoutes); // User routes

// Basic route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'E-commerce API is running',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
