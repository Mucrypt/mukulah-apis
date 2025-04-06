// backend/database/migrations/XXXXXXXXXXXXXX-initial-schema.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        description TEXT,
        image_url VARCHAR(255),
        status VARCHAR(255) DEFAULT 'active',
        parent_id BIGINT UNSIGNED,
        lft INT,
        rgt INT,
        depth INT,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY slug (slug),
        KEY parent_id (parent_id),
        KEY lft (lft, rgt, depth),
        CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Add similar CREATE TABLE statements for all your other tables
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropAllTables();
  },
};
