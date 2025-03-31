// scripts/warmupCache.js
const ProductRelationshipModel = require('../models/ProductRelationshipModel');
const productRelationship = new ProductRelationshipModel(pool);

async function warmupPopularProducts() {
  const popularProductIds = [2, 5, 8, 10]; // Get from analytics or config

  for (const productId of popularProductIds) {
    await productRelationship.getRelatedProducts(productId);
    await productRelationship.getCrossSellProducts(productId);
    await productRelationship.getUpSellProducts(productId);
  }
}

// Run daily or during low-traffic periods
