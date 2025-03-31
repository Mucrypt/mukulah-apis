module.exports = [
  {
    name: 'Apple iPhone 15 Pro Max',
    slug: 'apple-iphone-15-pro-max',
    description:
      'The iPhone 15 Pro Max features a powerful A17 Pro chip, enhanced camera system with 5x optical zoom, and a durable titanium frame with textured matte glass back.',
    shortDescription: "Apple's latest flagship with titanium design and advanced camera system",
    price: 1199.0,
    discountPrice: 1099.0,
    costPrice: 899.0,
    sku: 'IPH15PM-TIT-256',
    upc: '194252876543',
    ean: '0194252876543',
    brandId: 1,
    stockQuantity: 120,
    weight: 0.221,
    length: 16.07,
    width: 7.81,
    height: 0.8,
    minOrderQuantity: 1,
    status: 'published',
    isFeatured: true,
    isBestseller: true,
    isNew: true,
    needsShipping: true,
    taxClass: 'electronics',
    metaTitle: 'iPhone 15 Pro Max (256GB Titanium) | Apple Flagship Smartphone',
    metaDescription:
      'Buy the iPhone 15 Pro Max with titanium design, A17 Pro chip, and advanced camera system. Free shipping and returns.',
    metaKeywords: 'iphone 15 pro max, apple, titanium smartphone, 5x optical zoom',
    category: 'Electronics',
    collections: ['Smartphones', 'Featured', 'New Arrivals'],
    variants: [
      {
        sku: 'IPH15PM-TIT-256',
        price: 1199.0,
        stockQuantity: 50,
        attributes: [
          { attributeId: 1, valueId: 'titanium' }, // Color = Titanium
          { attributeId: 5, valueId: '256gb' }, // Storage = 256GB
        ],
      },
      {
        sku: 'IPH15PM-TIT-512',
        price: 1399.0,
        stockQuantity: 30,
        attributes: [
          { attributeId: 1, valueId: 'titanium' }, // Color = Titanium
          { attributeId: 5, valueId: '512gb' }, // Storage = 512GB
        ],
      },
    ],
  },
  {
    name: 'Sony WH-1000XM5 Wireless Headphones',
    slug: 'sony-wh-1000xm5-headphones',
    description:
      'Industry-leading noise cancellation with Dual Noise Sensor technology, 30-hour battery life, and exceptional sound quality with LDAC for high-resolution audio.',
    shortDescription: 'Premium wireless headphones with best-in-class noise cancellation',
    price: 399.99,
    discountPrice: 349.99,
    costPrice: 280.0,
    sku: 'SONY-WH1000XM5-BLK',
    upc: '027242923472',
    ean: '4548736134610',
    brandId: 3,
    stockQuantity: 300,
    weight: 0.25,
    length: 20.0,
    width: 18.5,
    height: 7.0,
    status: 'published',
    isFeatured: true,
    isBestseller: false,
    isNew: true,
    needsShipping: true,
    taxClass: 'electronics',
    metaTitle: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    metaDescription:
      'Experience premium sound with Sony WH-1000XM5 headphones featuring industry-leading noise cancellation and 30-hour battery life.',
    metaKeywords: 'sony headphones, noise cancelling, wireless headphones, wh-1000xm5',
    category: 'Electronics',
    collections: ['Audio', 'Featured'],
    variants: [
      {
        sku: 'SONY-WH1000XM5-BLK',
        price: 399.99,
        stockQuantity: 100,
        attributes: [
          { attributeId: 1, valueId: 'black' }, // Color = Black
        ],
      },
      {
        sku: 'SONY-WH1000XM5-SLV',
        price: 399.99,
        stockQuantity: 80,
        attributes: [
          { attributeId: 1, valueId: 'silver' }, // Color = Silver
        ],
      },
    ],
  },
  {
    name: 'Samsung 55" QLED 4K Smart TV (QN90B)',
    slug: 'samsung-55-qled-4k-smart-tv',
    description:
      'Quantum HDR 32x with Quantum Matrix Technology, Object Tracking Sound+, and Neo Quantum Processor 4K for stunning picture quality and immersive sound.',
    shortDescription: '55-inch QLED 4K Smart TV with Neo Quantum Processor',
    price: 1499.99,
    discountPrice: 1299.99,
    costPrice: 1100.0,
    sku: 'SAM-QN55QN90B',
    upc: '887276621537',
    ean: '8806094842384',
    brandId: 2,
    stockQuantity: 45,
    weight: 22.9,
    length: 48.5,
    width: 28.1,
    height: 2.6,
    status: 'published',
    isFeatured: false,
    isBestseller: true,
    isNew: false,
    needsShipping: true,
    taxClass: 'electronics',
    metaTitle: 'Samsung 55" QLED 4K Smart TV (QN90B Series)',
    metaDescription:
      'Quantum Matrix Technology and Neo Quantum Processor deliver stunning 4K visuals on this 55-inch Samsung QLED smart TV.',
    metaKeywords: 'samsung tv, qled, 4k tv, smart tv',
    category: 'Electronics',
    collections: ['Home Entertainment', 'Bestsellers'],
  },
  {
    name: 'Fitbit Charge 6 Fitness Tracker',
    slug: 'fitbit-charge-6',
    description:
      'Track your heart rate, sleep, workouts and more with 7-day battery life. Built-in GPS, 40+ exercise modes, and compatibility with both Android and iOS.',
    shortDescription: 'Advanced fitness tracker with built-in GPS and 7-day battery',
    price: 159.99,
    discountPrice: 139.99,
    costPrice: 95.0,
    sku: 'FITBIT-C6-BLK',
    upc: '811138038476',
    ean: '0811138038476',
    brandId: 5,
    stockQuantity: 200,
    weight: 0.035,
    length: 3.8,
    width: 1.5,
    height: 0.9,
    status: 'published',
    isFeatured: true,
    isBestseller: false,
    isNew: true,
    needsShipping: true,
    taxClass: 'wearables',
    metaTitle: 'Fitbit Charge 6 Fitness & Health Tracker',
    metaDescription:
      'Track workouts, heart rate, sleep and more with the Fitbit Charge 6 featuring 7-day battery life and built-in GPS.',
    metaKeywords: 'fitbit, fitness tracker, health tracker, charge 6',
    category: 'Wearables',
    collections: ['Fitness', 'New Arrivals'],
    variants: [
      {
        sku: 'FITBIT-C6-BLK',
        price: 159.99,
        stockQuantity: 200,
        attributes: [
          { attributeId: 1, valueId: 'black' }, // Color = Black
        ],
      },
      {
        sku: 'FITBIT-C6-BLU',
        price: 159.99,
        stockQuantity: 150,
        attributes: [
          { attributeId: 1, valueId: 'blue' }, // Color = Blue
        ],
      },
    ],
  },
  {
    name: 'Dell XPS 13 Plus Laptop (9320)',
    slug: 'dell-xps-13-plus',
    description:
      'Ultra-thin 13.4-inch laptop with Intel Core i7-1260P processor, 16GB LPDDR5 RAM, 512GB SSD, and edge-to-edge 4K+ touch display. Windows 11 Pro included.',
    shortDescription: 'Premium ultrabook with innovative haptic touchpad',
    price: 1699.99,
    discountPrice: 1499.99,
    costPrice: 1250.0,
    sku: 'DELL-XPS13P-16-512-SLV',
    upc: '884116419872',
    ean: '5397184674210',
    brandId: 4,
    stockQuantity: 35,
    weight: 1.17,
    length: 29.5,
    width: 19.9,
    height: 1.5,
    status: 'published',
    isFeatured: false,
    isBestseller: true,
    isNew: true,
    needsShipping: true,
    taxClass: 'computers',
    metaTitle: 'Dell XPS 13 Plus Laptop (i7/16GB/512GB)',
    metaDescription:
      'Ultra-premium 13.4-inch laptop with innovative design, 4K+ display, and powerful Intel Core i7 performance.',
    metaKeywords: 'dell xps, ultrabook, thin laptop, xps 13 plus',
    category: 'Computers',
    collections: ['Laptops', 'Bestsellers'],
    variants: [
      {
        sku: 'DELL-XPS13P-16-512-SLV',
        price: 1499.99,
        stockQuantity: 20,
        attributes: [
          { attributeId: 1, valueId: 'silver' }, // Color = Silver
          { attributeId: 5, valueId: '512gb' }, // Storage = 512GB
        ],
      },
      {
        sku: 'DELL-XPS13P-16-1TB-GRY',
        price: 1799.99,
        stockQuantity: 15,
        attributes: [
          { attributeId: 1, valueId: 'space-gray' }, // Color = Space Gray
          { attributeId: 5, valueId: '1tb' }, // Storage = 1TB
        ],
      },
    ],
  },
  {
    name: 'Premium Wireless Headphones',
    slug: 'premium-wireless-headphones',
    description:
      'High-fidelity wireless headphones with active noise cancellation, 30-hour battery life, and premium leather ear cushions for all-day comfort.',
    shortDescription: 'Noise-cancelling wireless headphones with 30h battery',
    price: 249.99,
    discountPrice: 199.99,
    costPrice: 150.0,
    sku: 'HP-PRM-BLK',
    upc: '123456789012',
    ean: '1234567890123',
    brandId: 3,
    stockQuantity: 85,
    weight: 0.32,
    length: 19.0,
    width: 17.0,
    height: 8.0,
    status: 'published',
    isFeatured: true,
    isNew: true,
    needsShipping: true,
    taxClass: 'electronics',
    metaTitle: 'Premium Wireless Headphones with Noise Cancellation',
    metaDescription:
      'Experience crystal-clear audio with these premium wireless headphones featuring ANC and 30-hour playback.',
    metaKeywords: 'wireless headphones, noise cancelling, premium audio',
    category: 'Electronics',
    collections: ['Audio', 'Featured'],
    variants: [
      {
        sku: 'HP-PRM-BLK',
        price: 199.99,
        stockQuantity: 50,
        attributes: [
          { attributeId: 1, valueId: 'black' }, // Color = Black
        ],
      },
      {
        sku: 'HP-PRM-SLV',
        price: 199.99,
        stockQuantity: 35,
        attributes: [
          { attributeId: 1, valueId: 'silver' }, // Color = Silver
        ],
      },
    ],
  },
  {
    name: 'Organic Cotton T-Shirt',
    slug: 'organic-cotton-tshirt',
    description:
      '100% GOTS-certified organic cotton t-shirt with reinforced seams and classic fit. Available in multiple colors and sizes. Ethically produced in fair trade facilities.',
    shortDescription: 'Sustainable organic cotton t-shirt in classic fit',
    price: 29.99,
    discountPrice: 24.99,
    costPrice: 12.0,
    sku: 'TS-ORG-M-WHT',
    upc: '987654321098',
    ean: '0987654321098',
    stockQuantity: 120,
    weight: 0.18,
    length: 28.0,
    width: 20.0,
    height: 2.0,
    status: 'published',
    isBestseller: true,
    needsShipping: true,
    taxClass: 'clothing',
    metaTitle: 'Organic Cotton T-Shirt | Sustainable Fashion',
    metaDescription:
      'Eco-friendly organic cotton t-shirt available in multiple colors and sizes. Ethically produced.',
    metaKeywords: 'organic cotton, tshirt, sustainable fashion',
    category: 'Clothing',
    collections: ['Bestsellers', 'Sustainable'],
    variants: [
      {
        sku: 'TS-ORG-S-WHT',
        price: 24.99,
        stockQuantity: 40,
        attributes: [
          { attributeId: 1, valueId: 'white' }, // Color = White
          { attributeId: 2, valueId: 's' }, // Size = Small
        ],
      },
      {
        sku: 'TS-ORG-M-WHT',
        price: 24.99,
        stockQuantity: 40,
        attributes: [
          { attributeId: 1, valueId: 'white' }, // Color = White
          { attributeId: 2, valueId: 'm' }, // Size = Medium
        ],
      },
      {
        sku: 'TS-ORG-M-BLK',
        price: 24.99,
        stockQuantity: 40,
        attributes: [
          { attributeId: 1, valueId: 'black' }, // Color = Black
          { attributeId: 2, valueId: 'm' }, // Size = Medium
        ],
      },
    ],
  },
  {
    name: 'Stainless Steel Water Bottle (24oz)',
    slug: 'stainless-steel-water-bottle',
    description:
      'Double-wall insulated stainless steel water bottle keeps drinks cold for 24 hours or hot for 12 hours. Leak-proof design with powder-coated finish.',
    shortDescription: 'Insulated stainless steel water bottle with 24h cold retention',
    price: 29.95,
    discountPrice: 24.95,
    costPrice: 15.0,
    sku: 'WB-24-SLV',
    upc: '567890123456',
    ean: '0567890123456',
    stockQuantity: 200,
    weight: 0.42,
    length: 9.0,
    width: 7.5,
    height: 25.0,
    status: 'published',
    isFeatured: true,
    needsShipping: true,
    taxClass: 'home',
    metaTitle: '24oz Stainless Steel Water Bottle | Insulated',
    metaDescription:
      'Double-wall insulated water bottle keeps drinks cold for 24 hours or hot for 12 hours. BPA-free and leak-proof.',
    metaKeywords: 'water bottle, stainless steel, insulated, eco friendly',
    category: 'Home',
    collections: ['Eco-Friendly', 'Featured'],
    variants: [
      {
        sku: 'WB-24-SLV',
        price: 24.95,
        stockQuantity: 100,
        attributes: [
          { attributeId: 1, valueId: 'silver' }, // Color = Silver
        ],
      },
      {
        sku: 'WB-24-BLK',
        price: 24.95,
        stockQuantity: 100,
        attributes: [
          { attributeId: 1, valueId: 'black' }, // Color = Black
        ],
      },
    ],
  },
  {
    name: 'Smart Fitness Tracker',
    slug: 'smart-fitness-tracker',
    description:
      'Track steps, calories, heart rate, sleep patterns and more with 7-day battery life. Water-resistant design with OLED touch display. Compatible with iOS and Android.',
    shortDescription: 'Advanced fitness tracker with heart rate monitor and OLED display',
    price: 89.99,
    discountPrice: 79.99,
    costPrice: 45.0,
    sku: 'FIT-TR-BLK',
    upc: '345678901234',
    ean: '0345678901234',
    brandId: 5,
    stockQuantity: 150,
    weight: 0.03,
    length: 3.6,
    width: 1.5,
    height: 0.9,
    status: 'published',
    isNew: true,
    needsShipping: true,
    taxClass: 'wearables',
    metaTitle: 'Smart Fitness Tracker with Heart Rate Monitor',
    metaDescription:
      'Track your fitness metrics including heart rate, sleep, and steps with this advanced fitness tracker.',
    metaKeywords: 'fitness tracker, activity tracker, heart rate monitor',
    category: 'Wearables',
    collections: ['Fitness', 'New Arrivals'],
    variants: [
      {
        sku: 'FIT-TR-BLK',
        price: 79.99,
        stockQuantity: 75,
        attributes: [
          { attributeId: 1, valueId: 'black' }, // Color = Black
        ],
      },
      {
        sku: 'FIT-TR-BLU',
        price: 79.99,
        stockQuantity: 75,
        attributes: [
          { attributeId: 1, valueId: 'blue' }, // Color = Blue
        ],
      },
    ],
  },
  {
    name: 'Ceramic Coffee Mug Set (4-Piece)',
    slug: 'ceramic-coffee-mug-set',
    description:
      'Set of 4 premium ceramic mugs with comfortable C-shaped handles and chip-resistant glaze. Microwave and dishwasher safe. Elegant minimalist design.',
    shortDescription: 'Set of 4 elegant ceramic coffee mugs',
    price: 39.99,
    discountPrice: 34.99,
    costPrice: 18.0,
    sku: 'MUG-SET-4-WHT',
    upc: '789012345678',
    ean: '0789012345678',
    stockQuantity: 75,
    weight: 2.1,
    length: 18.0,
    width: 18.0,
    height: 15.0,
    minOrderQuantity: 1,
    status: 'published',
    needsShipping: true,
    taxClass: 'home',
    metaTitle: 'Ceramic Coffee Mug Set | 4-Piece',
    metaDescription:
      'Beautiful set of 4 ceramic coffee mugs with comfortable handles. Microwave and dishwasher safe.',
    metaKeywords: 'coffee mugs, ceramic mugs, mug set',
    category: 'Home',
    collections: ['Kitchen'],
    variants: [
      {
        sku: 'MUG-SET-4-WHT',
        price: 34.99,
        stockQuantity: 40,
        attributes: [
          { attributeId: 1, valueId: 'white' }, // Color = White
        ],
      },
      {
        sku: 'MUG-SET-4-BLK',
        price: 34.99,
        stockQuantity: 35,
        attributes: [
          { attributeId: 1, valueId: 'black' }, // Color = Black
        ],
      },
    ],
  },
];
