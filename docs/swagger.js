//backend/docs/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mukulah E-Commerce API',
      version: '1.0.0',
      description: 'API documentation for the e-commerce backend',
    },
    servers: [{ url: 'http://localhost:3000/api' }],
  },
  apis: ['./routes/*.js', './controllers/*.js'], // adjust paths
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
