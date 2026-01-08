const path = require("path");
const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function getTodayISO() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isPastDate(dateStr) {
  if (!dateStr) return false;
  return dateStr < getTodayISO();
}

function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function isPastTimeForDate(dateStr, timeStr) {
  if (!dateStr || !timeStr) return false;
  const today = getTodayISO();
  if (dateStr !== today) return false;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(timeStr) <= nowMinutes;
}

async function dbAll(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

async function dbGet(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

async function dbRun(sql, params = []) {
  return pool.query(sql, params);
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post(
  "/api/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Faltan credenciales." });
    }

  const user = await dbGet(
    `SELECT users.id,
            users.username,
            users.name,
            users.role,
            users.shop_id as shopId,
            barbers.id as barberId
     FROM users
     LEFT JOIN barbers ON barbers.user_id = users.id
     WHERE users.username = $1 AND users.password = $2`,
    [username, password]
  );

  if (!user) {
    return res.status(401).json({ error: "Credenciales invalidas." });
  }

    res.json(user);
  })
);

app.get(
  "/api/shops",
  asyncHandler(async (req, res) => {
    const shops = await dbAll("SELECT id, name, address FROM shops ORDER BY name");
    res.json(shops);
  })
);

app.post(
  "/api/shops",
  asyncHandler(async (req, res) => {
    const { actorId, name, address } = req.body || {};
    if (!actorId || !name || !address) {
      return res.status(400).json({ error: "Faltan datos." });
    }

    const actor = await dbGet("SELECT role FROM users WHERE id = $1", [actorId]);
    if (!actor || actor.role !== "admin") {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const result = await dbRun(
      "INSERT INTO shops (name, address) VALUES ($1, $2) RETURNING id, name, address",
      [name, address]
    );

    res.json(result.rows[0]);
  })
);

app.post(
  "/api/users",
  asyncHandler(async (req, res) => {
    const { actorId, username, password, name, role, shopId } = req.body || {};
    if (!actorId || !username || !password || !name || !role) {
      return res.status(400).json({ error: "Faltan datos." });
    }

    const actor = await dbGet(
      "SELECT id, role, shop_id as shopId FROM users WHERE id = $1",
      [actorId]
    );

    if (!actor) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const isAdmin = actor.role === "admin";
    const isOwner = actor.role === "dueno";

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    if (isOwner) {
      if (role !== "peluquero") {
        return res.status(403).json({ error: "El dueno solo puede crear peluqueros." });
      }
      if (!actor.shopId) {
        return res.status(400).json({ error: "El dueno no tiene peluqueria." });
      }
    }

    if ((role === "peluquero" || role === "dueno") && !shopId && !actor.shopId) {
      return res.status(400).json({ error: "Falta shopId." });
    }

    const finalShopId = isOwner ? actor.shopId : shopId || null;

    const existingUser = await dbGet(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
    if (existingUser) {
      return res.status(409).json({ error: "El usuario ya existe." });
    }

    const createdUser = await dbGet(
      `INSERT INTO users (username, password, name, role, shop_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, name, role, shop_id as shopId`,
      [username, password, name, role, finalShopId]
    );

    if (role === "peluquero") {
      const barber = await dbGet(
        "INSERT INTO barbers (user_id, shop_id) VALUES ($1, $2) RETURNING id",
        [createdUser.id, finalShopId]
      );

      await dbRun(
        `INSERT INTO barber_slots (barber_id, time)
         VALUES ($1, '09:00'),
                ($1, '10:30'),
                ($1, '12:00'),
                ($1, '14:00'),
                ($1, '15:30'),
                ($1, '17:00'),
                ($1, '18:30')`,
        [barber.id]
      );
    }

    res.json(createdUser);
  })
);

app.get(
  "/api/barbers",
  asyncHandler(async (req, res) => {
    const { shopId } = req.query;
    if (!shopId) return res.status(400).json({ error: "Falta shopId" });

    const rows = await dbAll(
      `SELECT barbers.id, users.name
       FROM barbers
       JOIN users ON users.id = barbers.user_id
       WHERE barbers.shop_id = $1
       ORDER BY users.name`,
      [shopId]
    );

    res.json(rows);
  })
);

app.get(
  "/api/services",
  asyncHandler(async (req, res) => {
    const { shopId } = req.query;
    if (!shopId) return res.status(400).json({ error: "Falta shopId" });

    const rows = await dbAll(
      "SELECT name FROM shop_services WHERE shop_id = $1 ORDER BY name",
      [shopId]
    );

    res.json(rows.map((row) => row.name));
  })
);

app.get(
  "/api/availability",
  asyncHandler(async (req, res) => {
    const { barberId, date } = req.query;
    if (!barberId || !date) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    if (isPastDate(date)) {
      return res.json({ slots: [], reason: "No podes elegir fechas pasadas." });
    }

    const slots = await dbAll(
      "SELECT time FROM barber_slots WHERE barber_id = $1 ORDER BY time",
      [barberId]
    );

    const booked = await dbAll(
      "SELECT time FROM appointments WHERE barber_id = $1 AND date = $2",
      [barberId, date]
    );

    const bookedSet = new Set(booked.map((row) => row.time));
    const available = slots
      .map((row) => row.time)
      .filter((time) => !bookedSet.has(time) && !isPastTimeForDate(date, time));

    if (!available.length) {
      return res.json({ slots: [], reason: "No hay horarios disponibles." });
    }

    res.json({ slots: available });
  })
);

app.get(
  "/api/appointments",
  asyncHandler(async (req, res) => {
    const { barberId, date } = req.query;
    if (!barberId || !date) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const rows = await dbAll(
      `SELECT appointments.id, appointments.time, appointments.service, users.name as client
       FROM appointments
       JOIN users ON users.id = appointments.client_id
       WHERE appointments.barber_id = $1 AND appointments.date = $2
       ORDER BY appointments.time`,
      [barberId, date]
    );

    res.json(rows);
  })
);

app.post(
  "/api/appointments",
  asyncHandler(async (req, res) => {
    const { clientId, barberId, shopId, date, time, service } = req.body || {};

    if (!clientId || !barberId || !shopId || !date || !time) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    if (isPastDate(date)) {
      return res.status(400).json({ error: "Fecha pasada" });
    }

    if (isPastTimeForDate(date, time)) {
      return res.status(400).json({ error: "Horario pasado" });
    }

    const slot = await dbGet(
      "SELECT id FROM barber_slots WHERE barber_id = $1 AND time = $2",
      [barberId, time]
    );
    if (!slot) {
      return res.status(400).json({ error: "Horario invalido" });
    }

    const existing = await dbGet(
      "SELECT id FROM appointments WHERE barber_id = $1 AND date = $2 AND time = $3",
      [barberId, date, time]
    );

    if (existing) {
      return res.status(409).json({ error: "Horario ocupado" });
    }

    await dbRun(
      `INSERT INTO appointments (shop_id, barber_id, client_id, date, time, service)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [shopId, barberId, clientId, date, time, service || "Corte"]
    );

    res.json({ ok: true });
  })
);

app.get(
  "/api/appointments/client",
  asyncHandler(async (req, res) => {
    const { clientId } = req.query;
    if (!clientId) {
      return res.status(400).json({ error: "Falta clientId" });
    }

    const today = getTodayISO();
    await dbRun("DELETE FROM appointments WHERE date < $1", [today]);

    const rows = await dbAll(
      `SELECT appointments.id,
              appointments.date,
              appointments.time,
              shops.name as shop,
              users.name as barber
       FROM appointments
       JOIN shops ON shops.id = appointments.shop_id
       JOIN barbers ON barbers.id = appointments.barber_id
       JOIN users ON users.id = barbers.user_id
       WHERE appointments.client_id = $1
       ORDER BY appointments.date, appointments.time`,
      [clientId]
    );

    res.json(rows);
  })
);

app.delete(
  "/api/appointments/:id",
  asyncHandler(async (req, res) => {
    const { actorId } = req.body || {};
    const appointmentId = req.params.id;
    if (!actorId) {
      return res.status(400).json({ error: "Falta actorId" });
    }

    const actor = await dbGet(
      `SELECT users.id,
              users.role,
              users.shop_id as shopId,
              barbers.id as barberId
       FROM users
       LEFT JOIN barbers ON barbers.user_id = users.id
       WHERE users.id = $1`,
      [actorId]
    );

    if (!actor) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const appointment = await dbGet(
      "SELECT id, barber_id, shop_id FROM appointments WHERE id = $1",
      [appointmentId]
    );

    if (!appointment) {
      return res.status(404).json({ error: "Turno no encontrado." });
    }

    const isAdmin = actor.role === "admin";
    const isBarber = actor.role === "peluquero" && actor.barberId === appointment.barber_id;
    const isOwner = actor.role === "dueno" && actor.shopId === appointment.shop_id;

    if (!isAdmin && !isBarber && !isOwner) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    await dbRun("DELETE FROM appointments WHERE id = $1", [appointmentId]);
    res.json({ ok: true });
  })
);

app.get(
  "/api/history/barber",
  asyncHandler(async (req, res) => {
    const { barberId } = req.query;
    if (!barberId) {
      return res.status(400).json({ error: "Falta barberId" });
    }

    const rows = await dbAll(
      `SELECT substr(date, 1, 7) as month, COUNT(*)::int as total
       FROM appointments
       WHERE barber_id = $1
       GROUP BY month
       ORDER BY month DESC
       LIMIT 6`,
      [barberId]
    );

    res.json(rows);
  })
);

app.get(
  "/api/stats/appointments",
  asyncHandler(async (req, res) => {
    const today = getTodayISO();
    const month = today.slice(0, 7);
    const row = await dbGet(
      "SELECT COUNT(*)::int as total FROM appointments WHERE substr(date, 1, 7) = $1",
      [month]
    );
    res.json({ total: row?.total || 0, month });
  })
);

app.post(
  "/api/users/convert",
  asyncHandler(async (req, res) => {
    const { actorId, username, shopId } = req.body || {};
    if (!actorId || !username) {
      return res.status(400).json({ error: "Faltan datos." });
    }

    const actor = await dbGet(
      "SELECT id, role, shop_id as shopId FROM users WHERE id = $1",
      [actorId]
    );

    if (!actor) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const target = await dbGet(
      "SELECT id, role FROM users WHERE username = $1",
      [username]
    );

    if (!target) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    if (target.role === "peluquero") {
      return res.status(409).json({ error: "El usuario ya es peluquero." });
    }

    const isAdmin = actor.role === "admin";
    const isOwner = actor.role === "dueno";
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const finalShopId = isOwner ? actor.shopId : shopId;
    if (!finalShopId) {
      return res.status(400).json({ error: "Falta peluqueria." });
    }

    await dbRun(
      "UPDATE users SET role = 'peluquero', shop_id = $1 WHERE id = $2",
      [finalShopId, target.id]
    );

    const barber = await dbGet(
      "INSERT INTO barbers (user_id, shop_id) VALUES ($1, $2) RETURNING id",
      [target.id, finalShopId]
    );

    await dbRun(
      `INSERT INTO barber_slots (barber_id, time)
       VALUES ($1, '09:00'),
              ($1, '10:30'),
              ($1, '12:00'),
              ($1, '14:00'),
              ($1, '15:30'),
              ($1, '17:00'),
              ($1, '18:30')`,
      [barber.id]
    );

    res.json({ ok: true });
  })
);

app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({ error: "Error de servidor" });
});

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
