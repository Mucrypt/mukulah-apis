const { sequelize } = require('../config/db');
const Seller = require('../models/entities/Seller');
const User = require('../models/entities/User'); // Ensure this exists

async function seedSellers() {
  try {
    await sequelize.sync();

    const users = await User.findAll({ limit: 3 });
    if (!users.length) throw new Error('Seed some users first');

    const sellersData = users.map((user, i) => ({
      user_id: user.id,
      business_name: `Test Business ${i + 1}`,
      business_slug: `test-business-${i + 1}`,
      business_email: `test-seller${i + 1}@example.com`,
      business_phone: `12345678${i}`,
      business_address: `Address ${i + 1}`,
      payment_method: 'stripe',
    }));

    await Seller.bulkCreate(sellersData, { ignoreDuplicates: true });

    console.log('✅ Test sellers seeded successfully');
    process.exit();
  } catch (err) {
    console.error('❌ Failed to seed sellers:', err);
    process.exit(1);
  }
}

seedSellers();
