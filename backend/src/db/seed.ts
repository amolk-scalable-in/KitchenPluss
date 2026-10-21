/**
 * Multi-Tenant Seed Script — run with: npm run seed
 * Clears existing operational data and populates a rich Indian commercial kitchen dataset
 * across multiple hotel/restaurant organizations: "The Grand Palace Hotel" and "Bistro Bella Napoli".
 */

import bcrypt from 'bcryptjs';
import pool from './pool.js';

const ORG_GRAND_PALACE = '11111111-1111-1111-1111-111111111111';
const ORG_BELLA_NAPOLI = '22222222-2222-2222-2222-222222222222';

async function seed(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clean existing data for clean seed
    await client.query('DELETE FROM supplier_orders;');
    await client.query('DELETE FROM live_tickets;');
    await client.query('DELETE FROM prep_logs;');
    await client.query('DELETE FROM recipe_ingredients;');
    await client.query('DELETE FROM recipes;');
    await client.query('DELETE FROM ingredients;');
    await client.query('DELETE FROM users;');
    await client.query('DELETE FROM organizations;');

    console.log('🏢 Seeding Indian Hotel & Restaurant Organizations (Clients)...');
    await client.query(`
      INSERT INTO organizations (id, name, slug, code, address, phone)
      VALUES 
        ('${ORG_GRAND_PALACE}', 'The Grand Palace Hotel', 'grand-palace', 'HOTEL-GP-101', 'Colaba Causeway, South Mumbai, Maharashtra 400001', '+91 (022) 2202-3366'),
        ('${ORG_BELLA_NAPOLI}', 'Bistro Bella Napoli', 'bella-napoli', 'BISTRO-BN-202', '100 Feet Road, Indiranagar, Bengaluru, Karnataka 560038', '+91 (080) 4123-5678');
    `);

    // ------------------------------------------------------------------ //
    // 1. Seed Users with Owner, Admin, Executive Chef, and Line Cook
    // ------------------------------------------------------------------ //
    console.log('👥 Seeding Users (Owner, Admin, Executive Chef, Line Cook)...');
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    const users = [
      // Grand Palace Hotel (Mumbai)
      {
        email: 'owner@grandpalace.com',
        name: 'Rajesh Singhania',
        role: 'Owner',
        orgId: ORG_GRAND_PALACE,
      },
      {
        email: 'admin@grandpalace.com',
        name: 'Priya Sharma',
        role: 'Admin',
        orgId: ORG_GRAND_PALACE,
      },
      {
        email: 'chef@grandpalace.com',
        name: 'Chef Sanjeev Kapoor',
        role: 'Executive Chef',
        orgId: ORG_GRAND_PALACE,
      },
      {
        email: 'cook@grandpalace.com',
        name: 'Ramesh Kumar',
        role: 'Line Cook',
        orgId: ORG_GRAND_PALACE,
      },
      // Bistro Bella Napoli & Spice Garden (Bengaluru)
      {
        email: 'owner@bellanapoli.com',
        name: 'Vikram Oberoi',
        role: 'Owner',
        orgId: ORG_BELLA_NAPOLI,
      },
      {
        email: 'admin@bellanapoli.com',
        name: 'Ananya Roy',
        role: 'Admin',
        orgId: ORG_BELLA_NAPOLI,
      },
      {
        email: 'chef@bellanapoli.com',
        name: 'Chef Vikas Khanna',
        role: 'Executive Chef',
        orgId: ORG_BELLA_NAPOLI,
      },
    ];

    for (const u of users) {
      await client.query(
        `INSERT INTO users (email, password_hash, name, role, organization_id, auth_provider)
         VALUES ($1, $2, $3, $4, $5, 'email')`,
        [u.email, defaultPasswordHash, u.name, u.role, u.orgId]
      );
    }

    // ------------------------------------------------------------------ //
    // 2. Ingredients (Indian Commercial Kitchen Pantry & INR Rates)
    // ------------------------------------------------------------------ //
    console.log('🥦 Seeding Indian Kitchen Ingredients (Pantry Stock & INR rates)...');

    // Grand Palace Ingredients
    await client.query(`
      INSERT INTO ingredients (organization_id, name, unit, current_stock, minimum_threshold, cost_per_unit)
      VALUES
        ('${ORG_GRAND_PALACE}', 'Boneless Chicken (Thighs)', 'kg',  35.0,  8.0, 260.00),
        ('${ORG_GRAND_PALACE}', 'Fresh Malai Paneer',        'kg',  20.0,  5.0, 320.00),
        ('${ORG_GRAND_PALACE}', 'Basmati Biryani Rice',      'kg',  45.0, 10.0, 165.00),
        ('${ORG_GRAND_PALACE}', 'Black Urad Dal (Makhani)',  'kg',  40.0, 10.0, 140.00),
        ('${ORG_GRAND_PALACE}', 'Pure Desi Cow Ghee',        'L',   15.0,  4.0, 650.00),
        ('${ORG_GRAND_PALACE}', 'Mutton Curry Cut',          'kg',   4.0,  6.0, 780.00), -- low stock alert!
        ('${ORG_GRAND_PALACE}', 'Fresh Amul Cream',          'L',    3.0,  5.0, 210.00), -- low stock alert!
        ('${ORG_GRAND_PALACE}', 'Ginger Garlic Paste',       'kg',  12.0,  3.0, 180.00),
        ('${ORG_GRAND_PALACE}', 'Kasuri Methi (Nagaur)',     'kg',   2.5,  0.5, 450.00),
        ('${ORG_GRAND_PALACE}', 'Alphonso Mango Pulp',       'L',   14.0,  3.0, 220.00),
        ('${ORG_GRAND_PALACE}', 'Fresh Dahi / Curd',         'kg',  15.0,  4.0,  65.00),
        ('${ORG_GRAND_PALACE}', 'Tri-Color Bell Peppers',    'kg',   8.0,  2.0,  95.00)
    `);

    // Bella Napoli Ingredients
    await client.query(`
      INSERT INTO ingredients (organization_id, name, unit, current_stock, minimum_threshold, cost_per_unit)
      VALUES
        ('${ORG_BELLA_NAPOLI}', 'Fresh Malai Paneer',         'kg', 16.0,  4.0, 320.00),
        ('${ORG_BELLA_NAPOLI}', 'Basmati Biryani Rice',       'kg', 30.0,  8.0, 165.00),
        ('${ORG_BELLA_NAPOLI}', 'Chicken Tikka Cut',          'kg', 22.0,  6.0, 260.00),
        ('${ORG_BELLA_NAPOLI}', 'Fresh Mint & Coriander',     'kg',  0.8,  1.5,  80.00), -- low stock alert!
        ('${ORG_BELLA_NAPOLI}', 'Assam CTC Tea & Spices',     'kg',  5.0,  1.5, 380.00),
        ('${ORG_BELLA_NAPOLI}', 'Pure Desi Ghee',             'L',   8.0,  2.0, 650.00)
    `);

    // Helper map to retrieve ingredients
    const { rows: gpIngs } = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM ingredients WHERE organization_id = $1`,
      [ORG_GRAND_PALACE]
    );
    const gpIngMap = Object.fromEntries(gpIngs.map((r) => [r.name, r.id]));

    const { rows: bnIngs } = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM ingredients WHERE organization_id = $1`,
      [ORG_BELLA_NAPOLI]
    );
    const bnIngMap = Object.fromEntries(bnIngs.map((r) => [r.name, r.id]));

    // ------------------------------------------------------------------ //
    // 3. Recipes (Indian Commercial Menu Items & INR Prices)
    // ------------------------------------------------------------------ //
    console.log('📖 Seeding Indian Dishes, Drinks & INR Prices...');

    // Grand Palace Recipes
    await client.query(`
      INSERT INTO recipes (organization_id, menu_item_name, station, price, prep_time_minutes)
      VALUES
        ('${ORG_GRAND_PALACE}', 'Butter Chicken (Murgh Makhani)', 'Curry & Handi',     420.00, 20),
        ('${ORG_GRAND_PALACE}', 'Paneer Butter Masala',           'Curry & Handi',     340.00, 15),
        ('${ORG_GRAND_PALACE}', 'Dal Makhani (Slow-Cooked)',      'Curry & Handi',     290.00, 25),
        ('${ORG_GRAND_PALACE}', 'Hyderabadi Dum Chicken Biryani', 'Biryani & Rice',    390.00, 22),
        ('${ORG_GRAND_PALACE}', 'Paneer Tikka Angara',            'Tandoor & Starters',320.00, 18),
        ('${ORG_GRAND_PALACE}', 'Mutton Rogan Josh',              'Curry & Handi',     540.00, 30),
        ('${ORG_GRAND_PALACE}', 'Royal Mango Lassi',              'Bar & Drinks',      140.00,  5),
        ('${ORG_GRAND_PALACE}', 'Hot Gulab Jamun with Rabdi',     'Desserts & Mithai', 160.00,  8)
    `);

    // Bella Napoli Recipes
    await client.query(`
      INSERT INTO recipes (organization_id, menu_item_name, station, price, prep_time_minutes)
      VALUES
        ('${ORG_BELLA_NAPOLI}', 'Murgh Dum Biryani',   'Biryani & Rice', 380.00, 20),
        ('${ORG_BELLA_NAPOLI}', 'Paneer Tikka Masala', 'Curry & Handi',  330.00, 15),
        ('${ORG_BELLA_NAPOLI}', 'Special Masala Chaas','Bar & Drinks',    90.00,  4)
    `);

    const { rows: gpRecipes } = await client.query<{ id: string; menu_item_name: string }>(
      `SELECT id, menu_item_name FROM recipes WHERE organization_id = $1`,
      [ORG_GRAND_PALACE]
    );
    const gpRecMap = Object.fromEntries(gpRecipes.map((r) => [r.menu_item_name, r.id]));

    const { rows: bnRecipes } = await client.query<{ id: string; menu_item_name: string }>(
      `SELECT id, menu_item_name FROM recipes WHERE organization_id = $1`,
      [ORG_BELLA_NAPOLI]
    );
    const bnRecMap = Object.fromEntries(bnRecipes.map((r) => [r.menu_item_name, r.id]));

    // ------------------------------------------------------------------ //
    // 4. Recipe Ingredients (Bill of Materials — BOM)
    // ------------------------------------------------------------------ //
    console.log('🥘 Seeding Recipe Ingredients (BOM)...');

    const gpRecipeIngredients = [
      // Butter Chicken
      [gpRecMap['Butter Chicken (Murgh Makhani)'], gpIngMap['Boneless Chicken (Thighs)'], 0.35],
      [gpRecMap['Butter Chicken (Murgh Makhani)'], gpIngMap['Fresh Amul Cream'], 0.05],
      [gpRecMap['Butter Chicken (Murgh Makhani)'], gpIngMap['Ginger Garlic Paste'], 0.02],
      [gpRecMap['Butter Chicken (Murgh Makhani)'], gpIngMap['Kasuri Methi (Nagaur)'], 0.005],
      [gpRecMap['Butter Chicken (Murgh Makhani)'], gpIngMap['Pure Desi Cow Ghee'], 0.03],

      // Paneer Butter Masala
      [gpRecMap['Paneer Butter Masala'], gpIngMap['Fresh Malai Paneer'], 0.25],
      [gpRecMap['Paneer Butter Masala'], gpIngMap['Fresh Amul Cream'], 0.04],
      [gpRecMap['Paneer Butter Masala'], gpIngMap['Kasuri Methi (Nagaur)'], 0.005],
      [gpRecMap['Paneer Butter Masala'], gpIngMap['Pure Desi Cow Ghee'], 0.025],

      // Dal Makhani
      [gpRecMap['Dal Makhani (Slow-Cooked)'], gpIngMap['Black Urad Dal (Makhani)'], 0.20],
      [gpRecMap['Dal Makhani (Slow-Cooked)'], gpIngMap['Fresh Amul Cream'], 0.04],
      [gpRecMap['Dal Makhani (Slow-Cooked)'], gpIngMap['Pure Desi Cow Ghee'], 0.03],
      [gpRecMap['Dal Makhani (Slow-Cooked)'], gpIngMap['Ginger Garlic Paste'], 0.015],

      // Hyderabadi Dum Biryani
      [gpRecMap['Hyderabadi Dum Chicken Biryani'], gpIngMap['Basmati Biryani Rice'], 0.25],
      [gpRecMap['Hyderabadi Dum Chicken Biryani'], gpIngMap['Boneless Chicken (Thighs)'], 0.30],
      [gpRecMap['Hyderabadi Dum Chicken Biryani'], gpIngMap['Pure Desi Cow Ghee'], 0.035],
      [gpRecMap['Hyderabadi Dum Chicken Biryani'], gpIngMap['Fresh Dahi / Curd'], 0.05],

      // Paneer Tikka Angara
      [gpRecMap['Paneer Tikka Angara'], gpIngMap['Fresh Malai Paneer'], 0.25],
      [gpRecMap['Paneer Tikka Angara'], gpIngMap['Tri-Color Bell Peppers'], 0.10],
      [gpRecMap['Paneer Tikka Angara'], gpIngMap['Fresh Dahi / Curd'], 0.06],
      [gpRecMap['Paneer Tikka Angara'], gpIngMap['Ginger Garlic Paste'], 0.015],

      // Mutton Rogan Josh
      [gpRecMap['Mutton Rogan Josh'], gpIngMap['Mutton Curry Cut'], 0.35],
      [gpRecMap['Mutton Rogan Josh'], gpIngMap['Pure Desi Cow Ghee'], 0.04],
      [gpRecMap['Mutton Rogan Josh'], gpIngMap['Ginger Garlic Paste'], 0.025],
      [gpRecMap['Mutton Rogan Josh'], gpIngMap['Fresh Dahi / Curd'], 0.05],

      // Royal Mango Lassi
      [gpRecMap['Royal Mango Lassi'], gpIngMap['Alphonso Mango Pulp'], 0.12],
      [gpRecMap['Royal Mango Lassi'], gpIngMap['Fresh Dahi / Curd'], 0.18],
    ];

    for (const [rid, iid, qty] of gpRecipeIngredients) {
      if (rid && iid) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_required)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [rid, iid, qty]
        );
      }
    }

    const bnRecipeIngredients = [
      [bnRecMap['Murgh Dum Biryani'], bnIngMap['Basmati Biryani Rice'], 0.25],
      [bnRecMap['Murgh Dum Biryani'], bnIngMap['Chicken Tikka Cut'], 0.28],
      [bnRecMap['Murgh Dum Biryani'], bnIngMap['Pure Desi Ghee'], 0.03],
      [bnRecMap['Murgh Dum Biryani'], bnIngMap['Fresh Mint & Coriander'], 0.02],
      [bnRecMap['Paneer Tikka Masala'], bnIngMap['Fresh Malai Paneer'], 0.25],
      [bnRecMap['Paneer Tikka Masala'], bnIngMap['Pure Desi Ghee'], 0.025],
      [bnRecMap['Special Masala Chaas'], bnIngMap['Fresh Mint & Coriander'], 0.015],
    ];

    for (const [rid, iid, qty] of bnRecipeIngredients) {
      if (rid && iid) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity_required)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [rid, iid, qty]
        );
      }
    }

    // ------------------------------------------------------------------ //
    // 5. Prep Logs (Historical Volumes for Indian Kitchens)
    // ------------------------------------------------------------------ //
    console.log('📝 Seeding Prep Logs...');

    const prepLogs = [
      // Grand Palace (Mumbai)
      { org: ORG_GRAND_PALACE, rid: gpRecMap['Butter Chicken (Murgh Makhani)'], day: 'Monday', prepped: 45, waste: 2, daysAgo: 6 },
      { org: ORG_GRAND_PALACE, rid: gpRecMap['Paneer Butter Masala'], day: 'Tuesday', prepped: 35, waste: 1, daysAgo: 5 },
      { org: ORG_GRAND_PALACE, rid: gpRecMap['Dal Makhani (Slow-Cooked)'], day: 'Wednesday', prepped: 60, waste: 3, daysAgo: 4 },
      { org: ORG_GRAND_PALACE, rid: gpRecMap['Hyderabadi Dum Chicken Biryani'], day: 'Friday', prepped: 80, waste: 4, daysAgo: 2 },
      { org: ORG_GRAND_PALACE, rid: gpRecMap['Mutton Rogan Josh'], day: 'Friday', prepped: 30, waste: 2, daysAgo: 2 },
      // Bella Napoli & Spice Garden (Bengaluru)
      { org: ORG_BELLA_NAPOLI, rid: bnRecMap['Murgh Dum Biryani'], day: 'Thursday', prepped: 50, waste: 2, daysAgo: 3 },
      { org: ORG_BELLA_NAPOLI, rid: bnRecMap['Paneer Tikka Masala'], day: 'Friday', prepped: 40, waste: 1, daysAgo: 2 },
    ];

    for (const log of prepLogs) {
      if (log.rid) {
        await client.query(
          `INSERT INTO prep_logs (organization_id, recipe_id, prep_date, day_of_week, prepped_qty, waste_qty)
           VALUES ($1, $2, CURRENT_DATE - ($3 || ' days')::INTERVAL, $4, $5, $6)`,
          [log.org, log.rid, log.daysAgo, log.day, log.prepped, log.waste]
        );
      }
    }

    // ------------------------------------------------------------------ //
    // 6. Live Tickets (Active KDS Orders)
    // ------------------------------------------------------------------ //
    console.log('🎟️ Seeding Live Tickets...');

    // Grand Palace Tickets
    if (gpRecMap['Butter Chicken (Murgh Makhani)'] && gpRecMap['Hyderabadi Dum Chicken Biryani'] && gpRecMap['Dal Makhani (Slow-Cooked)']) {
      await client.query(`
        INSERT INTO live_tickets (organization_id, recipe_id, station, table_number, status, notes)
        VALUES
          ('${ORG_GRAND_PALACE}', '${gpRecMap['Butter Chicken (Murgh Makhani)']}',   'Curry & Handi',     3, 'QUEUE',     'Spicy, serve with butter lachha paratha'),
          ('${ORG_GRAND_PALACE}', '${gpRecMap['Hyderabadi Dum Chicken Biryani']}', 'Biryani & Rice',    7, 'FIRING',    'Extra mirchi ka salan and dahi raita'),
          ('${ORG_GRAND_PALACE}', '${gpRecMap['Dal Makhani (Slow-Cooked)']}',      'Curry & Handi',     1, 'COMPLETED', 'Extra white butter on top');
      `);
    }

    // Bella Napoli Tickets
    if (bnRecMap['Murgh Dum Biryani'] && bnRecMap['Paneer Tikka Masala']) {
      await client.query(`
        INSERT INTO live_tickets (organization_id, recipe_id, station, table_number, status, notes)
        VALUES
          ('${ORG_BELLA_NAPOLI}', '${bnRecMap['Murgh Dum Biryani']}',   'Biryani & Rice', 12, 'QUEUE',  'Double chicken pieces, less spicy'),
          ('${ORG_BELLA_NAPOLI}', '${bnRecMap['Paneer Tikka Masala']}', 'Curry & Handi',  5, 'FIRING', 'Serve with hot garlic naan');
      `);
    }

    // ------------------------------------------------------------------ //
    // 7. Supplier Orders
    // ------------------------------------------------------------------ //
    console.log('📦 Seeding Supplier Orders (INR)...');
    if (gpIngMap['Mutton Curry Cut']) {
      await client.query(`
        INSERT INTO supplier_orders (organization_id, ingredient_id, quantity_ordered, status, quality_flag)
        VALUES ('${ORG_GRAND_PALACE}', '${gpIngMap['Mutton Curry Cut']}', 15.0, 'PENDING', 'PENDING_INSPECTION');
      `);
    }

    if (bnIngMap['Fresh Mint & Coriander']) {
      await client.query(`
        INSERT INTO supplier_orders (organization_id, ingredient_id, quantity_ordered, status, quality_flag)
        VALUES ('${ORG_BELLA_NAPOLI}', '${bnIngMap['Fresh Mint & Coriander']}', 5.0, 'PENDING', 'PENDING_INSPECTION');
      `);
    }

    // Refresh Materialized View
    await client.query('REFRESH MATERIALIZED VIEW mv_food_cost_summary;');

    await client.query('COMMIT');
    console.log('✅ Multi-tenant Indian commercial kitchen seed complete! Organizations, staff, Indian dishes, and ₹ INR pricing populated.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
