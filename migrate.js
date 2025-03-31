const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

const runMigrations = async () => {
  try {
    console.log('🏗️ Running database migrations...');

    // Read all migration files
    const migrationFiles = fs
      .readdirSync(path.join(__dirname, 'migrations'))
      .sort()
      .filter((file) => file.endsWith('.sql'));

    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');
      console.log(`🚀 Running migration: ${file}`);
      await pool.query(sql);
    }

    console.log('✅ Database migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();
