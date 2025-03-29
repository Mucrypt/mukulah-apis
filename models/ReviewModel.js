class Review {
  constructor(pool) {
    this.pool = pool;
  }

  async create({ productId, customerId, rating, title = null, comment, verifiedPurchase = false }) {
    const [result] = await this.pool.execute(
      `INSERT INTO product_reviews SET
        product_id = :productId,
        customer_id = :customerId,
        rating = :rating,
        title = :title,
        comment = :comment,
        verified_purchase = :verifiedPurchase
      `,
      { productId, customerId, rating, title, comment, verifiedPurchase }
    );

    // Update product rating stats
    await this.updateProductRating(productId);

    return result.insertId;
  }

  async updateProductRating(productId) {
    await this.pool.execute(
      `UPDATE products p
       SET 
         rating_total = (SELECT SUM(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = TRUE),
         rating_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = p.id AND is_approved = TRUE),
         average_rating = (SELECT AVG(rating) FROM product_reviews WHERE product_id = p.id AND is_approved = TRUE)
       WHERE id = ?`,
      [productId]
    );
  }

  async findById(id) {
    const [rows] = await this.pool.execute(
      `SELECT r.*, 
        (SELECT COUNT(*) FROM review_helpfulness rh WHERE rh.review_id = r.id AND rh.is_helpful = TRUE) AS helpful_count,
        (SELECT COUNT(*) FROM review_helpfulness rh WHERE rh.review_id = r.id AND rh.is_helpful = FALSE) AS not_helpful_count
      FROM product_reviews r
      WHERE r.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async findByProduct(productId, { approvedOnly = true, page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const whereClause = approvedOnly ? 'AND is_approved = TRUE' : '';

    const [rows] = await this.pool.execute(
      `SELECT r.*, 
        (SELECT COUNT(*) FROM review_helpfulness rh WHERE rh.review_id = r.id AND rh.is_helpful = TRUE) AS helpful_count,
        (SELECT COUNT(*) FROM review_helpfulness rh WHERE rh.review_id = r.id AND rh.is_helpful = FALSE) AS not_helpful_count
      FROM product_reviews r
      WHERE r.product_id = ? ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`,
      [productId, limit, offset]
    );

    const [count] = await this.pool.execute(
      `SELECT COUNT(*) as total FROM product_reviews WHERE product_id = ? ${whereClause}`,
      [productId]
    );

    return {
      reviews: rows,
      total: count[0].total,
      page,
      limit,
    };
  }

  async approve(reviewId) {
    const [result] = await this.pool.execute(
      'UPDATE product_reviews SET is_approved = TRUE WHERE id = ?',
      [reviewId]
    );

    if (result.affectedRows > 0) {
      const [review] = await this.pool.execute(
        'SELECT product_id FROM product_reviews WHERE id = ?',
        [reviewId]
      );
      await this.updateProductRating(review[0].product_id);
    }

    return result.affectedRows;
  }

  async markHelpful(reviewId, customerId, isHelpful = true) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // Check if already voted
      const [existing] = await connection.execute(
        'SELECT * FROM review_helpfulness WHERE review_id = ? AND customer_id = ?',
        [reviewId, customerId]
      );

      if (existing.length > 0) {
        // Update existing vote
        await connection.execute(
          'UPDATE review_helpfulness SET is_helpful = ? WHERE review_id = ? AND customer_id = ?',
          [isHelpful, reviewId, customerId]
        );
      } else {
        // Create new vote
        await connection.execute(
          'INSERT INTO review_helpfulness (review_id, customer_id, is_helpful) VALUES (?, ?, ?)',
          [reviewId, customerId, isHelpful]
        );
      }

      // Update review counts
      await connection.execute(
        `UPDATE product_reviews SET
          helpful_count = (SELECT COUNT(*) FROM review_helpfulness WHERE review_id = ? AND is_helpful = TRUE),
          not_helpful_count = (SELECT COUNT(*) FROM review_helpfulness WHERE review_id = ? AND is_helpful = FALSE)
        WHERE id = ?`,
        [reviewId, reviewId, reviewId]
      );

      await connection.commit();
      return true;
    } catch (err) {
      if (connection) await connection.rollback();
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }

  async addReply(reviewId, userId, comment) {
    const [result] = await this.pool.execute(
      'INSERT INTO review_replies (review_id, user_id, comment) VALUES (?, ?, ?)',
      [reviewId, userId, comment]
    );
    return result.insertId;
  }

  async getReplies(reviewId) {
    const [rows] = await this.pool.execute(
      'SELECT * FROM review_replies WHERE review_id = ? ORDER BY created_at',
      [reviewId]
    );
    return rows;
  }

  async delete(reviewId) {
    let connection;
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();

      // Get product ID before deleting for rating update
      const [review] = await connection.execute(
        'SELECT product_id FROM product_reviews WHERE id = ?',
        [reviewId]
      );

      // Delete replies first
      await connection.execute('DELETE FROM review_replies WHERE review_id = ?', [reviewId]);

      // Delete helpfulness votes
      await connection.execute('DELETE FROM review_helpfulness WHERE review_id = ?', [reviewId]);

      // Delete the review
      const [result] = await connection.execute('DELETE FROM product_reviews WHERE id = ?', [
        reviewId,
      ]);

      // Update product rating if review was approved
      if (review.length > 0) {
        await this.updateProductRating(review[0].product_id);
      }

      await connection.commit();
      return result.affectedRows;
    } catch (err) {
      if (connection) await connection.rollback();
      throw err;
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = Review;
