const fs = require("fs");
const path = require("path");

function normalizeSql(sql) {
  return sql.replace(/\s+/g, " ").trim();
}

function toId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return Number(value);
}

function seedState() {
  return {
    nextIds: {
      shops: 4,
      users: 9,
      barbers: 4,
      barber_slots: 22,
      shop_services: 10,
      appointments: 1,
    },
    shops: [
      { id: 1, name: "Distrito 17", address: "Av. Central 1240", logo_url: null },
      { id: 2, name: "Norte 5", address: "Av. Libertad 450", logo_url: null },
      { id: 3, name: "Sur 23", address: "Calle Mitre 2100", logo_url: null },
    ],
    users: [
      { id: 1, username: "admin", password: "admin123", name: "Administrador", role: "admin", shop_id: null },
      { id: 2, username: "dueno", password: "dueno123", name: "Duenio Distrito", role: "dueno", shop_id: 1 },
      { id: 3, username: "peluquero", password: "pelu123", name: "Lautaro", role: "peluquero", shop_id: 1 },
      { id: 4, username: "cliente", password: "cliente123", name: "Camila", role: "cliente", shop_id: null },
      { id: 5, username: "dueno2", password: "dueno123", name: "Duenio Norte", role: "dueno", shop_id: 2 },
      { id: 6, username: "pelu2", password: "pelu123", name: "Micaela", role: "peluquero", shop_id: 2 },
      { id: 7, username: "dueno3", password: "dueno123", name: "Duenio Sur", role: "dueno", shop_id: 3 },
      { id: 8, username: "pelu3", password: "pelu123", name: "Bruno", role: "peluquero", shop_id: 3 },
    ],
    barbers: [
      { id: 1, user_id: 3, shop_id: 1 },
      { id: 2, user_id: 6, shop_id: 2 },
      { id: 3, user_id: 8, shop_id: 3 },
    ],
    barber_slots: [
      { id: 1, barber_id: 1, time: "09:00" },
      { id: 2, barber_id: 1, time: "10:30" },
      { id: 3, barber_id: 1, time: "12:00" },
      { id: 4, barber_id: 1, time: "14:00" },
      { id: 5, barber_id: 1, time: "15:30" },
      { id: 6, barber_id: 1, time: "17:00" },
      { id: 7, barber_id: 1, time: "18:30" },
      { id: 8, barber_id: 2, time: "09:00" },
      { id: 9, barber_id: 2, time: "10:30" },
      { id: 10, barber_id: 2, time: "12:00" },
      { id: 11, barber_id: 2, time: "14:00" },
      { id: 12, barber_id: 2, time: "15:30" },
      { id: 13, barber_id: 2, time: "17:00" },
      { id: 14, barber_id: 2, time: "18:30" },
      { id: 15, barber_id: 3, time: "09:00" },
      { id: 16, barber_id: 3, time: "10:30" },
      { id: 17, barber_id: 3, time: "12:00" },
      { id: 18, barber_id: 3, time: "14:00" },
      { id: 19, barber_id: 3, time: "15:30" },
      { id: 20, barber_id: 3, time: "17:00" },
      { id: 21, barber_id: 3, time: "18:30" },
    ],
    shop_services: [
      { id: 1, shop_id: 1, name: "Corte clasico" },
      { id: 2, shop_id: 1, name: "Fade" },
      { id: 3, shop_id: 1, name: "Barba premium" },
      { id: 4, shop_id: 2, name: "Corte moderno" },
      { id: 5, shop_id: 2, name: "Barba express" },
      { id: 6, shop_id: 2, name: "Color discreto" },
      { id: 7, shop_id: 3, name: "Corte clasico" },
      { id: 8, shop_id: 3, name: "Perfilado" },
      { id: 9, shop_id: 3, name: "Lavado premium" },
    ],
    appointments: [],
  };
}

function loadState(dataPath) {
  if (fs.existsSync(dataPath)) {
    const raw = fs.readFileSync(dataPath, "utf-8");
    return JSON.parse(raw);
  }
  return seedState();
}

function createDemoDb(options = {}) {
  const dataPath = options.dataPath || path.join(__dirname, "demo-db.json");
  let state = loadState(dataPath);

  function persist() {
    fs.writeFileSync(dataPath, JSON.stringify(state, null, 2));
  }

  function nextId(table) {
    const value = state.nextIds[table] || 1;
    state.nextIds[table] = value + 1;
    return value;
  }

  function query(sql, params = []) {
    const key = normalizeSql(sql);
    const handler = handlers.get(key);
    if (!handler) {
      throw new Error(`Consulta demo no soportada: ${key}`);
    }
    return handler(params);
  }

  const handlers = new Map();
  const handle = (sql, fn) => handlers.set(normalizeSql(sql), fn);

  const SQL = {
    login: `SELECT users.id,
            users.username,
            users.name,
            users.role,
            users.shop_id as shopId,
            barbers.id as barberId
     FROM users
     LEFT JOIN barbers ON barbers.user_id = users.id
     WHERE users.username = $1 AND users.password = $2`,
    listShops: "SELECT id, name, address, logo_url FROM shops ORDER BY name",
    insertShop: "INSERT INTO shops (name, address) VALUES ($1, $2) RETURNING id, name, address",
    userRoleById: "SELECT role FROM users WHERE id = $1",
    userByIdWithShop: "SELECT id, role, shop_id as shopId FROM users WHERE id = $1",
    updateShopLogo: "UPDATE shops SET logo_url = $1 WHERE id = $2",
    insertUser: `INSERT INTO users (username, password, name, role, shop_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, name, role, shop_id as shopId`,
    insertBarber: "INSERT INTO barbers (user_id, shop_id) VALUES ($1, $2) RETURNING id",
    insertBarberSlots: `INSERT INTO barber_slots (barber_id, time)
         VALUES ($1, '09:00'),
                ($1, '10:30'),
                ($1, '12:00'),
                ($1, '14:00'),
                ($1, '15:30'),
                ($1, '17:00'),
                ($1, '18:30')`,
    barbersByShop: `SELECT barbers.id, users.name
       FROM barbers
       JOIN users ON users.id = barbers.user_id
       WHERE barbers.shop_id = $1
       ORDER BY users.name`,
    servicesByShop: "SELECT name FROM shop_services WHERE shop_id = $1 ORDER BY name",
    slotsByBarber: "SELECT time FROM barber_slots WHERE barber_id = $1 ORDER BY time",
    bookedSlots: "SELECT time FROM appointments WHERE barber_id = $1 AND date = $2",
    barberById: "SELECT id, shop_id as shopId, user_id as userId FROM barbers WHERE id = $1",
    deleteAppointmentsByBarber: "DELETE FROM appointments WHERE barber_id = $1",
    deleteBarberSlots: "DELETE FROM barber_slots WHERE barber_id = $1",
    deleteBarber: "DELETE FROM barbers WHERE id = $1",
    updateUserToClient: "UPDATE users SET role = 'cliente', shop_id = NULL WHERE id = $1",
    appointmentsByBarberDate: `SELECT appointments.id, appointments.time, appointments.service, users.name as client
       FROM appointments
       JOIN users ON users.id = appointments.client_id
       WHERE appointments.barber_id = $1 AND appointments.date = $2
       ORDER BY appointments.time`,
    slotByBarberTime: "SELECT id FROM barber_slots WHERE barber_id = $1 AND time = $2",
    existingAppointment: "SELECT id FROM appointments WHERE barber_id = $1 AND date = $2 AND time = $3",
    insertAppointment: `INSERT INTO appointments (shop_id, barber_id, client_id, date, time, service)
       VALUES ($1, $2, $3, $4, $5, $6)`,
    deleteOldAppointments: "DELETE FROM appointments WHERE date < $1",
    appointmentsByClient: `SELECT appointments.id,
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
    userWithBarber: `SELECT users.id,
              users.role,
              users.shop_id as shopId,
              barbers.id as barberId
       FROM users
       LEFT JOIN barbers ON barbers.user_id = users.id
       WHERE users.id = $1`,
    appointmentById: "SELECT id, barber_id, shop_id FROM appointments WHERE id = $1",
    deleteAppointment: "DELETE FROM appointments WHERE id = $1",
    historyByBarber: `SELECT substr(date, 1, 7) as month, COUNT(*)::int as total
       FROM appointments
       WHERE barber_id = $1
       GROUP BY month
       ORDER BY month DESC
       LIMIT 6`,
    statsByMonth: "SELECT COUNT(*)::int as total FROM appointments WHERE substr(date, 1, 7) = $1",
    userByUsername: "SELECT id FROM users WHERE username = $1",
    userByUsernameRole: "SELECT id, role FROM users WHERE username = $1",
    convertUser: "UPDATE users SET role = 'peluquero', shop_id = $1 WHERE id = $2",
  };

  handle(SQL.login, (params) => {
    const [username, password] = params;
    const user = state.users.find(
      (item) => item.username === username && item.password === password
    );
    if (!user) return { rows: [] };
    const barber = state.barbers.find((item) => item.user_id === user.id);
    return {
      rows: [
        {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          shopId: user.shop_id || null,
          barberId: barber ? barber.id : null,
        },
      ],
    };
  });

  handle(SQL.listShops, () => {
    const rows = state.shops
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((shop) => ({
        id: shop.id,
        name: shop.name,
        address: shop.address,
        logo_url: shop.logo_url || null,
      }));
    return { rows };
  });

  handle(SQL.insertShop, (params) => {
    const [name, address] = params;
    const id = nextId("shops");
    state.shops.push({ id, name, address, logo_url: null });
    persist();
    return { rows: [{ id, name, address }] };
  });

  handle(SQL.userRoleById, (params) => {
    const id = toId(params[0]);
    const user = state.users.find((item) => item.id === id);
    return { rows: user ? [{ role: user.role }] : [] };
  });

  handle(SQL.userByIdWithShop, (params) => {
    const id = toId(params[0]);
    const user = state.users.find((item) => item.id === id);
    return {
      rows: user
        ? [{ id: user.id, role: user.role, shopId: user.shop_id || null }]
        : [],
    };
  });

  handle(SQL.updateShopLogo, (params) => {
    const [logoUrl, shopId] = params;
    const shop = state.shops.find((item) => item.id === toId(shopId));
    if (shop) {
      shop.logo_url = logoUrl;
      persist();
    }
    return { rows: [] };
  });

  handle(SQL.insertUser, (params) => {
    const [username, password, name, role, shopId] = params;
    const id = nextId("users");
    const user = {
      id,
      username,
      password,
      name,
      role,
      shop_id: toId(shopId),
    };
    state.users.push(user);
    persist();
    return { rows: [{ id, username, name, role, shopId: user.shop_id }] };
  });

  handle(SQL.userByUsername, (params) => {
    const [username] = params;
    const user = state.users.find((item) => item.username === username);
    return { rows: user ? [{ id: user.id }] : [] };
  });

  handle(SQL.userByUsernameRole, (params) => {
    const [username] = params;
    const user = state.users.find((item) => item.username === username);
    return { rows: user ? [{ id: user.id, role: user.role }] : [] };
  });

  handle(SQL.insertBarber, (params) => {
    const userId = toId(params[0]);
    const shopId = toId(params[1]);
    const id = nextId("barbers");
    state.barbers.push({ id, user_id: userId, shop_id: shopId });
    persist();
    return { rows: [{ id }] };
  });

  handle(SQL.insertBarberSlots, (params) => {
    const barberId = toId(params[0]);
    const times = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"];
    times.forEach((time) => {
      state.barber_slots.push({
        id: nextId("barber_slots"),
        barber_id: barberId,
        time,
      });
    });
    persist();
    return { rows: [] };
  });

  handle(SQL.barbersByShop, (params) => {
    const shopId = toId(params[0]);
    const rows = state.barbers
      .filter((item) => item.shop_id === shopId)
      .map((barber) => {
        const user = state.users.find((item) => item.id === barber.user_id);
        return { id: barber.id, name: user ? user.name : "" };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return { rows };
  });

  handle(SQL.servicesByShop, (params) => {
    const shopId = toId(params[0]);
    const rows = state.shop_services
      .filter((item) => item.shop_id === shopId)
      .map((item) => ({ name: item.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { rows };
  });

  handle(SQL.barberById, (params) => {
    const id = toId(params[0]);
    const barber = state.barbers.find((item) => item.id === id);
    return {
      rows: barber
        ? [{ id: barber.id, shopId: barber.shop_id, userId: barber.user_id }]
        : [],
    };
  });

  handle(SQL.deleteAppointmentsByBarber, (params) => {
    const barberId = toId(params[0]);
    const before = state.appointments.length;
    state.appointments = state.appointments.filter(
      (item) => item.barber_id !== barberId
    );
    if (state.appointments.length !== before) {
      persist();
    }
    return { rows: [] };
  });

  handle(SQL.deleteBarberSlots, (params) => {
    const barberId = toId(params[0]);
    const before = state.barber_slots.length;
    state.barber_slots = state.barber_slots.filter(
      (item) => item.barber_id !== barberId
    );
    if (state.barber_slots.length !== before) {
      persist();
    }
    return { rows: [] };
  });

  handle(SQL.deleteBarber, (params) => {
    const barberId = toId(params[0]);
    const before = state.barbers.length;
    state.barbers = state.barbers.filter((item) => item.id !== barberId);
    if (state.barbers.length !== before) {
      persist();
    }
    return { rows: [] };
  });

  handle(SQL.updateUserToClient, (params) => {
    const userId = toId(params[0]);
    const user = state.users.find((item) => item.id === userId);
    if (user) {
      user.role = "cliente";
      user.shop_id = null;
      persist();
    }
    return { rows: [] };
  });

  handle(SQL.slotsByBarber, (params) => {
    const barberId = toId(params[0]);
    const rows = state.barber_slots
      .filter((item) => item.barber_id === barberId)
      .map((item) => ({ time: item.time }))
      .sort((a, b) => a.time.localeCompare(b.time));
    return { rows };
  });

  handle(SQL.bookedSlots, (params) => {
    const barberId = toId(params[0]);
    const date = params[1];
    const rows = state.appointments
      .filter((item) => item.barber_id === barberId && item.date === date)
      .map((item) => ({ time: item.time }));
    return { rows };
  });

  handle(SQL.appointmentsByBarberDate, (params) => {
    const barberId = toId(params[0]);
    const date = params[1];
    const rows = state.appointments
      .filter((item) => item.barber_id === barberId && item.date === date)
      .map((appointment) => {
        const client = state.users.find((item) => item.id === appointment.client_id);
        return {
          id: appointment.id,
          time: appointment.time,
          service: appointment.service,
          client: client ? client.name : "",
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));
    return { rows };
  });

  handle(SQL.slotByBarberTime, (params) => {
    const barberId = toId(params[0]);
    const time = params[1];
    const slot = state.barber_slots.find(
      (item) => item.barber_id === barberId && item.time === time
    );
    return { rows: slot ? [{ id: slot.id }] : [] };
  });

  handle(SQL.existingAppointment, (params) => {
    const barberId = toId(params[0]);
    const date = params[1];
    const time = params[2];
    const existing = state.appointments.find(
      (item) =>
        item.barber_id === barberId && item.date === date && item.time === time
    );
    return { rows: existing ? [{ id: existing.id }] : [] };
  });

  handle(SQL.insertAppointment, (params) => {
    const shopId = toId(params[0]);
    const barberId = toId(params[1]);
    const clientId = toId(params[2]);
    const date = params[3];
    const time = params[4];
    const service = params[5];
    state.appointments.push({
      id: nextId("appointments"),
      shop_id: shopId,
      barber_id: barberId,
      client_id: clientId,
      date,
      time,
      service,
      created_at: new Date().toISOString(),
    });
    persist();
    return { rows: [] };
  });

  handle(SQL.deleteOldAppointments, (params) => {
    const date = params[0];
    const keep = state.appointments.filter((item) => item.date >= date);
    if (keep.length !== state.appointments.length) {
      state.appointments = keep;
      persist();
    }
    return { rows: [] };
  });

  handle(SQL.appointmentsByClient, (params) => {
    const clientId = toId(params[0]);
    const rows = state.appointments
      .filter((item) => item.client_id === clientId)
      .map((appointment) => {
        const shop = state.shops.find((item) => item.id === appointment.shop_id);
        const barber = state.barbers.find((item) => item.id === appointment.barber_id);
        const barberUser = barber
          ? state.users.find((item) => item.id === barber.user_id)
          : null;
        return {
          id: appointment.id,
          date: appointment.date,
          time: appointment.time,
          shop: shop ? shop.name : "",
          barber: barberUser ? barberUser.name : "",
        };
      })
      .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
    return { rows };
  });

  handle(SQL.userWithBarber, (params) => {
    const id = toId(params[0]);
    const user = state.users.find((item) => item.id === id);
    if (!user) return { rows: [] };
    const barber = state.barbers.find((item) => item.user_id === id);
    return {
      rows: [
        {
          id: user.id,
          role: user.role,
          shopId: user.shop_id || null,
          barberId: barber ? barber.id : null,
        },
      ],
    };
  });

  handle(SQL.appointmentById, (params) => {
    const id = toId(params[0]);
    const appointment = state.appointments.find((item) => item.id === id);
    return {
      rows: appointment
        ? [{ id: appointment.id, barber_id: appointment.barber_id, shop_id: appointment.shop_id }]
        : [],
    };
  });

  handle(SQL.deleteAppointment, (params) => {
    const id = toId(params[0]);
    const before = state.appointments.length;
    state.appointments = state.appointments.filter((item) => item.id !== id);
    if (state.appointments.length !== before) {
      persist();
    }
    return { rows: [] };
  });

  handle(SQL.historyByBarber, (params) => {
    const barberId = toId(params[0]);
    const counts = new Map();
    state.appointments
      .filter((item) => item.barber_id === barberId)
      .forEach((item) => {
        const month = item.date.slice(0, 7);
        counts.set(month, (counts.get(month) || 0) + 1);
      });
    const rows = Array.from(counts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .map(([month, total]) => ({ month, total }));
    return { rows };
  });

  handle(SQL.statsByMonth, (params) => {
    const month = params[0];
    const total = state.appointments.filter((item) => item.date.slice(0, 7) === month).length;
    return { rows: [{ total }] };
  });

  handle(SQL.convertUser, (params) => {
    const shopId = toId(params[0]);
    const userId = toId(params[1]);
    const user = state.users.find((item) => item.id === userId);
    if (user) {
      user.role = "peluquero";
      user.shop_id = shopId;
      persist();
    }
    return { rows: [] };
  });

  return {
    dbAll: async (sql, params = []) => query(sql, params).rows,
    dbGet: async (sql, params = []) => {
      const rows = query(sql, params).rows;
      return rows[0] || null;
    },
    dbRun: async (sql, params = []) => query(sql, params),
  };
}

module.exports = { createDemoDb };
