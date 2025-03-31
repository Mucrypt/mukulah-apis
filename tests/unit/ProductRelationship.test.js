const { expect } = require('chai');
const pool = require('../../config/db');
const ProductRelationship = require('../../models/ProductRelationshipModel');

describe('ProductRelationship Integration Tests', () => {
  let productRelationship;

  before(async () => {
    productRelationship = new ProductRelationship(pool);

    // Set up test data
    await pool.execute(
      'INSERT INTO products (id, name, slug, description, price, sku, status) VALUES ?',
      [
        [
          [1, 'Product 1', 'product-1', 'Desc 1', 10, 'SKU1', 'published'],
          [2, 'Product 2', 'product-2', 'Desc 2', 20, 'SKU2', 'published'],
          [3, 'Product 3', 'product-3', 'Desc 3', 30, 'SKU3', 'published'],
        ],
      ]
    );
  });

  after(async () => {
    // Clean up
    await pool.execute('DELETE FROM related_products WHERE product_id IN (1, 2, 3)');
    await pool.execute('DELETE FROM products WHERE id IN (1, 2, 3)');
  });

  describe('Related Products', () => {
    it('should add and retrieve related products', async () => {
      // Add relationships
      const added = await productRelationship.addRelatedProducts(1, [2, 3]);
      expect(added).to.equal(2);

      // Retrieve relationships
      const related = await productRelationship.getRelatedProducts(1);
      expect(related).to.be.an('array').with.lengthOf(2);
      expect(related[0].id).to.equal(2);
      expect(related[1].id).to.equal(3);
    });

    it('should support pagination', async () => {
      // Test pagination
      const page1 = await productRelationship.getRelatedProducts(1, { limit: 1 });
      expect(page1).to.have.lengthOf(1);

      const page2 = await productRelationship.getRelatedProducts(1, { limit: 1, offset: 1 });
      expect(page2).to.have.lengthOf(1);
      expect(page1[0].id).to.not.equal(page2[0].id);
    });

    it('should return correct count', async () => {
      // Test count
      const count = await productRelationship.getRelatedProductsCount(1);
      expect(count).to.equal(2);
    });
  });

  describe('Cross-Sell Products', () => {
    it('should add and retrieve cross-sell products', async () => {
      const added = await productRelationship.addCrossSellProducts(1, [2]);
      expect(added).to.equal(1);

      const crossSells = await productRelationship.getCrossSellProducts(1);
      expect(crossSells).to.be.an('array').with.lengthOf(1);
      expect(crossSells[0].id).to.equal(2);
    });
  });

  describe('Up-Sell Products', () => {
    it('should add and retrieve up-sell products', async () => {
      const added = await productRelationship.addUpSellProducts(1, [3]);
      expect(added).to.equal(1);

      const upSells = await productRelationship.getUpSellProducts(1);
      expect(upSells).to.be.an('array').with.lengthOf(1);
      expect(upSells[0].id).to.equal(3);
    });
  });
});
