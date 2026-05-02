const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken'); 
require('dotenv').config(); 

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

// --- 1. KAPUŐR: Token ellenőrzése (Beléptetés) ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ error: 'Nincs token, hozzáférés megtagadva!' });

  const token = authHeader.split(' ')[1]; 
  if (!token) return res.status(401).json({ error: 'Érvénytelen token formátum!' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; 
    next(); 
  } catch (err) {
    res.status(403).json({ error: 'A token érvénytelen vagy lejárt!' });
  }
};

// --- 2. KAPUŐR: Szerepkör alapú jogosultságkezelés (RBAC) ---
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Ellenőrizzük, hogy a bejelentkezett user szerepköre benne van-e az engedélyezett listában
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Nincs jogosultságod ehhez a művelethez!' });
    }
    next();
  };
};

app.get('/', (req, res) => res.send('Fleet Management API fut! (JWT és RBAC Védett)'));

// --- BEJELENTKEZÉS (LOGIN) ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Hibás bejelentkezési adatok!' });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Hibás bejelentkezési adatok!' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ 
      success: true, 
      token, 
      user: { id: user.id, username: user.username, name: user.name, role: user.role } 
    });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});


// --- FELHASZNÁLÓK (USERS) ---
// Csak Admin listázhat, hozhat létre, vagy törölhet felhasználót
app.get('/api/users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, name, role FROM users ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { username, password, name, role } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      'INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)', 
      [username, hashedPassword, name, role]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// A PUT speciális: Admin mindenkit szerkeszthet, a többiek csak saját magukat
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  const targetUserId = parseInt(req.params.id);
  
  if (req.user.role !== 'admin' && req.user.id !== targetUserId) {
    return res.status(403).json({ error: 'Csak a saját profilodat szerkesztheted!' });
  }

  let { username, name, role, password } = req.body;
  
  // Ha nem admin az illető, nem változtathatja meg a saját szerepkörét
  if (req.user.role !== 'admin') {
    role = req.user.role; 
  }

  try {
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await pool.query(
        'UPDATE users SET username = $1, name = $2, role = $3, password = $4 WHERE id = $5', 
        [username, name, role, hashedPassword, targetUserId]
      );
    } else {
      await pool.query(
        'UPDATE users SET username = $1, name = $2, role = $3 WHERE id = $4', 
        [username, name, role, targetUserId]
      );
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- JÁRMŰVEK (VEHICLES) ---
// Csak Admin és Operátor kezelheti a flottát globálisan
app.get('/api/vehicles', authenticateToken, authorizeRoles('admin', 'operator'), async (req, res) => {
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

app.post('/api/vehicles', authenticateToken, authorizeRoles('admin', 'operator'), async (req, res) => {
  const { license_plate, brand, model, year_of_manufacture, vin, fuel_type, transmission, engine_capacity, current_km, technical_exam_until, user_id, category, status } = req.body;
  try {
    await pool.query(
      `INSERT INTO vehicles (license_plate, brand, model, year_of_manufacture, vin, fuel_type, transmission, engine_capacity, current_km, technical_exam_until, user_id, category, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [license_plate, brand, model, year_of_manufacture, vin, fuel_type, transmission, engine_capacity, current_km, technical_exam_until, user_id, category, status]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/vehicles/:id', authenticateToken, authorizeRoles('admin', 'operator'), async (req, res) => {
  const { license_plate, brand, model, year_of_manufacture, vin, fuel_type, transmission, engine_capacity, current_km, technical_exam_until, user_id, category, status } = req.body;
  try {
    await pool.query(
      `UPDATE vehicles SET license_plate=$1, brand=$2, model=$3, year_of_manufacture=$4, vin=$5, fuel_type=$6, transmission=$7, engine_capacity=$8, current_km=$9, technical_exam_until=$10, user_id=$11, category=$12, status=$13 WHERE id=$14`,
      [license_plate, brand, model, year_of_manufacture, vin, fuel_type, transmission, engine_capacity, current_km, technical_exam_until, user_id, category, status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Ezt a sofőrök is elérhetik, de csak a saját autójukat!
app.get('/api/my-cars/:userId', authenticateToken, async (req, res) => {
  const targetUserId = parseInt(req.params.userId);
  if (req.user.role === 'driver' && req.user.id !== targetUserId) {
    return res.status(403).json({ error: 'Csak a saját autóidat láthatod!' });
  }
  try {
    const result = await pool.query('SELECT * FROM vehicles WHERE user_id = $1 ORDER BY id ASC', [targetUserId]);
    res.json({ success: true, vehicles: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Bárki frissítheti az óraállást (A sofőr a sajátján)
app.put('/api/vehicles/:id/km', authenticateToken, async (req, res) => {
  const { current_km } = req.body;
  try {
    await pool.query('UPDATE vehicles SET current_km = $1 WHERE id = $2', [current_km, req.params.id]);
    await pool.query('INSERT INTO service_logs (vehicle_id, description, status, cost) VALUES ($1, $2, $3, $4)', [req.params.id, `Kilométeróra frissítés: ${current_km} km`, 'Kész', 0]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- SZERVIZNAPLÓ (SERVICE LOGS) ---
// Szerviztáblát csak az Admin és az Operátor látja
app.get('/api/service-logs', authenticateToken, authorizeRoles('admin', 'operator'), async (req, res) => {
  try {
    const result = await pool.query(`SELECT sl.*, v.license_plate, v.brand, v.model FROM service_logs sl JOIN vehicles v ON sl.vehicle_id = v.id ORDER BY sl.created_at DESC`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/service-logs/:id/status', authenticateToken, authorizeRoles('admin', 'operator'), async (req, res) => {
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

app.delete('/api/service-logs/:id', authenticateToken, authorizeRoles('admin', 'operator'), async (req, res) => {
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

// A konkrét autó szerviz előzményeit és a hibabejelentést a sofőr is elérheti
app.get('/api/vehicles/:id/logs', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM service_logs WHERE vehicle_id = $1 ORDER BY created_at DESC LIMIT 5', [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/vehicles/:id/service', authenticateToken, async (req, res) => {
  const { description } = req.body;
  try {
    await pool.query('INSERT INTO service_logs (vehicle_id, description, status) VALUES ($1, $2, $3)', [req.params.id, description, 'Folyamatban']);
    await pool.query('UPDATE vehicles SET status = $1 WHERE id = $2', ['Szervizben', req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- MATRICA KATALÓGUS ÉS JÁRMŰ MATRICÁK ---
app.get('/api/sticker-types', authenticateToken, authorizeRoles('admin', 'operator'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sticker_types ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sticker-types', authenticateToken, authorizeRoles('admin', 'operator'), async (req, res) => {
  const { name, vehicle_category, duration, territory, price } = req.body;
  try {
    await pool.query('INSERT INTO sticker_types (name, vehicle_category, duration, territory, price) VALUES ($1, $2, $3, $4, $5)', [name, vehicle_category, duration, territory, price]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/sticker-types/:id', authenticateToken, authorizeRoles('admin', 'operator'), async (req, res) => {
  const { name, vehicle_category, duration, territory, price } = req.body;
  try {
    await pool.query('UPDATE sticker_types SET name=$1, vehicle_category=$2, duration=$3, territory=$4, price=$5 WHERE id=$6', [name, vehicle_category, duration, territory, price, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/sticker-types/:id', authenticateToken, authorizeRoles('admin', 'operator'), async (req, res) => {
  try {
    await pool.query('DELETE FROM sticker_types WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// A matricákat rátenni vagy levenni autóról csak admin/operátor tud
app.post('/api/vehicles/:id/stickers', authenticateToken, authorizeRoles('admin', 'operator'), async (req, res) => {
  const { sticker_type_id, valid_until, purchase_price } = req.body;
  try {
    await pool.query('INSERT INTO vehicle_stickers (vehicle_id, sticker_type_id, valid_until, purchase_price) VALUES ($1, $2, $3, $4)', [req.params.id, sticker_type_id, valid_until, purchase_price]);
    
    const stRes = await pool.query('SELECT name, territory FROM sticker_types WHERE id = $1', [sticker_type_id]);
    if (stRes.rows.length > 0) {
      const validFormatted = new Date(valid_until).toLocaleDateString('hu-HU');
      const desc = `Matrica: ${stRes.rows[0].name} (${stRes.rows[0].territory}) - Érv.: ${validFormatted}`;
      await pool.query('INSERT INTO service_logs (vehicle_id, description, status, cost) VALUES ($1, $2, $3, $4)', [req.params.id, desc, 'Kész', purchase_price]);
    }
    
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/vehicle-stickers/:id', authenticateToken, authorizeRoles('admin', 'operator'), async (req, res) => {
  try {
    await pool.query('DELETE FROM vehicle_stickers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// De az autó érvényes matricáit a sofőr is látja a "Saját autóm" nézetben
app.get('/api/vehicles/:id/stickers', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT vs.id, vs.valid_until, vs.purchase_price, st.name, st.vehicle_category, st.duration, st.territory 
      FROM vehicle_stickers vs JOIN sticker_types st ON vs.sticker_type_id = st.id
      WHERE vs.vehicle_id = $1 ORDER BY vs.valid_until DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend fut a ${PORT}-es porton`));