const STORAGE_KEY = "barberia_state_v1";
const DEFAULT_SLOTS = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"];

const defaultState = {
  shops: [
    {
      id: "shop-1",
      name: "Distrito 17",
      address: "Av. Central 1240",
      rating: "4.9",
      services: ["Corte clasico", "Fade", "Barba premium"],
      barbers: [
        { id: "barber-1", name: "Lautaro", slots: ["09:00", "10:30", "12:00", "15:00"] },
        { id: "barber-2", name: "Micaela", slots: ["11:00", "13:30", "17:00"] },
      ],
    },
    {
      id: "shop-2",
      name: "Norte Studio",
      address: "Calle 8 #110",
      rating: "4.7",
      services: ["Corte moderno", "Barba", "Perfilado"],
      barbers: [
        { id: "barber-3", name: "Santiago", slots: ["10:00", "11:30", "16:00"] },
        { id: "barber-4", name: "Abril", slots: ["09:30", "12:30", "18:00"] },
      ],
    },
    {
      id: "shop-3",
      name: "Barrio Sur",
      address: "San Martin 300",
      rating: "4.8",
      services: ["Corte + barba", "Color", "Kids"],
      barbers: [{ id: "barber-5", name: "Lucas", slots: ["08:30", "10:00", "14:30", "19:00"] }],
    },
    {
      id: "shop-4",
      name: "Vintage Club",
      address: "Diagonal 50",
      rating: "5.0",
      services: ["Tijera", "Barba deluxe", "Masaje"],
      barbers: [
        { id: "barber-6", name: "Florencia", slots: ["09:00", "12:00", "15:30"] },
        { id: "barber-7", name: "Ivan", slots: ["10:30", "13:00", "17:30"] },
      ],
    },
  ],
  users: [
    { id: "user-1", name: "Camila", role: "cliente" },
    { id: "user-2", name: "Nico", role: "cliente" },
    { id: "admin-1", name: "Agus", role: "admin" },
    { id: "barber-1", name: "Lautaro", role: "peluquero", shopId: "shop-1" },
    { id: "barber-2", name: "Micaela", role: "peluquero", shopId: "shop-1" },
    { id: "barber-3", name: "Santiago", role: "peluquero", shopId: "shop-2" },
    { id: "barber-4", name: "Abril", role: "peluquero", shopId: "shop-2" },
    { id: "barber-5", name: "Lucas", role: "peluquero", shopId: "shop-3" },
    { id: "barber-6", name: "Florencia", role: "peluquero", shopId: "shop-4" },
    { id: "barber-7", name: "Ivan", role: "peluquero", shopId: "shop-4" },
    { id: "pa-1", name: "Romina", role: "peluqueroAdmin", shopId: "shop-2" },
  ],
  appointments: [],
};

const shopGrid = document.getElementById("shop-grid");
const shopList = document.getElementById("shop-list");
const userList = document.getElementById("user-list");

const heroShop = document.getElementById("hero-shop");
const heroBarber = document.getElementById("hero-barber");
const heroTime = document.getElementById("hero-time");
const heroDate = document.getElementById("hero-date");

const bookingClient = document.getElementById("booking-client");
const bookingShop = document.getElementById("booking-shop");
const bookingBarber = document.getElementById("booking-barber");
const bookingService = document.getElementById("booking-service");
const bookingDate = document.getElementById("booking-date");
const bookingSlots = document.getElementById("booking-slots");
const bookingMessage = document.getElementById("booking-message");

const agendaName = document.getElementById("agenda-name");
const agendaDate = document.getElementById("agenda-date");
const agendaList = document.getElementById("agenda-list");

const userForm = document.getElementById("user-form");
const userName = document.getElementById("user-name");
const userRole = document.getElementById("user-role");
const userShop = document.getElementById("user-shop");
const userMessage = document.getElementById("user-message");

const shopForm = document.getElementById("shop-form");
const shopName = document.getElementById("shop-name");
const shopAddress = document.getElementById("shop-address");
const shopMessage = document.getElementById("shop-message");

const bookingForm = document.getElementById("booking-form");

let selectedSlot = "";
let state = loadState();

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return structuredClone(defaultState);
    return JSON.parse(stored);
  } catch (error) {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function makeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function getTodayISO() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isPastDate(dateStr) {
  if (!dateStr) return false;
  const today = getTodayISO();
  return dateStr < today;
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

function setOptions(select, items, placeholder) {
  select.innerHTML = "";
  if (placeholder) {
    const option = document.createElement("option");
    option.textContent = placeholder;
    option.value = "";
    option.disabled = true;
    option.selected = true;
    select.appendChild(option);
  }
  items.forEach((item) => {
    const option = document.createElement("option");
    option.textContent = item.label;
    option.value = item.value;
    select.appendChild(option);
  });
}

function renderShopCards() {
  shopGrid.innerHTML = "";
  state.shops.forEach((shop) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h3>${shop.name}</h3>
      <span>${shop.address}</span>
      <p>Rating ${shop.rating} | ${shop.barbers.length} peluqueros</p>
    `;
    shopGrid.appendChild(card);
  });
}

function renderShopList() {
  shopList.innerHTML = "";
  state.shops.forEach((shop) => {
    const li = document.createElement("li");
    li.textContent = `${shop.name} | ${shop.address} | ${shop.barbers.length} peluqueros`;
    shopList.appendChild(li);
  });
}

function renderUserList() {
  userList.innerHTML = "";
  state.users.forEach((user) => {
    const shop = state.shops.find((item) => item.id === user.shopId);
    const shopLabel = shop ? ` | ${shop.name}` : "";
    const li = document.createElement("li");
    li.textContent = `${user.name} | ${user.role}${shopLabel}`;
    userList.appendChild(li);
  });
}

function renderShopSelects() {
  const shopOptions = state.shops.map((shop) => ({
    label: shop.name,
    value: shop.id,
  }));

  setOptions(heroShop, shopOptions, "Selecciona una peluqueria");
  setOptions(bookingShop, shopOptions, "Selecciona una peluqueria");
  setOptions(userShop, shopOptions, "Sin asignar");

  if (state.shops.length) {
    heroShop.value = state.shops[0].id;
    bookingShop.value = state.shops[0].id;
  }
}

function renderClientSelect() {
  const clients = state.users.filter((user) => user.role === "cliente");
  const options = clients.map((client) => ({
    label: client.name,
    value: client.id,
  }));
  if (options.length) {
    setOptions(bookingClient, options, "Selecciona cliente");
  } else {
    setOptions(bookingClient, [{ label: "Sin clientes", value: "" }]);
  }
}

function renderBarberSelect(shop) {
  const barberOptions = shop.barbers.map((barber) => ({
    label: barber.name,
    value: barber.id,
  }));
  if (barberOptions.length) {
    setOptions(bookingBarber, barberOptions, "Selecciona peluquero");
  } else {
    setOptions(bookingBarber, [{ label: "Sin peluqueros", value: "" }]);
  }
}

function renderServiceSelect(shop) {
  const services = shop.services.length ? shop.services : ["Corte"];
  const serviceOptions = services.map((service) => ({
    label: service,
    value: service,
  }));
  setOptions(bookingService, serviceOptions, "Selecciona servicio");
}

function renderHero(shop) {
  const barberOptions = shop.barbers.map((barber) => ({
    label: barber.name,
    value: barber.id,
  }));
  setOptions(heroBarber, barberOptions, "Selecciona peluquero");
  if (shop.barbers.length) {
    heroBarber.value = shop.barbers[0].id;
    setOptions(
      heroTime,
      shop.barbers[0].slots.map((slot) => ({ label: slot, value: slot })),
      "Selecciona hora"
    );
  }
}

function getBookedTimes(barberId, dateStr) {
  return state.appointments
    .filter((appt) => appt.barberId === barberId && appt.date === dateStr)
    .map((appt) => appt.time);
}

function renderSlots() {
  bookingSlots.innerHTML = "";
  bookingMessage.textContent = "";

  const shop = state.shops.find((item) => item.id === bookingShop.value);
  if (!shop) {
    bookingMessage.textContent = "Crea una peluqueria para ver horarios.";
    return;
  }

  const barber = shop.barbers.find((item) => item.id === bookingBarber.value);
  if (!barber) {
    bookingMessage.textContent = "No hay peluqueros disponibles.";
    return;
  }

  const dateStr = bookingDate.value;
  if (!dateStr) {
    bookingMessage.textContent = "Selecciona una fecha para ver horarios.";
    return;
  }

  if (isPastDate(dateStr)) {
    bookingMessage.textContent = "No podes sacar turnos en fechas pasadas.";
    return;
  }

  const bookedTimes = new Set(getBookedTimes(barber.id, dateStr));
  const availableSlots = barber.slots.filter(
    (slot) => !bookedTimes.has(slot) && !isPastTimeForDate(dateStr, slot)
  );

  if (!availableSlots.length) {
    bookingMessage.textContent = "No hay horarios disponibles para esa fecha.";
    return;
  }

  availableSlots.forEach((slot) => {
    const label = document.createElement("label");
    label.className = "slot-option";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "slot";
    input.value = slot;
    input.checked = selectedSlot === slot;
    input.addEventListener("change", () => {
      selectedSlot = input.checked ? slot : "";
      Array.from(bookingSlots.querySelectorAll("input")).forEach((checkbox) => {
        if (checkbox !== input) checkbox.checked = false;
      });
    });
    const text = document.createElement("span");
    text.textContent = slot;
    label.appendChild(input);
    label.appendChild(text);
    bookingSlots.appendChild(label);
  });
}

function renderAgenda() {
  agendaList.innerHTML = "";
  const shop = state.shops.find((item) => item.id === bookingShop.value);
  const barber = shop?.barbers.find((item) => item.id === bookingBarber.value);
  const dateStr = bookingDate.value;

  if (!shop || !barber) {
    agendaName.textContent = "";
    agendaDate.textContent = "";
    return;
  }

  agendaName.textContent = barber.name;
  agendaDate.textContent = dateStr ? `Fecha: ${dateStr}` : "Fecha: -";

  if (!dateStr) {
    const li = document.createElement("li");
    li.textContent = "Selecciona fecha para ver la agenda.";
    agendaList.appendChild(li);
    return;
  }

  const bookedTimes = new Set(getBookedTimes(barber.id, dateStr));
  barber.slots.forEach((slot) => {
    const li = document.createElement("li");
    if (bookedTimes.has(slot)) {
      li.textContent = `${slot} | Reservado`;
    } else if (isPastTimeForDate(dateStr, slot) || isPastDate(dateStr)) {
      li.textContent = `${slot} | No disponible`;
    } else {
      li.textContent = `${slot} | Disponible`;
    }
    agendaList.appendChild(li);
  });
}

function refreshBooking() {
  const shop = state.shops.find((item) => item.id === bookingShop.value);
  if (!shop) return;
  renderBarberSelect(shop);
  renderServiceSelect(shop);
  selectedSlot = "";
  renderSlots();
  renderAgenda();
}

function refreshHero() {
  const shop = state.shops.find((item) => item.id === heroShop.value);
  if (!shop) return;
  renderHero(shop);
}

function refreshAll() {
  renderShopCards();
  renderShopList();
  renderUserList();
  renderShopSelects();
  renderClientSelect();
  refreshHero();
  refreshBooking();
}

function showMessage(element, text) {
  element.textContent = text;
  if (text) {
    setTimeout(() => {
      element.textContent = "";
    }, 3000);
  }
}

heroShop.addEventListener("change", refreshHero);
heroBarber.addEventListener("change", () => {
  const shop = state.shops.find((item) => item.id === heroShop.value);
  const barber = shop?.barbers.find((item) => item.id === heroBarber.value);
  if (!barber) return;
  setOptions(
    heroTime,
    barber.slots.map((slot) => ({ label: slot, value: slot })),
    "Selecciona hora"
  );
});

bookingShop.addEventListener("change", refreshBooking);
bookingBarber.addEventListener("change", () => {
  selectedSlot = "";
  renderSlots();
  renderAgenda();
});
bookingDate.addEventListener("change", () => {
  selectedSlot = "";
  renderSlots();
  renderAgenda();
});

userForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = userName.value.trim();
  const role = userRole.value;
  const shopId = userShop.value || null;

  if (!name) return;

  const needsShop = role === "peluquero" || role === "peluqueroAdmin";
  if (needsShop && !shopId) {
    showMessage(userMessage, "Selecciona una peluqueria para ese rol.");
    return;
  }

  const id = needsShop ? makeId("barber") : makeId("user");
  state.users.push({ id, name, role, shopId: needsShop ? shopId : null });

  if (needsShop) {
    const shop = state.shops.find((item) => item.id === shopId);
    if (shop) {
      shop.barbers.push({ id, name, slots: [...DEFAULT_SLOTS] });
    }
  }

  saveState();
  userForm.reset();
  renderUserList();
  renderShopCards();
  renderShopList();
  renderShopSelects();
  renderClientSelect();
  refreshBooking();
  showMessage(userMessage, "Usuario creado.");
});

shopForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = shopName.value.trim();
  const address = shopAddress.value.trim();

  if (!name || !address) return;

  const newShop = {
    id: makeId("shop"),
    name,
    address,
    rating: "-",
    services: ["Corte", "Barba", "Corte + barba"],
    barbers: [],
  };

  state.shops.push(newShop);
  saveState();
  shopForm.reset();
  renderShopCards();
  renderShopList();
  renderShopSelects();
  refreshBooking();
  showMessage(shopMessage, "Peluqueria creada.");
});

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  bookingMessage.textContent = "";

  const clientId = bookingClient.value;
  const shop = state.shops.find((item) => item.id === bookingShop.value);
  const barber = shop?.barbers.find((item) => item.id === bookingBarber.value);
  const dateStr = bookingDate.value;
  const service = bookingService.value;

  if (!clientId) {
    bookingMessage.textContent = "Selecciona un cliente.";
    return;
  }

  if (!shop || !barber) {
    bookingMessage.textContent = "Completa peluqueria y peluquero.";
    return;
  }

  if (!dateStr) {
    bookingMessage.textContent = "Selecciona una fecha valida.";
    return;
  }

  if (isPastDate(dateStr)) {
    bookingMessage.textContent = "No podes sacar turnos en fechas pasadas.";
    return;
  }

  if (!selectedSlot) {
    bookingMessage.textContent = "Selecciona un horario disponible.";
    return;
  }

  if (isPastTimeForDate(dateStr, selectedSlot)) {
    bookingMessage.textContent = "Ese horario ya paso.";
    return;
  }

  state.appointments.push({
    id: makeId("appt"),
    shopId: shop.id,
    barberId: barber.id,
    clientId,
    date: dateStr,
    time: selectedSlot,
    service,
  });

  saveState();
  selectedSlot = "";
  renderSlots();
  renderAgenda();
  bookingForm.reset();
  renderShopSelects();
  renderClientSelect();
  refreshBooking();
  bookingMessage.textContent = "Turno reservado.";
});

const today = getTodayISO();
bookingDate.min = today;
heroDate.min = today;

refreshAll();
