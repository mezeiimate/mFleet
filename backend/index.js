const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'fleet_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

app.get('/', (req, res) => res.send('Fleet Management API fut!'));

// --- FELHASZNÁLÓK (USERS) ---
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, name, role FROM users ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
  const { username, password, name, role } = req.body;
  try {
    await pool.query('INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)', [username, password, name, role]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', async (req, res) => {
  const { username, name, role, password } = req.body;
  try {
    if (password) {
      await pool.query('UPDATE users SET username = $1, name = $2, role = $3, password = $4 WHERE id = $5', [username, name, role, password, req.params.id]);
    } else {
      await pool.query('UPDATE users SET username = $1, name = $2, role = $3 WHERE id = $4', [username, name, role, req.params.id]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT id, username, name, role FROM users WHERE username = $1 AND password = $2', [username, password]);
    if (result.rows.length > 0) res.json({ success: true, user: result.rows[0] });
    else res.status(401).json({ success: false, message: 'Hibás felhasználónév vagy jelszó!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- JÁRMŰVEK (VEHICLES) ---
app.get('/api/vehicles', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const expiredRes = await pool.query(`SELECT id FROM vehicles WHERE technical_exam_until < $1 AND status = 'Aktív'`, [today]);
    
    for (let row of expiredRes.rows) {
      await pool.query("UPDATE vehicles SET status = 'Szervizben' WHERE id = $1", [row.id]);
      await pool.query("INSERT INTO service_logs (vehicle_id, description, status) VALUES ($1, 'Lejárt műszaki', 'Folyamatban')", [row.id]);
    }

    const result = await pool.query(`SELECT v.*, u.name as driver_name FROM vehicles v LEFT JOIN users u ON v.user_id = u.id ORDER BY v.license_plate ASC`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/vehicles', async (req, res) => {
  const { license_plate, brand, model, year_of_manufacture, vin, fuel_type, transmission, engine_capacity, current_km, technical_exam_until, user_id, category, status } = req.body;
  try {
    await pool.query(
      `INSERT INTO vehicles (license_plate, brand, model, year_of_manufacture, vin, fuel_type, transmission, engine_capacity, current_km, technical_exam_until, user_id, category, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [license_plate, brand, model, year_of_manufacture, vin, fuel_type, transmission, engine_capacity, current_km, technical_exam_until, user_id, category, status]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/vehicles/:id', async (req, res) => {
  const { license_plate, brand, model, year_of_manufacture, vin, fuel_type, transmission, engine_capacity, current_km, technical_exam_until, user_id, category, status } = req.body;
  try {
    await pool.query(
      `UPDATE vehicles SET license_plate=$1, brand=$2, model=$3, year_of_manufacture=$4, vin=$5, fuel_type=$6, transmission=$7, engine_capacity=$8, current_km=$9, technical_exam_until=$10, user_id=$11, category=$12, status=$13 WHERE id=$14`,
      [license_plate, brand, model, year_of_manufacture, vin, fuel_type, transmission, engine_capacity, current_km, technical_exam_until, user_id, category, status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/my-cars/:userId', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vehicles WHERE user_id = $1 ORDER BY id ASC', [req.params.userId]);
    res.json({ success: true, vehicles: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/vehicles/:id/km', async (req, res) => {
  const { current_km } = req.body;
  try {
    await pool.query('UPDATE vehicles SET current_km = $1 WHERE id = $2', [current_km, req.params.id]);
    await pool.query('INSERT INTO service_logs (vehicle_id, description, status, cost) VALUES ($1, $2, $3, $4)', [req.params.id, `Kilométeróra frissítés: ${current_km} km`, 'Kész', 0]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SZERVIZNAPLÓ (SERVICE LOGS) ---
app.get('/api/service-logs', async (req, res) => {
  try {
    const result = await pool.query(`SELECT sl.*, v.license_plate, v.brand, v.model FROM service_logs sl JOIN vehicles v ON sl.vehicle_id = v.id ORDER BY sl.created_at DESC`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/vehicles/:id/logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM service_logs WHERE vehicle_id = $1 ORDER BY created_at DESC LIMIT 5', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/vehicles/:id/service', async (req, res) => {
  const { description } = req.body;
  try {
    await pool.query('INSERT INTO service_logs (vehicle_id, description, status) VALUES ($1, $2, $3)', [req.params.id, description, 'Folyamatban']);
    await pool.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['Szervizben', req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/service-logs/:id/status', async (req, res) => {
  const { status, vehicle_id, cost } = req.body;
  try {
    await pool.query('UPDATE service_logs SET status = $1, cost = $2 WHERE id = $3', [status, cost || 0, req.params.id]);
    
    if (status === 'Kész' && vehicle_id) {
      const logRes = await pool.query('SELECT description FROM service_logs WHERE id = $1', [req.params.id]);
      const description = logRes.rows[0]?.description;

      if (description === 'Lejárt műszaki') {
        const newExamDate = new Date();
        newExamDate.setFullYear(newExamDate.getFullYear() + 2);
        const formattedDate = newExamDate.toISOString().split('T')[0];
        await pool.query('UPDATE vehicles SET status = $1, technical_exam_until = $2 WHERE id = $3', ['Aktív', formattedDate, vehicle_id]);
      } else {
        await pool.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['Aktív', vehicle_id]);
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/service-logs/:id', async (req, res) => {
  try {
    const logRes = await pool.query('SELECT vehicle_id, status FROM service_logs WHERE id = $1', [req.params.id]);
    if (logRes.rows.length > 0) {
      const { vehicle_id, status } = logRes.rows[0];
      await pool.query('DELETE FROM service_logs WHERE id = $1', [req.params.id]);
      if (status === 'Folyamatban') await pool.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['Aktív', vehicle_id]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- MATRICA KATALÓGUS ÉS JÁRMŰ MATRICÁK ---
app.get('/api/sticker-types', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sticker_types ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sticker-types', async (req, res) => {
  const { name, vehicle_category, duration, territory, price } = req.body;
  try {
    await pool.query('INSERT INTO sticker_types (name, vehicle_category, duration, territory, price) VALUES ($1, $2, $3, $4, $5)', [name, vehicle_category, duration, territory, price]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/sticker-types/:id', async (req, res) => {
  const { name, vehicle_category, duration, territory, price } = req.body;
  try {
    await pool.query('UPDATE sticker_types SET name=$1, vehicle_category=$2, duration=$3, territory=$4, price=$5 WHERE id=$6', [name, vehicle_category, duration, territory, price, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/sticker-types/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sticker_types WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/vehicles/:id/stickers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT vs.id, vs.valid_until, vs.purchase_price, st.name, st.vehicle_category, st.duration, st.territory 
      FROM vehicle_stickers vs JOIN sticker_types st ON vs.sticker_type_id = st.id
      WHERE vs.vehicle_id = $1 ORDER BY vs.valid_until DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ÚJ LOGIKA: Matrica vásárláskor automatikus Pénzügyi tétel generálása!
app.post('/api/vehicles/:id/stickers', async (req, res) => {
  const { sticker_type_id, valid_until, purchase_price } = req.body;
  try {
    // 1. Rögzítjük a fizikai matricát
    await pool.query('INSERT INTO vehicle_stickers (vehicle_id, sticker_type_id, valid_until, purchase_price) VALUES ($1, $2, $3, $4)', [req.params.id, sticker_type_id, valid_until, purchase_price]);
    
    // 2. Lekérjük a típus nevét, és létrehozunk egy önálló pénzügyi tételt a Szerviznaplóban
    const stRes = await pool.query('SELECT name, territory FROM sticker_types WHERE id = $1', [sticker_type_id]);
    if (stRes.rows.length > 0) {
      // Formázzuk a lejárati dátumot magyar formátumra
      const validFormatted = new Date(valid_until).toLocaleDateString('hu-HU');
      
      // Beletesszük a leírásba a lejárati dátumot is!
      const desc = `Matrica: ${stRes.rows[0].name} (${stRes.rows[0].territory}) - Érv.: ${validFormatted}`;
      
      await pool.query('INSERT INTO service_logs (vehicle_id, description, status, cost) VALUES ($1, $2, $3, $4)', [req.params.id, desc, 'Kész', purchase_price]);
    }
    
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/vehicle-stickers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM vehicle_stickers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend fut a ${PORT}-es porton`));