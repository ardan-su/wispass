/**
 * WisataPass – Database Seed
 * Inserts roles, admin user, sample attractions, ticket types, and promotions.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'wisatapass',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const ATTRACTIONS = [
  {
    name: 'Aqua Splash Waterpark',
    category: 'waterpark',
    description: 'The biggest waterpark in the region with 30+ water slides, wave pools, and lazy rivers. Perfect for the whole family.',
    facilities: JSON.stringify(['Parking', 'Locker', 'Restaurant', 'Prayer Room', 'First Aid', 'Shower', 'Souvenir Shop', 'WiFi']),
    location: 'Jl. Raya Waterpark No. 1, Sentul',
    city: 'Bogor',
    province: 'Jawa Barat',
    maps_link: 'https://maps.google.com/?q=-6.55,106.83',
    latitude: -6.55,
    longitude: 106.83,
    open_time: '08:00',
    close_time: '17:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: true,
    tickets: [
      { name: 'Adult (Weekday)',   base_price: 120000, weekend_price: 150000, holiday_price: 175000, daily_quota: 500 },
      { name: 'Child (Weekday)',   base_price:  80000, weekend_price: 100000, holiday_price: 125000, daily_quota: 500 },
      { name: 'Family Package',   base_price: 380000, weekend_price: 450000, holiday_price: 500000, daily_quota: 100 },
    ],
  },
  {
    name: 'Taman Safari Nusantara',
    category: 'zoo',
    description: 'Drive through the open safari and see exotic animals in their natural-like habitats. Home to over 2,000 animals.',
    facilities: JSON.stringify(['Parking', 'Restaurant', 'Gift Shop', 'Baby Zoo', 'Bird Park', 'Animal Show', 'First Aid']),
    location: 'Jl. Safari No. 100, Cisarua',
    city: 'Bogor',
    province: 'Jawa Barat',
    maps_link: 'https://maps.google.com/?q=-6.71,106.94',
    latitude: -6.71,
    longitude: 106.94,
    open_time: '09:00',
    close_time: '17:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: true,
    tickets: [
      { name: 'Adult',        base_price: 250000, weekend_price: 300000, holiday_price: 350000, daily_quota: 1000 },
      { name: 'Child (3-12)', base_price: 200000, weekend_price: 250000, holiday_price: 280000, daily_quota: 1000 },
      { name: 'VIP Package',  base_price: 600000, weekend_price: 700000, holiday_price: 800000, daily_quota:   50 },
    ],
  },
  {
    name: 'Museum Nasional Indonesia',
    category: 'museum',
    description: 'Explore Indonesian history and culture through thousands of artifacts spanning prehistoric to modern era.',
    facilities: JSON.stringify(['Parking', 'AC', 'Audio Guide', 'Cafe', 'Gift Shop', 'Guided Tour', 'WiFi']),
    location: 'Jl. Merdeka Barat No. 12, Gambir',
    city: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    maps_link: 'https://maps.google.com/?q=-6.176,-106.822',
    latitude: -6.176,
    longitude: -106.822,
    open_time: '09:00',
    close_time: '16:00',
    open_days: JSON.stringify(['tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: false,
    tickets: [
      { name: 'Adult',          base_price:  25000, weekend_price:  25000, holiday_price:  25000, daily_quota: 300 },
      { name: 'Student/Child',  base_price:   5000, weekend_price:   5000, holiday_price:   5000, daily_quota: 300 },
      { name: 'Foreigner',      base_price: 100000, weekend_price: 100000, holiday_price: 100000, daily_quota:  50 },
    ],
  },
  {
    name: 'Pantai Kuta Bali',
    category: 'beach',
    description: 'World-famous Kuta Beach with pristine white sand, legendary sunsets, surfing waves, and vibrant beach culture.',
    facilities: JSON.stringify(['Parking', 'Restroom', 'Surfboard Rental', 'Beach Chair', 'Umbrella', 'Lifeguard', 'Restaurants']),
    location: 'Jl. Pantai Kuta, Kuta',
    city: 'Badung',
    province: 'Bali',
    maps_link: 'https://maps.google.com/?q=-8.718,115.169',
    latitude: -8.718,
    longitude: 115.169,
    open_time: '06:00',
    close_time: '22:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: true,
    tickets: [
      { name: 'General Entry', base_price:  15000, weekend_price:  20000, holiday_price:  25000, daily_quota: 2000 },
      { name: 'VIP Cabana',    base_price: 350000, weekend_price: 400000, holiday_price: 450000, daily_quota:   20 },
    ],
  },
  {
    name: 'Bromo Camping & Sunrise',
    category: 'camping',
    description: 'Iconic sunrise view at Mount Bromo with guided camping packages. Experience the volcanic landscape up close.',
    facilities: JSON.stringify(['Camping Tent', 'Guide', 'Jeep Transport', 'Meals', 'Bonfire', 'First Aid']),
    location: 'Desa Ngadisari, Sukapura',
    city: 'Probolinggo',
    province: 'Jawa Timur',
    maps_link: 'https://maps.google.com/?q=-7.942,112.953',
    latitude: -7.942,
    longitude: 112.953,
    open_time: '03:00',
    close_time: '18:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: true,
    tickets: [
      { name: 'Sunrise Tour (No Camping)', base_price: 350000, weekend_price: 400000, holiday_price: 450000, daily_quota: 200 },
      { name: '2D1N Camping Package',      base_price: 850000, weekend_price: 950000, holiday_price: 1100000, daily_quota: 50 },
    ],
  },
  {
    name: 'Dufan Theme Park',
    category: 'theme_park',
    description: 'Indonesia\'s premier theme park featuring thrilling roller coasters, family rides, live shows, and entertainment.',
    facilities: JSON.stringify(['Parking', 'Food Court', 'Locker', 'First Aid', 'Prayer Room', 'ATM', 'WiFi', 'Baby Care']),
    location: 'Jl. Lodan Timur No. 7, Ancol',
    city: 'Jakarta Utara',
    province: 'DKI Jakarta',
    maps_link: 'https://maps.google.com/?q=-6.125,106.845',
    latitude: -6.125,
    longitude: 106.845,
    open_time: '10:00',
    close_time: '20:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: true,
    tickets: [
      { name: 'Adult',         base_price: 210000, weekend_price: 285000, holiday_price: 320000, daily_quota: 2000 },
      { name: 'Child (<110cm)',base_price: 165000, weekend_price: 210000, holiday_price: 245000, daily_quota: 2000 },
      { name: 'VIP FastPass',  base_price: 500000, weekend_price: 600000, holiday_price: 700000, daily_quota:  100 },
    ],
  },
  {
    name: 'Desa Wisata Penglipuran',
    category: 'tourist_village',
    description: 'One of the cleanest and most beautiful traditional Balinese villages. Experience authentic culture and traditions.',
    facilities: JSON.stringify(['Parking', 'Guide', 'Souvenir Shop', 'Cafe', 'Restroom', 'Cultural Show']),
    location: 'Desa Penglipuran, Kubu',
    city: 'Bangli',
    province: 'Bali',
    maps_link: 'https://maps.google.com/?q=-8.419,115.359',
    latitude: -8.419,
    longitude: 115.359,
    open_time: '07:00',
    close_time: '18:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: false,
    tickets: [
      { name: 'Domestic Visitor',  base_price:  30000, weekend_price:  35000, holiday_price:  40000, daily_quota: 500 },
      { name: 'Foreign Visitor',   base_price:  50000, weekend_price:  60000, holiday_price:  70000, daily_quota: 200 },
    ],
  },
  {
    name: 'Kebun Raya Bogor',
    category: 'botanical_garden',
    description: 'One of Southeast Asia\'s oldest and largest botanical gardens, home to 15,000+ species of plants and trees.',
    facilities: JSON.stringify(['Parking', 'Restroom', 'Cafe', 'Research Center', 'Gift Shop', 'Bicycle Rental', 'Guide']),
    location: 'Jl. Ir. H. Juanda No. 13, Paledang',
    city: 'Bogor',
    province: 'Jawa Barat',
    maps_link: 'https://maps.google.com/?q=-6.6,106.8',
    latitude: -6.6,
    longitude: 106.8,
    open_time: '07:30',
    close_time: '16:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: false,
    tickets: [
      { name: 'Adult (WNI)',     base_price:  30000, weekend_price:  30000, holiday_price:  30000, daily_quota: 1000 },
      { name: 'Child WNI',      base_price:  15000, weekend_price:  15000, holiday_price:  15000, daily_quota: 1000 },
      { name: 'Adult (WNA)',     base_price: 250000, weekend_price: 250000, holiday_price: 250000, daily_quota:  100 },
    ],
  },
  {
    name: 'Kawah Ijen Adventure',
    category: 'adventure_park',
    description: 'Witness the famous blue fire phenomenon and turquoise acid crater lake. A breathtaking geological wonder.',
    facilities: JSON.stringify(['Parking', 'Gas Mask Rental', 'Porter', 'Rest Area', 'Souvenir Shop', 'Warung']),
    location: 'Kecamatan Licin, Banyuwangi',
    city: 'Banyuwangi',
    province: 'Jawa Timur',
    maps_link: 'https://maps.google.com/?q=-8.058,114.242',
    latitude: -8.058,
    longitude: 114.242,
    open_time: '01:00',
    close_time: '12:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: true,
    tickets: [
      { name: 'Domestic Adult',  base_price:  50000, weekend_price:  75000, holiday_price:  75000, daily_quota: 300 },
      { name: 'Domestic Child',  base_price:  25000, weekend_price:  35000, holiday_price:  35000, daily_quota: 300 },
      { name: 'Foreign Adult',   base_price: 150000, weekend_price: 150000, holiday_price: 200000, daily_quota: 100 },
    ],
  },
  {
    name: 'Jazz & Culture Festival',
    category: 'event',
    description: 'Annual jazz and cultural festival featuring 50+ artists, food bazaar, art exhibitions, and cultural performances.',
    facilities: JSON.stringify(['Parking', 'Food Bazaar', 'VIP Lounge', 'Merch Shop', 'First Aid', 'ATM', 'WiFi']),
    location: 'GBK Stadium, Senayan',
    city: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    maps_link: 'https://maps.google.com/?q=-6.218,106.802',
    latitude: -6.218,
    longitude: 106.802,
    open_time: '12:00',
    close_time: '23:00',
    open_days: JSON.stringify(['friday','saturday','sunday']),
    is_featured: true,
    tickets: [
      { name: 'General Admission', base_price: 175000, weekend_price: 200000, holiday_price: 250000, daily_quota: 5000 },
      { name: 'VIP',               base_price: 450000, weekend_price: 500000, holiday_price: 600000, daily_quota:  500 },
      { name: 'VVIP + Backstage',  base_price: 1200000, weekend_price: 1500000, holiday_price: 1800000, daily_quota: 50 },
    ],
  },
];

const PROMOTIONS = [
  {
    code: 'WELCOME10',
    name: 'Welcome Discount 10%',
    description: 'Special discount for new users',
    discount_type: 'percentage',
    discount_value: 10,
    min_purchase: 50000,
    max_discount: 50000,
    usage_limit: 1000,
    valid_from: new Date(),
    valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  },
  {
    code: 'WISATA20',
    name: 'WisataPass 20% Off',
    description: '20% discount for all attractions',
    discount_type: 'percentage',
    discount_value: 20,
    min_purchase: 200000,
    max_discount: 100000,
    usage_limit: 500,
    valid_from: new Date(),
    valid_until: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  },
  {
    code: 'FLAT50K',
    name: 'Flat 50.000 Discount',
    description: 'Rp50.000 off for orders above Rp300.000',
    discount_type: 'fixed',
    discount_value: 50000,
    min_purchase: 300000,
    max_discount: null,
    usage_limit: 200,
    valid_from: new Date(),
    valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting database seed…');
    await client.query('BEGIN');

    // ── Roles ────────────────────────────────────────────────────────────────
    console.log('  → Inserting roles…');
    await client.query(`
      INSERT INTO roles (name, description) VALUES
        ('admin',    'Full system administrator'),
        ('customer', 'Regular customer account')
      ON CONFLICT (name) DO NOTHING
    `);

    const { rows: roles } = await client.query('SELECT id, name FROM roles');
    const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));

    // ── Admin user ───────────────────────────────────────────────────────────
    console.log('  → Creating admin user…');
    const adminPasswordHash = await bcrypt.hash('admin123', parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const adminId = uuidv4();
    await client.query(`
      INSERT INTO users (id, role_id, username, email, password_hash, full_name, phone, is_active)
      VALUES ($1, $2, 'admin', 'admin@wisatapass.local', $3, 'Administrator', '+6281234567890', TRUE)
      ON CONFLICT (email) DO NOTHING
    `, [adminId, roleMap.admin, adminPasswordHash]);

    // ── Sample customer ──────────────────────────────────────────────────────
    console.log('  → Creating sample customer…');
    const custPasswordHash = await bcrypt.hash('customer123', parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const custUserId = uuidv4();
    const custId = uuidv4();
    await client.query(`
      INSERT INTO users (id, role_id, username, email, password_hash, full_name, phone, is_active)
      VALUES ($1, $2, 'johndoe', 'john@example.com', $3, 'John Doe', '+6289876543210', TRUE)
      ON CONFLICT (email) DO NOTHING
    `, [custUserId, roleMap.customer, custPasswordHash]);
    await client.query(`
      INSERT INTO customers (id, user_id, date_of_birth, gender, city, province)
      VALUES ($1, $2, '1995-08-17', 'male', 'Jakarta', 'DKI Jakarta')
      ON CONFLICT (user_id) DO NOTHING
    `, [custId, custUserId]);

    // ── Attractions & Ticket Types ───────────────────────────────────────────
    console.log('  → Creating attractions and ticket types…');
    for (const attr of ATTRACTIONS) {
      const attrId = uuidv4();
      const slug = slugify(attr.name) + '-' + attrId.substring(0, 8);
      await client.query(`
        INSERT INTO attractions
          (id, name, slug, category, description, facilities, location, city, province,
           maps_link, latitude, longitude, open_time, close_time, open_days, is_active, is_featured)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE,$16)
        ON CONFLICT (slug) DO NOTHING
      `, [
        attrId, attr.name, slug, attr.category, attr.description, attr.facilities,
        attr.location, attr.city, attr.province, attr.maps_link,
        attr.latitude, attr.longitude, attr.open_time, attr.close_time,
        attr.open_days, attr.is_featured,
      ]);

      for (const tt of attr.tickets) {
        await client.query(`
          INSERT INTO ticket_types
            (id, attraction_id, name, base_price, weekend_price, holiday_price, daily_quota, is_active)
          VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)
        `, [uuidv4(), attrId, tt.name, tt.base_price, tt.weekend_price, tt.holiday_price, tt.daily_quota]);
      }
    }

    // ── Promotions ───────────────────────────────────────────────────────────
    console.log('  → Creating promotions…');
    for (const promo of PROMOTIONS) {
      await client.query(`
        INSERT INTO promotions
          (id, code, name, description, discount_type, discount_value, min_purchase, max_discount, usage_limit, valid_from, valid_until, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE)
        ON CONFLICT (code) DO NOTHING
      `, [
        uuidv4(), promo.code, promo.name, promo.description,
        promo.discount_type, promo.discount_value, promo.min_purchase,
        promo.max_discount, promo.usage_limit, promo.valid_from, promo.valid_until,
      ]);
    }

    await client.query('COMMIT');
    console.log('✅ Seed completed successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('   Admin    → email: admin@wisatapass.local  | password: admin123');
    console.log('   Customer → email: john@example.com        | password: customer123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
