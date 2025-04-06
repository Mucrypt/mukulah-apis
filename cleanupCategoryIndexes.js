const { sequelize } = require('./config/db');

(async () => {
  console.log('🔧 Cleaning up duplicate slug indexes in `categories` table...\n');

  for (let i = 2; i <= 61; i++) {
    const indexName = `slug_${i}`;
    try {
      await sequelize.query(`ALTER TABLE categories DROP INDEX \`${indexName}\`;`);
      console.log(`✅ Dropped index: ${indexName}`);
    } catch (err) {
      if (err.message.includes('check that it exists')) {
        console.log(`⚠️ Index ${indexName} does not exist.`);
      } else {
        console.log(`❌ Failed to drop ${indexName}:`, err.message);
      }
    }
  }

  console.log('\n🧹 Cleanup complete.');
  process.exit();
})();
