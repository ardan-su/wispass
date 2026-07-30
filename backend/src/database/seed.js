/**
 * WisataPass – MariaDB Seed Script
 * Inserts roles, admin/staff users, sample tourist sites, ticket types, and promotions.
 *
 * Usage: node src/database/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../..', '.env') });
const bcrypt  = require('bcryptjs');
const { v4: uuid } = require('uuid');
const mysql   = require('mysql2/promise');

const DB_CONFIG = {
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  database:           process.env.DB_NAME     || 'wisatapass',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  multipleStatements: false,
  charset:            'utf8mb4',
};

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── TOURIST SITES DATA ───────────────────────────────────────────────────────
const SITES = [
  {
    name: 'Aqua Splash Waterpark',
    category: 'waterpark',
    description: 'The biggest waterpark in the region with 30+ water slides, wave pools, and lazy rivers. Perfect for the whole family.',
    facilities: JSON.stringify(['Parking', 'Locker', 'Restaurant', 'Prayer Room', 'First Aid', 'Shower', 'Souvenir Shop', 'WiFi']),
    location: 'Jl. Raya Waterpark No. 1, Sentul',
    city: 'Bogor', province: 'Jawa Barat',
    maps_link: 'https://maps.google.com/?q=-6.55,106.83',
    latitude: -6.55, longitude: 106.83,
    open_time: '08:00', close_time: '17:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: 1,
    tickets: [
      { name: 'Adult (Weekday)',  base_price: 120000, weekend_price: 150000, holiday_price: 175000, daily_quota: 500 },
      { name: 'Child (Weekday)',  base_price:  80000, weekend_price: 100000, holiday_price: 125000, daily_quota: 500 },
      { name: 'Family Package',  base_price: 380000, weekend_price: 450000, holiday_price: 500000, daily_quota: 100 },
    ],
  },
  {
    name: 'Taman Safari Nusantara',
    category: 'zoo',
    description: 'Drive through the open safari and see exotic animals in their natural-like habitats. Home to over 2,000 animals.',
    facilities: JSON.stringify(['Parking', 'Restaurant', 'Gift Shop', 'Baby Zoo', 'Bird Park', 'Animal Show', 'First Aid']),
    location: 'Jl. Safari No. 100, Cisarua',
    city: 'Bogor', province: 'Jawa Barat',
    maps_link: 'https://maps.google.com/?q=-6.71,106.94',
    latitude: -6.71, longitude: 106.94,
    open_time: '09:00', close_time: '17:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: 1,
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
    city: 'Jakarta Pusat', province: 'DKI Jakarta',
    maps_link: 'https://maps.google.com/?q=-6.176,-106.822',
    latitude: -6.176, longitude: -106.822,
    open_time: '09:00', close_time: '16:00',
    open_days: JSON.stringify(['tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: 0,
    tickets: [
      { name: 'Adult',         base_price:  25000, weekend_price:  25000, holiday_price:  25000, daily_quota: 300 },
      { name: 'Student/Child', base_price:   5000, weekend_price:   5000, holiday_price:   5000, daily_quota: 300 },
      { name: 'Foreigner',     base_price: 100000, weekend_price: 100000, holiday_price: 100000, daily_quota:  50 },
    ],
  },
  {
    name: 'Pantai Kuta Bali',
    category: 'beach',
    description: 'World-famous Kuta Beach with pristine white sand, legendary sunsets, surfing waves, and vibrant beach culture.',
    facilities: JSON.stringify(['Parking', 'Restroom', 'Surfboard Rental', 'Beach Chair', 'Umbrella', 'Lifeguard', 'Restaurants']),
    location: 'Jl. Pantai Kuta, Kuta',
    city: 'Badung', province: 'Bali',
    maps_link: 'https://maps.google.com/?q=-8.718,115.169',
    latitude: -8.718, longitude: 115.169,
    open_time: '06:00', close_time: '22:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: 1,
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
    city: 'Probolinggo', province: 'Jawa Timur',
    maps_link: 'https://maps.google.com/?q=-7.942,112.953',
    latitude: -7.942, longitude: 112.953,
    open_time: '03:00', close_time: '18:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: 1,
    tickets: [
      { name: 'Sunrise Tour (No Camping)', base_price: 350000, weekend_price:  400000, holiday_price:  450000, daily_quota: 200 },
      { name: '2D1N Camping Package',      base_price: 850000, weekend_price:  950000, holiday_price: 1100000, daily_quota:  50 },
    ],
  },
  {
    name: 'Dufan Theme Park',
    category: 'theme_park',
    description: "Indonesia's premier theme park featuring thrilling roller coasters, family rides, live shows, and entertainment.",
    facilities: JSON.stringify(['Parking', 'Food Court', 'Locker', 'First Aid', 'Prayer Room', 'ATM', 'WiFi', 'Baby Care']),
    location: 'Jl. Lodan Timur No. 7, Ancol',
    city: 'Jakarta Utara', province: 'DKI Jakarta',
    maps_link: 'https://maps.google.com/?q=-6.125,106.845',
    latitude: -6.125, longitude: 106.845,
    open_time: '10:00', close_time: '20:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: 1,
    tickets: [
      { name: 'Adult',          base_price: 210000, weekend_price: 285000, holiday_price: 320000, daily_quota: 2000 },
      { name: 'Child (<110cm)', base_price: 165000, weekend_price: 210000, holiday_price: 245000, daily_quota: 2000 },
      { name: 'VIP FastPass',   base_price: 500000, weekend_price: 600000, holiday_price: 700000, daily_quota:  100 },
    ],
  },
  {
    name: 'Kebun Raya Bogor',
    category: 'botanical_garden',
    description: "One of Southeast Asia's oldest and largest botanical gardens, home to 15,000+ species of plants and trees.",
    facilities: JSON.stringify(['Parking', 'Restroom', 'Cafe', 'Research Center', 'Gift Shop', 'Bicycle Rental', 'Guide']),
    location: 'Jl. Ir. H. Juanda No. 13, Paledang',
    city: 'Bogor', province: 'Jawa Barat',
    maps_link: 'https://maps.google.com/?q=-6.6,106.8',
    latitude: -6.6, longitude: 106.8,
    open_time: '07:30', close_time: '16:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: 0,
    tickets: [
      { name: 'Adult (WNI)',  base_price:  30000, weekend_price:  30000, holiday_price:  30000, daily_quota: 1000 },
      { name: 'Child WNI',   base_price:  15000, weekend_price:  15000, holiday_price:  15000, daily_quota: 1000 },
      { name: 'Adult (WNA)', base_price: 250000, weekend_price: 250000, holiday_price: 250000, daily_quota:  100 },
    ],
  },
  {
    name: 'Kawah Ijen Adventure',
    category: 'adventure_park',
    description: 'Witness the famous blue fire phenomenon and turquoise acid crater lake. A breathtaking geological wonder.',
    facilities: JSON.stringify(['Parking', 'Gas Mask Rental', 'Porter', 'Rest Area', 'Souvenir Shop', 'Warung']),
    location: 'Kecamatan Licin, Banyuwangi',
    city: 'Banyuwangi', province: 'Jawa Timur',
    maps_link: 'https://maps.google.com/?q=-8.058,114.242',
    latitude: -8.058, longitude: 114.242,
    open_time: '01:00', close_time: '12:00',
    open_days: JSON.stringify(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    is_featured: 1,
    tickets: [
      { name: 'Domestic Adult', base_price:  50000, weekend_price:  75000, holiday_price:  75000, daily_quota: 300 },
      { name: 'Domestic Child', base_price:  25000, weekend_price:  35000, holiday_price:  35000, daily_quota: 300 },
      { name: 'Foreign Adult',  base_price: 150000, weekend_price: 150000, holiday_price: 200000, daily_quota: 100 },
    ],
  },
  {
    name: 'Jazz & Culture Festival',
    category: 'event',
    description: 'Annual jazz and cultural festival featuring 50+ artists, food bazaar, art exhibitions, and cultural performances.',
    facilities: JSON.stringify(['Parking', 'Food Bazaar', 'VIP Lounge', 'Merch Shop', 'First Aid', 'ATM', 'WiFi']),
    location: 'GBK Stadium, Senayan',
    city: 'Jakarta Pusat', province: 'DKI Jakarta',
    maps_link: 'https://maps.google.com/?q=-6.218,106.802',
    latitude: -6.218, longitude: 106.802,
    open_time: '12:00', close_time: '23:00',
    open_days: JSON.stringify(['friday','saturday','sunday']),
    is_featured: 1,
    tickets: [
      { name: 'General Admission', base_price:  175000, weekend_price:  200000, holiday_price:   250000, daily_quota: 5000 },
      { name: 'VIP',               base_price:  450000, weekend_price:  500000, holiday_price:   600000, daily_quota:  500 },
      { name: 'VVIP + Backstage',  base_price: 1200000, weekend_price: 1500000, holiday_price:  1800000, daily_quota:   50 },
    ],
  },
];

const PROMOTIONS = [
  { code: 'WELCOME10', name: 'Welcome Discount 10%',   discount_type: 'percentage', discount_value: 10,    min_purchase: 50000,  max_discount: 50000,  usage_limit: 1000, days: 365 },
  { code: 'WISATA20',  name: 'WisataPass 20% Off',     discount_type: 'percentage', discount_value: 20,    min_purchase: 200000, max_discount: 100000, usage_limit:  500, days: 180 },
  { code: 'FLAT50K',   name: 'Flat Rp50.000 Discount', discount_type: 'fixed',      discount_value: 50000, min_purchase: 300000, max_discount: null,   usage_limit:  200, days:  90 },
];

async function seed() {
  const conn = await mysql.createConnection(DB_CONFIG);
  try {
    console.log('🌱 Starting MariaDB seed…\n');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // ── Roles ──────────────────────────────────────────────────────────────────
    const [roles] = await conn.query('SELECT id, name FROM roles');
    const roleMap = {};
    roles.forEach(r => { roleMap[r.name] = r.id; });
    console.log(`✓ Roles: ${Object.keys(roleMap).join(', ')}`);

    // ── Admin user ────────────────────────────────────────────────────────────
    const adminPwHash = await bcrypt.hash('admin123', ROUNDS);
    const adminId     = uuid();
    await conn.execute(
      `INSERT IGNORE INTO users (id, role_id, username, email, password_hash, full_name, phone, is_active)
       VALUES (?, ?, 'admin', 'admin@wisatapass.local', ?, 'Administrator', '+6281234567890', 1)`,
      [adminId, roleMap.admin, adminPwHash]
    );
    // Fetch actual admin id (might already exist)
    const [[adminRow]] = await conn.execute(`SELECT id FROM users WHERE email='admin@wisatapass.local'`);
    await conn.execute(`INSERT IGNORE INTO admins (id, user_id, department) VALUES (?, ?, 'Management')`, [uuid(), adminRow.id]);
    console.log('✓ Admin user: admin@wisatapass.local / admin123');

    // ── Gate Officer ─────────────────────────────────────────────────────────
    const gatePwHash = await bcrypt.hash('gate123', ROUNDS);
    const gateId     = uuid();
    await conn.execute(
      `INSERT IGNORE INTO users (id, role_id, username, email, password_hash, full_name, phone, is_active)
       VALUES (?, ?, 'gate01', 'gate@wisatapass.local', ?, 'Gate Officer 01', '+6281234567891', 1)`,
      [gateId, roleMap.gate_officer, gatePwHash]
    );
    console.log('✓ Gate Officer: gate@wisatapass.local / gate123');

    // ── Role Permissions ───────────────────────────────────────────────────────
    console.log('\n  → Seeding role_permissions…');
    const [perms] = await conn.query('SELECT id, name FROM permissions');
    const permMap = {};
    perms.forEach(p => { permMap[p.name] = p.id; });

    // Owner gets all permissions
    const ownerRoleId = roleMap.owner;
    for (const pId of Object.values(permMap)) {
      await conn.execute(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
        [ownerRoleId, pId]
      );
    }

    // Super admin gets all permissions
    for (const pId of Object.values(permMap)) {
      await conn.execute(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
        [roleMap.super_admin, pId]
      );
    }

    // Admin gets most permissions except user.manage for safety
    const adminPerms = ['qr.generate','qr.view','qr.deactivate','qr.delete','ticket.view','ticket.manage','report.view','report.export','dashboard.view','site.manage'];
    for (const pName of adminPerms) {
      if (permMap[pName]) {
        await conn.execute(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [roleMap.admin, permMap[pName]]
        );
      }
    }
    // Also give admin user.manage
    if (permMap['user.manage']) {
      await conn.execute(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
        [roleMap.admin, permMap['user.manage']]
      );
    }

    // Gate officer: scan only
    const gatePerms = ['qr.scan','qr.view','ticket.view','dashboard.view'];
    for (const pName of gatePerms) {
      if (permMap[pName]) {
        await conn.execute(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [roleMap.gate_officer, permMap[pName]]
        );
      }
    }

    // Cashier
    const cashierPerms = ['ticket.view','ticket.manage','dashboard.view','report.view'];
    for (const pName of cashierPerms) {
      if (permMap[pName]) {
        await conn.execute(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [roleMap.cashier, permMap[pName]]
        );
      }
    }

    // Marketing
    const marketingPerms = ['site.manage','report.view','report.export','dashboard.view','qr.view'];
    for (const pName of marketingPerms) {
      if (permMap[pName]) {
        await conn.execute(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [roleMap.marketing, permMap[pName]]
        );
      }
    }

    // Viewer
    const viewerPerms = ['dashboard.view','report.view','qr.view','ticket.view'];
    for (const pName of viewerPerms) {
      if (permMap[pName]) {
        await conn.execute(
          `INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)`,
          [roleMap.viewer, permMap[pName]]
        );
      }
    }

    console.log('     ✓ role_permissions seeded');

    // ── Sample customer ───────────────────────────────────────────────────────
    const custPwHash  = await bcrypt.hash('customer123', ROUNDS);
    const custUserId  = uuid();
    await conn.execute(
      `INSERT IGNORE INTO users (id, role_id, username, email, password_hash, full_name, phone, is_active)
       VALUES (?, ?, 'johndoe', 'john@example.com', ?, 'John Doe', '+6289876543210', 1)`,
      [custUserId, roleMap.customer, custPwHash]
    );
    const [[custUserRow]] = await conn.execute(`SELECT id FROM users WHERE email='john@example.com'`);
    await conn.execute(
      `INSERT IGNORE INTO customers (id, user_id, date_of_birth, gender, city, province)
       VALUES (?, ?, '1995-08-17', 'male', 'Jakarta', 'DKI Jakarta')`,
      [uuid(), custUserRow.id]
    );
    console.log('✓ Customer: john@example.com / customer123');

    // ── Tourist Sites ─────────────────────────────────────────────────────────
    console.log('\n  → Inserting tourist sites and ticket types…');
    for (const site of SITES) {
      const siteId = uuid();
      const slug   = slugify(site.name) + '-' + siteId.substring(0, 8);
      await conn.execute(
        `INSERT IGNORE INTO tourist_sites
           (id, name, slug, category, description, facilities, location, city, province,
            maps_link, latitude, longitude, open_time, close_time, open_days, is_active, is_featured)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`,
        [siteId, site.name, slug, site.category, site.description, site.facilities,
         site.location, site.city, site.province, site.maps_link,
         site.latitude, site.longitude, site.open_time, site.close_time,
         site.open_days, site.is_featured]
      );
      for (const tt of site.tickets) {
        await conn.execute(
          `INSERT INTO ticket_types (id, site_id, name, base_price, weekend_price, holiday_price, daily_quota, is_active)
           VALUES (?,?,?,?,?,?,?,1)`,
          [uuid(), siteId, tt.name, tt.base_price, tt.weekend_price, tt.holiday_price, tt.daily_quota]
        );
      }
      console.log(`     ✓ ${site.name}`);
    }

    // ── Promotions ────────────────────────────────────────────────────────────
    console.log('\n  → Inserting promotions…');
    const now = new Date();
    for (const p of PROMOTIONS) {
      const validUntil = new Date(now.getTime() + p.days * 86400000);
      await conn.execute(
        `INSERT IGNORE INTO promotions
           (id, code, name, discount_type, discount_value, min_purchase, max_discount, usage_limit, valid_from, valid_until, is_active)
         VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
        [uuid(), p.code, p.name, p.discount_type, p.discount_value, p.min_purchase,
         p.max_discount, p.usage_limit, now, validUntil]
      );
      console.log(`     ✓ ${p.code}`);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n✅ Seed completed successfully!\n');
    console.log('📋 Test Accounts:');
    console.log('   Admin        → admin@wisatapass.local  / admin123');
    console.log('   Gate Officer → gate@wisatapass.local   / gate123');
    console.log('   Customer     → john@example.com        / customer123');
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();
