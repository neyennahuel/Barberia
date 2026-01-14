const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const { dbAll, dbGet, dbRun } = require("./data/db");

const app = express();
const PORT = process.env.PORT || 3000;
const TZ = "America/Argentina/Mendoza";

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Formato de imagen invalido"));
    }
    cb(null, true);
  },
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

function getTZDateParts(date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  return parts.reduce((acc, part) => {
    if (part.type === "year") acc.year = part.value;
    if (part.type === "month") acc.month = part.value;
    if (part.type === "day") acc.day = part.value;
    return acc;
  }, {});
}

function getCurrentMonth() {
  const parts = getTZDateParts(new Date());
  return `${parts.year}-${parts.month}`;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getMonthBounds(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month || "");
  if (!match) return null;
  const year = Number(match[1]);
  const mm = Number(match[2]);
  if (mm < 1 || mm > 12) return null;
  const lastDay = daysInMonth(year, mm);
  const start = `${match[1]}-${match[2]}-01`;
  const end = `${match[1]}-${match[2]}-${String(lastDay).padStart(2, "0")}`;
  return { start, end, month: `${match[1]}-${match[2]}` };
}

function isoToTzDateString(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = getTZDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function resolveDateRange({ month, from, to }) {
  if (from || to) {
    const start = isoToTzDateString(from || to);
    const end = isoToTzDateString(to || from);
    if (!start || !end) return null;
    if (start > end) return null;
    return { start, end, month: start.slice(0, 7) };
  }
  const bounds = getMonthBounds(month || getCurrentMonth());
  return bounds ? { start: bounds.start, end: bounds.end, month: bounds.month } : null;
}

function enumerateDays(start, end) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const cursor = new Date(Date.UTC(sy, sm - 1, sd));
  const last = new Date(Date.UTC(ey, em - 1, ed));
  const days = [];
  while (cursor <= last) {
    const yyyy = String(cursor.getUTCFullYear());
    const mm = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(cursor.getUTCDate()).padStart(2, "0");
    days.push(`${yyyy}-${mm}-${dd}`);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function isPastTimeForDate(dateStr, timeStr) {
  if (!dateStr || !timeStr) return false;
  const today = getTodayISO();
  if (dateStr !== today) return false;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(timeStr) <= nowMinutes;
}

function isOwnerRole(role) {
  return role === "dueno" || role === "duenovip";
}

function getBaseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

function decodeJwtPayload(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
  try {
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch (error) {
    return null;
  }
}

function escapeJsonForHtml(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function sendOAuthLogin(res, user) {
  const userJson = escapeJsonForHtml(user);
  res.send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Accediendo...</title>
  </head>
  <body>
    <p>Iniciando sesion...</p>
    <script>
      const USER_KEY = "barberia_user_v2";
      const user = ${userJson};
      const next = {
        cliente: "cliente.html",
        peluquero: "peluquero.html",
        dueno: "dueno.html",
        duenovip: "dueno.html",
        admin: "admin.html",
      }[user.role] || "index.html";
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      window.location.href = next;
    </script>
  </body>
</html>`);
}

function extractCoordsFromGoogleUrl(rawUrl) {
  if (!rawUrl) return null;
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    return null;
  }

  const query = parsed.searchParams.get("q") || parsed.searchParams.get("query");
  if (query) {
    const match = query.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
    if (match) {
      return { lat: Number(match[1]), lon: Number(match[3]) };
    }
  }

  const ll = parsed.searchParams.get("ll");
  if (ll) {
    const match = ll.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
    if (match) {
      return { lat: Number(match[1]), lon: Number(match[3]) };
    }
  }

  const atMatch = parsed.pathname.match(/@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/);
  if (atMatch) {
    return { lat: Number(atMatch[1]), lon: Number(atMatch[3]) };
  }

  return null;
}

async function resolveGoogleMapsCoords(rawUrl) {
  const direct = extractCoordsFromGoogleUrl(rawUrl);
  if (direct) return direct;

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (error) {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");
  const isShort =
    host === "maps.app.goo.gl" || host === "goo.gl" || host === "g.page";
  if (!isShort) return null;

  try {
    const response = await fetch(rawUrl, { redirect: "follow" });
    if (response.body) {
      response.body.cancel();
    }
    return extractCoordsFromGoogleUrl(response.url);
  } catch (error) {
    return null;
  }
}

app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use("/uploads", express.static(UPLOAD_DIR));

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
            users.shop_id as \"shopId\",
            barbers.id as \"barberId\"
     FROM users
     LEFT JOIN barbers ON barbers.user_id = users.id
     WHERE users.username = $1 AND users.password = $2`,
    [username, password]
  );

  if (!user) {
    return res.status(401).json({ error: "Credenciales invalidas." });
  }

  if (isOwnerRole(user.role)) {
    if (!user.shopId) {
      return res.status(403).json({ error: "El dueno no tiene peluqueria." });
    }
    const shop = await dbGet("SELECT status FROM shops WHERE id = $1", [
      user.shopId,
    ]);
    if (!shop) {
      return res.status(403).json({ error: "Peluqueria no encontrada." });
    }
    if (shop.status !== "approved") {
      return res
        .status(403)
        .json({ error: "Peluqueria pendiente de aprobacion." });
    }
  }

  res.json(user);
  })
);

app.get(
  "/api/shops",
  asyncHandler(async (req, res) => {
    const { actorId } = req.query;
    let includeAll = false;
    if (actorId) {
      const actor = await dbGet("SELECT role FROM users WHERE id = $1", [actorId]);
      includeAll = actor?.role === "admin";
    }

    const shops = includeAll
      ? await dbAll(
          "SELECT id, name, address, logo_url, location_url, latitude, longitude, status FROM shops ORDER BY name"
        )
      : await dbAll(
          "SELECT id, name, address, logo_url, location_url, latitude, longitude FROM shops WHERE status = 'approved' ORDER BY name"
        );
    res.json(shops);
  })
);

app.get(
  "/api/shops/pending",
  asyncHandler(async (req, res) => {
    const { actorId } = req.query;
    if (!actorId) {
      return res.status(400).json({ error: "Falta actorId." });
    }

    const actor = await dbGet("SELECT role FROM users WHERE id = $1", [actorId]);
    if (!actor || actor.role !== "admin") {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const rows = await dbAll(
      `SELECT shops.id,
              shops.name,
              shops.address,
              shops.status,
              users.name as \"ownerName\",
              users.username as \"ownerUsername\",
              users.role as \"ownerRole\"
       FROM shops
       LEFT JOIN users
         ON users.shop_id = shops.id
        AND users.role IN ('dueno', 'duenovip')
       WHERE shops.status = 'pending'
       ORDER BY shops.id DESC`
    );

    res.json(rows);
  })
);

app.get(
  "/api/shops/:id",
  asyncHandler(async (req, res) => {
    const { actorId } = req.query;
    const shopId = req.params.id;
    if (!actorId) {
      return res.status(400).json({ error: "Falta actorId." });
    }

    const actor = await dbGet(
      "SELECT id, role, shop_id as \"shopId\" FROM users WHERE id = $1",
      [actorId]
    );
    if (!actor) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const isAdmin = actor.role === "admin";
    const isOwner = isOwnerRole(actor.role) && String(actor.shopId) === String(shopId);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const shop = await dbGet(
      `SELECT id,
              name,
              address,
              description,
              status,
              logo_url as \"logoUrl\",
              image_url_1 as \"imageUrl1\",
              image_url_2 as \"imageUrl2\",
              location_url as \"locationUrl\",
              latitude,
              longitude
       FROM shops
       WHERE id = $1`,
      [shopId]
    );

    if (!shop) {
      return res.status(404).json({ error: "Peluqueria no encontrada." });
    }

    res.json(shop);
  })
);

app.put(
  "/api/shops/:id",
  asyncHandler(async (req, res) => {
    const { actorId, name, address, description, locationUrl } = req.body || {};
    const shopId = req.params.id;
    if (!actorId || !name) {
      return res.status(400).json({ error: "Faltan datos." });
    }

    const actor = await dbGet(
      "SELECT id, role, shop_id as \"shopId\" FROM users WHERE id = $1",
      [actorId]
    );
    if (!actor) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const isAdmin = actor.role === "admin";
    const isOwner = isOwnerRole(actor.role) && String(actor.shopId) === String(shopId);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const current = await dbGet(
      "SELECT address, location_url as \"locationUrl\" FROM shops WHERE id = $1",
      [shopId]
    );
    const finalAddress = address || current?.address || "";
    let finalLocationUrl =
      locationUrl !== undefined ? locationUrl.trim() : current?.locationUrl || null;
    if (finalLocationUrl === "") {
      finalLocationUrl = null;
    }
    let coords = null;
    if (finalLocationUrl) {
      coords = await resolveGoogleMapsCoords(finalLocationUrl);
      if (!coords) {
        return res.status(400).json({
          error:
            "No se pudieron leer coordenadas. Usa el link compartido de Google Maps o el link completo.",
        });
      }
    }

    await dbRun(
      `UPDATE shops
       SET name = $1,
           address = $2,
           description = $3,
           location_url = $4,
           latitude = $5,
           longitude = $6
       WHERE id = $7`,
      [
        name,
        finalAddress,
        description || null,
        finalLocationUrl,
        coords ? coords.lat : null,
        coords ? coords.lon : null,
        shopId,
      ]
    );

    res.json({ ok: true });
  })
);

app.post(
  "/api/shops/images",
  upload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const { actorId, shopId } = req.body || {};
    if (!actorId) {
      return res.status(400).json({ error: "Falta actorId." });
    }

    const actor = await dbGet(
      "SELECT id, role, shop_id as \"shopId\" FROM users WHERE id = $1",
      [actorId]
    );

    if (!actor) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const isAdmin = actor.role === "admin";
    const isOwner = isOwnerRole(actor.role);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const targetShopId = isOwner ? actor.shopId : shopId;
    if (!targetShopId) {
      return res.status(400).json({ error: "Falta peluqueria." });
    }

    const files = req.files || {};
    const file1 = files.image1?.[0];
    const file2 = files.image2?.[0];

    if (!file1 && !file2) {
      return res.status(400).json({ error: "No hay imagenes." });
    }

    const current = await dbGet(
      "SELECT image_url_1 as \"imageUrl1\", image_url_2 as \"imageUrl2\" FROM shops WHERE id = $1",
      [targetShopId]
    );

    let imageUrl1 = current?.imageUrl1 || null;
    let imageUrl2 = current?.imageUrl2 || null;

    if (file1) {
      const ext = path.extname(file1.originalname) || ".png";
      const filename = `shop-${targetShopId}-img1-${Date.now()}${ext}`;
      const finalPath = path.join(UPLOAD_DIR, filename);
      fs.renameSync(file1.path, finalPath);
      imageUrl1 = `/uploads/${filename}`;
    }

    if (file2) {
      const ext = path.extname(file2.originalname) || ".png";
      const filename = `shop-${targetShopId}-img2-${Date.now()}${ext}`;
      const finalPath = path.join(UPLOAD_DIR, filename);
      fs.renameSync(file2.path, finalPath);
      imageUrl2 = `/uploads/${filename}`;
    }

    await dbRun(
      "UPDATE shops SET image_url_1 = $1, image_url_2 = $2 WHERE id = $3",
      [imageUrl1, imageUrl2, targetShopId]
    );

    const shop = await dbGet(
      `SELECT image_url_1 as \"imageUrl1\", image_url_2 as \"imageUrl2\"
       FROM shops
       WHERE id = $1`,
      [targetShopId]
    );

    res.json(shop);
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
      "INSERT INTO shops (name, address, status) VALUES ($1, $2, 'approved') RETURNING id, name, address, status",
      [name, address]
    );

    res.json(result.rows[0]);
  })
);

app.post(
  "/api/shops/request",
  asyncHandler(async (req, res) => {
    const { name, address, ownerName, ownerUsername, ownerPassword } =
      req.body || {};
    if (
      !name ||
      !address ||
      !ownerName ||
      !ownerUsername ||
      !ownerPassword
    ) {
      return res.status(400).json({ error: "Faltan datos." });
    }

    const existingUser = await dbGet(
      "SELECT id FROM users WHERE username = $1",
      [ownerUsername]
    );
    if (existingUser) {
      return res.status(409).json({ error: "El usuario ya existe." });
    }

    await dbRun("BEGIN");
    try {
      const shop = await dbGet(
        "INSERT INTO shops (name, address, status) VALUES ($1, $2, 'pending') RETURNING id",
        [name, address]
      );
      const user = await dbGet(
        `INSERT INTO users (username, password, name, role, shop_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [ownerUsername, ownerPassword, ownerName, "dueno", shop.id]
      );
      await dbRun("COMMIT");
      res.json({ ok: true, shopId: shop.id, userId: user.id });
    } catch (error) {
      await dbRun("ROLLBACK");
      if (error.code === "23505") {
        return res.status(409).json({ error: "El usuario ya existe." });
      }
      throw error;
    }
  })
);

app.post(
  "/api/shops/:id/approve",
  asyncHandler(async (req, res) => {
    const { actorId } = req.body || {};
    const shopId = req.params.id;
    if (!actorId) {
      return res.status(400).json({ error: "Falta actorId." });
    }

    const actor = await dbGet("SELECT role FROM users WHERE id = $1", [actorId]);
    if (!actor || actor.role !== "admin") {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const result = await dbRun(
      "UPDATE shops SET status = 'approved' WHERE id = $1",
      [shopId]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: "Peluqueria no encontrada." });
    }

    res.json({ ok: true });
  })
);

app.post(
  "/api/shops/:id/reject",
  asyncHandler(async (req, res) => {
    const { actorId } = req.body || {};
    const shopId = req.params.id;
    if (!actorId) {
      return res.status(400).json({ error: "Falta actorId." });
    }

    const actor = await dbGet("SELECT role FROM users WHERE id = $1", [actorId]);
    if (!actor || actor.role !== "admin") {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const result = await dbRun(
      "UPDATE shops SET status = 'rejected' WHERE id = $1",
      [shopId]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: "Peluqueria no encontrada." });
    }

    res.json({ ok: true });
  })
);

app.delete(
  "/api/shops/:id",
  asyncHandler(async (req, res) => {
    const { actorId } = req.body || {};
    const shopId = req.params.id;

    if (!actorId) {
      return res.status(400).json({ error: "Falta actorId." });
    }

    const actor = await dbGet("SELECT role FROM users WHERE id = $1", [actorId]);
    if (!actor || actor.role !== "admin") {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const shop = await dbGet("SELECT id FROM shops WHERE id = $1", [shopId]);
    if (!shop) {
      return res.status(404).json({ error: "Peluqueria no encontrada." });
    }

    await dbRun("DELETE FROM appointments WHERE shop_id = $1", [shopId]);
    await dbRun(
      "DELETE FROM barber_slots WHERE barber_id IN (SELECT id FROM barbers WHERE shop_id = $1)",
      [shopId]
    );
    await dbRun("DELETE FROM barbers WHERE shop_id = $1", [shopId]);
    await dbRun("DELETE FROM shop_services WHERE shop_id = $1", [shopId]);
    await dbRun("UPDATE users SET shop_id = NULL WHERE shop_id = $1", [shopId]);
    await dbRun("DELETE FROM shops WHERE id = $1", [shopId]);

    res.json({ ok: true });
  })
);

app.post(
  "/api/shops/logo",
  upload.single("logo"),
  asyncHandler(async (req, res) => {
    const { actorId, shopId } = req.body || {};
    if (!actorId) {
      return res.status(400).json({ error: "Falta actorId." });
    }

    const actor = await dbGet(
      "SELECT id, role, shop_id as \"shopId\" FROM users WHERE id = $1",
      [actorId]
    );

    if (!actor) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const isAdmin = actor.role === "admin";
    const isOwner = isOwnerRole(actor.role);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const targetShopId = isOwner ? actor.shopId : shopId;
    if (!targetShopId) {
      return res.status(400).json({ error: "Falta peluqueria." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Falta la imagen." });
    }

    const ext = path.extname(req.file.originalname) || ".png";
    const filename = `logo-${targetShopId}-${Date.now()}${ext}`;
    const finalPath = path.join(UPLOAD_DIR, filename);
    fs.renameSync(req.file.path, finalPath);

    const logoUrl = `/uploads/${filename}`;
    await dbRun("UPDATE shops SET logo_url = $1 WHERE id = $2", [
      logoUrl,
      targetShopId,
    ]);

    res.json({ logoUrl });
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
      "SELECT id, role, shop_id as \"shopId\" FROM users WHERE id = $1",
      [actorId]
    );

    if (!actor) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const isAdmin = actor.role === "admin";
    const isOwner = isOwnerRole(actor.role);

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

    if (
      (role === "peluquero" || role === "dueno" || role === "duenovip") &&
      !shopId &&
      !actor.shopId
    ) {
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
       RETURNING id, username, name, role, shop_id as \"shopId\"`,
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

app.post(
  "/api/users/register",
  asyncHandler(async (req, res) => {
    const { username, password, name } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Faltan datos." });
    }

    const existingUser = await dbGet(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
    if (existingUser) {
      return res.status(409).json({ error: "El usuario ya existe." });
    }

    const displayName = name || username;
    const createdUser = await dbGet(
      `INSERT INTO users (username, password, name, role, shop_id)
       VALUES ($1, $2, $3, 'cliente', NULL)
       RETURNING id, username, name, role`,
      [username, password, displayName]
    );

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

app.delete(
  "/api/barbers/:id",
  asyncHandler(async (req, res) => {
    const { actorId } = req.body || {};
    const barberId = req.params.id;
    if (!actorId) {
      return res.status(400).json({ error: "Falta actorId" });
    }

    const actor = await dbGet(
      "SELECT id, role, shop_id as \"shopId\" FROM users WHERE id = $1",
      [actorId]
    );

    if (!actor) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const barber = await dbGet(
      "SELECT id, shop_id as \"shopId\", user_id as \"userId\" FROM barbers WHERE id = $1",
      [barberId]
    );

    if (!barber) {
      return res.status(404).json({ error: "Peluquero no encontrado." });
    }

    const isAdmin = actor.role === "admin";
    const isOwner = isOwnerRole(actor.role) && actor.shopId === barber.shopId;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    await dbRun("DELETE FROM appointments WHERE barber_id = $1", [barber.id]);
    await dbRun("DELETE FROM barber_slots WHERE barber_id = $1", [barber.id]);
    await dbRun("DELETE FROM barbers WHERE id = $1", [barber.id]);
    await dbRun(
      "UPDATE users SET role = 'cliente', shop_id = NULL WHERE id = $1",
      [barber.userId]
    );

    res.json({ ok: true });
  })
);

app.get(
  "/api/services",
  asyncHandler(async (req, res) => {
    const { shopId } = req.query;
    if (!shopId) return res.status(400).json({ error: "Falta shopId" });

    const rows = await dbAll(
      "SELECT name, price FROM shop_services WHERE shop_id = $1 ORDER BY name",
      [shopId]
    );

    res.json(rows);
  })
);

app.get(
  "/api/services/manage",
  asyncHandler(async (req, res) => {
    const { actorId, shopId } = req.query;
    if (!actorId) return res.status(400).json({ error: "Falta actorId" });

    const actor = await dbGet(
      "SELECT id, role, shop_id as \"shopId\" FROM users WHERE id = $1",
      [actorId]
    );
    if (!actor) return res.status(403).json({ error: "Sin permisos." });

    const isAdmin = actor.role === "admin";
    const isOwner = isOwnerRole(actor.role);
    const targetShopId = isOwner ? actor.shopId : shopId;
    if (!targetShopId) return res.status(400).json({ error: "Falta shopId" });

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const rows = await dbAll(
      "SELECT id, name, price FROM shop_services WHERE shop_id = $1 ORDER BY name",
      [targetShopId]
    );

    res.json(rows);
  })
);

app.post(
  "/api/services",
  asyncHandler(async (req, res) => {
    const { actorId, name, price, shopId } = req.body || {};
    if (!actorId || !name) {
      return res.status(400).json({ error: "Faltan datos." });
    }

    const actor = await dbGet(
      "SELECT id, role, shop_id as \"shopId\" FROM users WHERE id = $1",
      [actorId]
    );
    if (!actor) return res.status(403).json({ error: "Sin permisos." });

    const isAdmin = actor.role === "admin";
    const isOwner = isOwnerRole(actor.role);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const targetShopId = isOwner ? actor.shopId : shopId;
    if (!targetShopId) {
      return res.status(400).json({ error: "Falta peluqueria." });
    }

    const normalizedPrice =
      price === null || price === undefined || price === "" ? null : Number(price);

    const created = await dbGet(
      `INSERT INTO shop_services (shop_id, name, price)
       VALUES ($1, $2, $3)
       RETURNING id, name, price`,
      [targetShopId, name, normalizedPrice]
    );

    res.json(created);
  })
);

app.put(
  "/api/services/:id",
  asyncHandler(async (req, res) => {
    const { actorId, name, price } = req.body || {};
    const serviceId = req.params.id;
    if (!actorId || !name) {
      return res.status(400).json({ error: "Faltan datos." });
    }

    const actor = await dbGet(
      "SELECT id, role, shop_id as \"shopId\" FROM users WHERE id = $1",
      [actorId]
    );
    if (!actor) return res.status(403).json({ error: "Sin permisos." });

    const service = await dbGet(
      "SELECT id, shop_id as \"shopId\" FROM shop_services WHERE id = $1",
      [serviceId]
    );
    if (!service) return res.status(404).json({ error: "Servicio no encontrado." });

    const isAdmin = actor.role === "admin";
    const isOwner = isOwnerRole(actor.role) && actor.shopId === service.shopId;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const normalizedPrice =
      price === null || price === undefined || price === "" ? null : Number(price);

    await dbRun(
      "UPDATE shop_services SET name = $1, price = $2 WHERE id = $3",
      [name, normalizedPrice, serviceId]
    );

    res.json({ ok: true });
  })
);

app.delete(
  "/api/services/:id",
  asyncHandler(async (req, res) => {
    const { actorId } = req.body || {};
    const serviceId = req.params.id;
    if (!actorId) {
      return res.status(400).json({ error: "Falta actorId." });
    }

    const actor = await dbGet(
      "SELECT id, role, shop_id as \"shopId\" FROM users WHERE id = $1",
      [actorId]
    );
    if (!actor) return res.status(403).json({ error: "Sin permisos." });

    const service = await dbGet(
      "SELECT id, shop_id as \"shopId\" FROM shop_services WHERE id = $1",
      [serviceId]
    );
    if (!service) return res.status(404).json({ error: "Servicio no encontrado." });

    const isAdmin = actor.role === "admin";
    const isOwner = isOwnerRole(actor.role) && actor.shopId === service.shopId;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    await dbRun("DELETE FROM shop_services WHERE id = $1", [serviceId]);
    res.json({ ok: true });
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

    const serviceName = service || "Corte";
    const serviceRow = await dbGet(
      "SELECT price FROM shop_services WHERE shop_id = $1 AND name = $2",
      [shopId, serviceName]
    );
    const servicePrice =
      serviceRow?.price === null || serviceRow?.price === undefined
        ? null
        : Number(serviceRow.price);

    await dbRun(
      `INSERT INTO appointments (shop_id, barber_id, client_id, date, time, service, service_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [shopId, barberId, clientId, date, time, serviceName, servicePrice]
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
      `SELECT DISTINCT ON (
                appointments.client_id,
                appointments.shop_id,
                appointments.barber_id,
                appointments.date,
                appointments.time
              )
              appointments.id,
              appointments.date,
              appointments.time,
              shops.name as shop,
              users.name as barber
       FROM appointments
       JOIN shops ON shops.id = appointments.shop_id
       JOIN barbers ON barbers.id = appointments.barber_id
       JOIN users ON users.id = barbers.user_id
       WHERE appointments.client_id = $1
       ORDER BY appointments.client_id,
                appointments.shop_id,
                appointments.barber_id,
                appointments.date,
                appointments.time,
                appointments.id DESC`,
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
              users.shop_id as \"shopId\",
              barbers.id as \"barberId\"
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
    const isOwner = isOwnerRole(actor.role) && actor.shopId === appointment.shop_id;

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

app.get(
  "/api/stats/owner",
  asyncHandler(async (req, res) => {
    const { actorId, shopId, month, from, to } = req.query;
    if (!actorId) {
      return res.status(400).json({ error: "Falta actorId." });
    }

    const actor = await dbGet(
      "SELECT id, role, shop_id as \"shopId\" FROM users WHERE id = $1",
      [actorId]
    );
    if (!actor) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const isAdmin = actor.role === "admin";
    const isOwner = isOwnerRole(actor.role);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const targetShopId = isOwner ? actor.shopId : shopId;
    if (!targetShopId) {
      return res.status(400).json({ error: "Falta peluqueria." });
    }

    const range = resolveDateRange({ month, from, to });
    if (!range) {
      return res.status(400).json({ error: "Rango de fechas invalido." });
    }

    const appointments = await dbAll(
      `SELECT appointments.id,
              appointments.date,
              appointments.service,
              appointments.service_price as \"servicePrice\",
              appointments.client_id as \"clientId\",
              users.name as \"clientName\",
              appointments.barber_id as \"barberId\",
              barber_users.name as \"barberName\"
       FROM appointments
       JOIN users ON users.id = appointments.client_id
       JOIN barbers ON barbers.id = appointments.barber_id
       JOIN users barber_users ON barber_users.id = barbers.user_id
       WHERE appointments.shop_id = $1
         AND appointments.date >= $2
         AND appointments.date <= $3
       ORDER BY appointments.date`,
      [targetShopId, range.start, range.end]
    );

    const services = await dbAll(
      "SELECT name, price FROM shop_services WHERE shop_id = $1",
      [targetShopId]
    );
    const priceMap = new Map(
      services.map((item) => [item.name, item.price === null ? 0 : Number(item.price)])
    );

    let revenue = 0;
    const sales = appointments.length;
    const perClient = new Map();
    const perBarber = new Map();
    const perDay = new Map();

    appointments.forEach((item) => {
      const price =
        item.servicePrice === null || item.servicePrice === undefined
          ? priceMap.get(item.service) || 0
          : Number(item.servicePrice);
      revenue += price;
      const clientKey = String(item.clientId);
      const current = perClient.get(clientKey) || {
        id: item.clientId,
        name: item.clientName,
        total: 0,
      };
      current.total += price;
      perClient.set(clientKey, current);
      const barberKey = String(item.barberId);
      const currentBarber = perBarber.get(barberKey) || {
        id: item.barberId,
        name: item.barberName,
        total: 0,
        sales: 0,
      };
      currentBarber.total += price;
      currentBarber.sales += 1;
      perBarber.set(barberKey, currentBarber);
      const dayKey = item.date;
      const dayData = perDay.get(dayKey) || { total: 0, count: 0 };
      dayData.total += price;
      dayData.count += 1;
      perDay.set(dayKey, dayData);
    });

    const avgTicket = sales ? revenue / sales : 0;
    let topClient = null;
    perClient.forEach((value) => {
      if (!topClient || value.total > topClient.total) {
        topClient = value;
      }
    });
    let topBarber = null;
    perBarber.forEach((value) => {
      if (
        !topBarber ||
        value.sales > topBarber.sales ||
        (value.sales === topBarber.sales && value.total > topBarber.total)
      ) {
        topBarber = value;
      }
    });

    const days = enumerateDays(range.start, range.end).map((date) => {
      const data = perDay.get(date) || { total: 0, count: 0 };
      return {
        date,
        day: Number(date.slice(-2)),
        total: data.total,
        count: data.count,
      };
    });

    res.json({
      period: {
        start: range.start,
        end: range.end,
        month: range.month,
      },
      totals: {
        revenue,
        sales,
        avgTicket,
      },
      topClient: topClient
        ? { id: topClient.id, name: topClient.name, total: topClient.total }
        : null,
      topBarber: topBarber
        ? {
            id: topBarber.id,
            name: topBarber.name,
            total: topBarber.total,
            sales: topBarber.sales,
          }
        : null,
      salesByDay: days,
    });
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
      "SELECT id, role, shop_id as \"shopId\" FROM users WHERE id = $1",
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
    const isOwner = isOwnerRole(actor.role);
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

app.post(
  "/api/users/owner-role",
  asyncHandler(async (req, res) => {
    const { actorId, username, role } = req.body || {};
    if (!actorId || !username || !role) {
      return res.status(400).json({ error: "Faltan datos." });
    }

    if (!isOwnerRole(role)) {
      return res.status(400).json({ error: "Rol invalido." });
    }

    const actor = await dbGet("SELECT role FROM users WHERE id = $1", [actorId]);
    if (!actor || actor.role !== "admin") {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const target = await dbGet("SELECT id, role FROM users WHERE username = $1", [
      username,
    ]);
    if (!target) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }
    if (!isOwnerRole(target.role)) {
      return res.status(409).json({ error: "El usuario no es dueno." });
    }

    const updated = await dbGet(
      "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, role, shop_id as \"shopId\"",
      [role, target.id]
    );

    res.json(updated);
  })
);

app.get(
  "/api/users/owners",
  asyncHandler(async (req, res) => {
    const { actorId, role } = req.query;
    if (!actorId) {
      return res.status(400).json({ error: "Falta actorId." });
    }

    const actor = await dbGet("SELECT role FROM users WHERE id = $1", [actorId]);
    if (!actor || actor.role !== "admin") {
      return res.status(403).json({ error: "Sin permisos." });
    }

    const targetRole = role === "duenovip" ? "duenovip" : "dueno";
    const rows = await dbAll(
      "SELECT id, username, name, role FROM users WHERE role = $1 ORDER BY username",
      [targetRole]
    );

    res.json(rows);
  })
);

app.get("/auth/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(501).send("Google OAuth no configurado.");
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${getBaseUrl(req)}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get(
  "/auth/google/callback",
  asyncHandler(async (req, res) => {
    const { code, error } = req.query || {};
    if (error) {
      return res.status(400).send(`Google OAuth error: ${error}`);
    }
    if (!code) {
      return res.status(400).send("Falta el codigo de Google.");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(501).send("Google OAuth no configurado.");
    }

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || `${getBaseUrl(req)}/auth/google/callback`;

    const tokenParams = new URLSearchParams({
      code: String(code),
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return res.status(400).send(tokenData.error_description || "OAuth invalido.");
    }

    const payload = decodeJwtPayload(tokenData.id_token);
    const email = payload?.email;
    const name = payload?.name || payload?.given_name || "Nuevo cliente";
    if (!email) {
      return res.status(400).send("Google no devolvio email.");
    }

    let user = await dbGet(
      "SELECT id, username, name, role, shop_id as \"shopId\" FROM users WHERE username = $1",
      [email]
    );

    if (!user) {
      const created = await dbGet(
        `INSERT INTO users (username, password, name, role, shop_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, name, role, shop_id as \"shopId\"`,
        [email, "oauth-google", name, "cliente", null]
      );
      user = created;
    }

    sendOAuthLogin(res, { ...user, barberId: null });
  })
);

app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  if (err.message === "Formato de imagen invalido") {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Imagen demasiado grande" });
  }
  res.status(500).json({ error: "Error de servidor" });
});

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});








