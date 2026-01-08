const API = "";
const USER_KEY = "barberia_user_v2";

const introSections = document.getElementById("intro-sections");
const panelesSection = document.getElementById("paneles");
const shopGrid = document.getElementById("shop-grid");

const clientPanel = document.getElementById("client-panel");
const clientAppointmentsPanel = document.getElementById("client-appointments-panel");
const clientAppointments = document.getElementById("client-appointments");
const clientMessage = document.getElementById("client-message");

const barberPanel = document.getElementById("barber-panel");
const barberHistoryPanel = document.getElementById("barber-history-panel");
const barberDate = document.getElementById("barber-date");
const barberAppointments = document.getElementById("barber-appointments");
const barberMessage = document.getElementById("barber-message");
const barberHistory = document.getElementById("barber-history");

const ownerPanel = document.getElementById("owner-panel");
const ownerHistoryPanel = document.getElementById("owner-history-panel");
const ownerManagePanel = document.getElementById("owner-manage-panel");
const ownerBarber = document.getElementById("owner-barber");
const ownerDate = document.getElementById("owner-date");
const ownerAppointments = document.getElementById("owner-appointments");
const ownerMessage = document.getElementById("owner-message");
const ownerHistory = document.getElementById("owner-history");
const ownerUserShop = document.getElementById("owner-user-shop");
const ownerCreateForm = document.getElementById("owner-create-form");
const ownerUserName = document.getElementById("owner-user-name");
const ownerUserUsername = document.getElementById("owner-user-username");
const ownerUserPassword = document.getElementById("owner-user-password");
const ownerConvertForm = document.getElementById("owner-convert-form");
const ownerConvertUsername = document.getElementById("owner-convert-username");
const ownerManageMessage = document.getElementById("owner-manage-message");

const adminPanel = document.getElementById("admin-panel");
const adminShopForm = document.getElementById("admin-shop-form");
const adminShopName = document.getElementById("admin-shop-name");
const adminShopAddress = document.getElementById("admin-shop-address");
const adminUserForm = document.getElementById("admin-user-form");
const adminUserName = document.getElementById("admin-user-name");
const adminUserUsername = document.getElementById("admin-user-username");
const adminUserPassword = document.getElementById("admin-user-password");
const adminUserRole = document.getElementById("admin-user-role");
const adminUserShop = document.getElementById("admin-user-shop");
const adminConvertForm = document.getElementById("admin-convert-form");
const adminConvertUsername = document.getElementById("admin-convert-username");
const adminConvertShop = document.getElementById("admin-convert-shop");
const adminStats = document.getElementById("admin-stats");
const adminMessage = document.getElementById("admin-message");

const bookingForm = document.getElementById("booking-form");
const bookingShop = document.getElementById("booking-shop");
const bookingBarber = document.getElementById("booking-barber");
const bookingService = document.getElementById("booking-service");
const bookingDate = document.getElementById("booking-date");
const bookingSlots = document.getElementById("booking-slots");
const bookingMessage = document.getElementById("booking-message");

const loginForm = document.getElementById("login-form");
const loginUser = document.getElementById("login-user");
const loginPass = document.getElementById("login-pass");
const loginMessage = document.getElementById("login-message");
const heroLogin = document.getElementById("hero-login");
const heroLogout = document.getElementById("hero-logout");
const sessionPill = document.getElementById("session-pill");

let currentUser = loadUser();
let cachedShops = [];
let selectedSlot = "";

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function saveUser(user) {
  if (!user) {
    localStorage.removeItem(USER_KEY);
  } else {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

async function fetchJSON(url, options) {
  const response = await fetch(`${API}${url}`, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Error de servidor");
  }
  return data;
}

function getTodayISO() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
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

function showMessage(element, text) {
  element.textContent = text;
  if (text) {
    setTimeout(() => {
      element.textContent = "";
    }, 3000);
  }
}

function renderSession() {
  heroLogout.classList.toggle("is-hidden", !currentUser);
  heroLogin.classList.toggle("is-hidden", !!currentUser);

  if (!currentUser) {
    sessionPill.textContent = "Sin sesion";
    introSections.classList.remove("is-hidden");
    panelesSection.classList.add("is-hidden");
    clientPanel.classList.add("is-hidden");
    clientAppointmentsPanel.classList.add("is-hidden");
    barberPanel.classList.add("is-hidden");
    barberHistoryPanel.classList.add("is-hidden");
    ownerPanel.classList.add("is-hidden");
    ownerHistoryPanel.classList.add("is-hidden");
    ownerManagePanel.classList.add("is-hidden");
    adminPanel.classList.add("is-hidden");
    return;
  }

  sessionPill.textContent = `${currentUser.name} | ${currentUser.role}`;
  introSections.classList.add("is-hidden");
  panelesSection.classList.remove("is-hidden");

  const isCliente = currentUser.role === "cliente";
  const isPeluquero = currentUser.role === "peluquero";
  const isDueno = currentUser.role === "dueno";
  const isAdmin = currentUser.role === "admin";

  clientPanel.classList.toggle("is-hidden", !isCliente);
  clientAppointmentsPanel.classList.toggle("is-hidden", !isCliente);
  barberPanel.classList.toggle("is-hidden", !isPeluquero);
  barberHistoryPanel.classList.toggle("is-hidden", !isPeluquero);
  ownerPanel.classList.toggle("is-hidden", !isDueno);
  ownerHistoryPanel.classList.toggle("is-hidden", !isDueno);
  ownerManagePanel.classList.toggle("is-hidden", !isDueno);
  adminPanel.classList.toggle("is-hidden", !isAdmin);

  if (isDueno) {
    const shop = cachedShops.find((item) => item.id === currentUser.shopId);
    ownerUserShop.value = shop ? shop.name : "";
  }
}

async function loadShops() {
  cachedShops = await fetchJSON("/api/shops");
  shopGrid.innerHTML = "";
  cachedShops.forEach((shop) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <h3>${shop.name}</h3>
      <span>${shop.address}</span>
      <p>Agenda activa</p>
    `;
    shopGrid.appendChild(card);
  });

  const options = cachedShops.map((shop) => ({ label: shop.name, value: shop.id }));
  setOptions(bookingShop, options, "Selecciona una peluqueria");
  setOptions(adminUserShop, options, "Selecciona una peluqueria");
  setOptions(adminConvertShop, options, "Selecciona una peluqueria");

  if (options.length) {
    bookingShop.value = options[0].value;
  }
  renderSession();
  await refreshBooking();
}

async function loadBarbers(shopId, targetSelect) {
  if (!shopId) {
    setOptions(targetSelect, [], "Selecciona peluquero");
    return [];
  }
  const barbers = await fetchJSON(`/api/barbers?shopId=${shopId}`);
  const options = barbers.map((barber) => ({ label: barber.name, value: barber.id }));
  setOptions(targetSelect, options, "Selecciona peluquero");
  if (options.length) targetSelect.value = options[0].value;
  return barbers;
}

async function loadServices(shopId) {
  if (!shopId) {
    setOptions(bookingService, [], "Selecciona servicio");
    return;
  }
  const services = await fetchJSON(`/api/services?shopId=${shopId}`);
  const options = services.map((service) => ({ label: service, value: service }));
  setOptions(bookingService, options, "Selecciona servicio");
}

async function renderSlots() {
  bookingSlots.innerHTML = "";
  bookingMessage.textContent = "";
  selectedSlot = "";

  const shopId = bookingShop.value;
  const barberId = bookingBarber.value;
  const date = bookingDate.value;

  if (!shopId || !barberId || !date) {
    bookingMessage.textContent = "Completa peluqueria, peluquero y fecha.";
    return;
  }

  try {
    const availability = await fetchJSON(
      `/api/availability?barberId=${barberId}&date=${date}`
    );
    if (!availability.slots.length) {
      bookingMessage.textContent = availability.reason || "Sin horarios.";
      return;
    }

    availability.slots.forEach((slot) => {
      const label = document.createElement("label");
      label.className = "slot-option";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = slot;
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
  } catch (error) {
    bookingMessage.textContent = error.message;
  }
}

async function refreshBooking() {
  if (!currentUser || currentUser.role !== "cliente") return;
  const shopId = bookingShop.value;
  await loadBarbers(shopId, bookingBarber);
  await loadServices(shopId);
  await renderSlots();
}

async function loadClientAppointments() {
  if (!currentUser || currentUser.role !== "cliente") return;
  clientAppointments.innerHTML = "";
  clientMessage.textContent = "";

  try {
    const rows = await fetchJSON(
      `/api/appointments/client?clientId=${currentUser.id}`
    );
    if (!rows.length) {
      const li = document.createElement("li");
      li.textContent = "No tenes turnos agendados.";
      clientAppointments.appendChild(li);
      return;
    }

    rows.forEach((row) => {
      const li = document.createElement("li");
      li.textContent = `${row.date} ${row.time} | ${row.shop} | ${row.barber}`;
      clientAppointments.appendChild(li);
    });
  } catch (error) {
    clientMessage.textContent = error.message;
  }
}

async function refreshBarberAgenda() {
  barberAppointments.innerHTML = "";
  barberMessage.textContent = "";

  if (!currentUser || currentUser.role !== "peluquero") return;

  const date = barberDate.value;
  if (!date) {
    barberMessage.textContent = "Selecciona una fecha.";
    return;
  }

  try {
    const rows = await fetchJSON(
      `/api/appointments?barberId=${currentUser.barberId}&date=${date}`
    );
    if (!rows.length) {
      const li = document.createElement("li");
      li.textContent = "Sin turnos agendados.";
      barberAppointments.appendChild(li);
      return;
    }

    rows.forEach((row) => {
      const li = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = `${row.time} | ${row.client} | ${row.service}`;
      const button = document.createElement("button");
      button.textContent = "Cancelar";
      button.addEventListener("click", () => cancelAppointment(row.id, barberMessage));
      li.appendChild(text);
      li.appendChild(button);
      barberAppointments.appendChild(li);
    });
  } catch (error) {
    barberMessage.textContent = error.message;
  }
}

async function refreshBarberHistory(barberId, targetList) {
  targetList.innerHTML = "";
  if (!barberId) return;

  try {
    const rows = await fetchJSON(`/api/history/barber?barberId=${barberId}`);
    if (!rows.length) {
      const li = document.createElement("li");
      li.textContent = "Sin historial cargado.";
      targetList.appendChild(li);
      return;
    }
    rows.forEach((row) => {
      const li = document.createElement("li");
      li.textContent = `${row.month} | ${row.total} cortes`;
      targetList.appendChild(li);
    });
  } catch (error) {
    const li = document.createElement("li");
    li.textContent = error.message;
    targetList.appendChild(li);
  }
}

async function refreshOwnerAgenda() {
  ownerAppointments.innerHTML = "";
  ownerMessage.textContent = "";

  if (!currentUser || currentUser.role !== "dueno") return;

  const date = ownerDate.value;
  const barberId = ownerBarber.value;
  if (!date || !barberId) {
    ownerMessage.textContent = "Selecciona peluquero y fecha.";
    return;
  }

  try {
    const rows = await fetchJSON(
      `/api/appointments?barberId=${barberId}&date=${date}`
    );
    if (!rows.length) {
      const li = document.createElement("li");
      li.textContent = "Sin turnos agendados.";
      ownerAppointments.appendChild(li);
      return;
    }

    rows.forEach((row) => {
      const li = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = `${row.time} | ${row.client} | ${row.service}`;
      const button = document.createElement("button");
      button.textContent = "Cancelar";
      button.addEventListener("click", () => cancelAppointment(row.id, ownerMessage));
      li.appendChild(text);
      li.appendChild(button);
      ownerAppointments.appendChild(li);
    });
  } catch (error) {
    ownerMessage.textContent = error.message;
  }
}

async function cancelAppointment(appointmentId, messageEl) {
  if (!appointmentId || !currentUser) return;
  try {
    await fetchJSON(`/api/appointments/${appointmentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: currentUser.id }),
    });
    showMessage(messageEl, "Turno cancelado.");
    if (currentUser.role === "peluquero") {
      refreshBarberAgenda();
    }
    if (currentUser.role === "dueno") {
      refreshOwnerAgenda();
    }
    if (currentUser.role === "cliente") {
      loadClientAppointments();
    }
  } catch (error) {
    showMessage(messageEl, error.message);
  }
}

async function loadAdminStats() {
  if (!currentUser || currentUser.role !== "admin") return;
  try {
    const stats = await fetchJSON("/api/stats/appointments");
    adminStats.textContent = stats.total ?? 0;
  } catch (error) {
    adminStats.textContent = "0";
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";

  try {
    const user = await fetchJSON("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: loginUser.value.trim(),
        password: loginPass.value.trim(),
      }),
    });

    currentUser = user;
    saveUser(user);
    renderSession();

    if (currentUser.role === "cliente") {
      await refreshBooking();
      await loadClientAppointments();
    }
    if (currentUser.role === "peluquero") {
      await refreshBarberAgenda();
      await refreshBarberHistory(currentUser.barberId, barberHistory);
    }
    if (currentUser.role === "dueno") {
      await loadBarbers(currentUser.shopId, ownerBarber);
      await refreshOwnerAgenda();
      await refreshBarberHistory(ownerBarber.value, ownerHistory);
    }
    if (currentUser.role === "admin") {
      await loadAdminStats();
    }
    loginForm.reset();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

heroLogin.addEventListener("click", () => {
  loginUser.focus();
});

heroLogout.addEventListener("click", () => {
  currentUser = null;
  saveUser(null);
  renderSession();
});

bookingShop.addEventListener("change", refreshBooking);
bookingBarber.addEventListener("change", renderSlots);
bookingDate.addEventListener("change", renderSlots);

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  bookingMessage.textContent = "";

  if (!currentUser || currentUser.role !== "cliente") {
    bookingMessage.textContent = "Inicia sesion como cliente.";
    return;
  }

  if (!selectedSlot) {
    bookingMessage.textContent = "Selecciona un horario disponible.";
    return;
  }

  try {
    await fetchJSON("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: currentUser.id,
        shopId: bookingShop.value,
        barberId: bookingBarber.value,
        date: bookingDate.value,
        time: selectedSlot,
        service: bookingService.value,
      }),
    });

    selectedSlot = "";
    bookingForm.reset();
    bookingDate.value = getTodayISO();
    await refreshBooking();
    bookingMessage.textContent = "Turno reservado.";
    await loadClientAppointments();
  } catch (error) {
    bookingMessage.textContent = error.message;
  }
});

barberDate.addEventListener("change", refreshBarberAgenda);
ownerDate.addEventListener("change", refreshOwnerAgenda);
ownerBarber.addEventListener("change", async () => {
  await refreshOwnerAgenda();
  await refreshBarberHistory(ownerBarber.value, ownerHistory);
});

adminShopForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || currentUser.role !== "admin") return;
  adminMessage.textContent = "";

  try {
    if (!adminShopName.value.trim() || !adminShopAddress.value.trim()) {
      showMessage(adminMessage, "Completa nombre y direccion.");
      return;
    }
    await fetchJSON("/api/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId: currentUser.id,
        name: adminShopName.value.trim(),
        address: adminShopAddress.value.trim(),
      }),
    });

    adminShopForm.reset();
    await loadShops();
    showMessage(adminMessage, "Peluqueria creada.");
  } catch (error) {
    showMessage(adminMessage, error.message);
  }
});

adminUserForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || currentUser.role !== "admin") return;
  adminMessage.textContent = "";

  try {
    if (
      !adminUserName.value.trim() ||
      !adminUserUsername.value.trim() ||
      !adminUserPassword.value.trim()
    ) {
      showMessage(adminMessage, "Completa nombre, usuario y clave.");
      return;
    }
    await fetchJSON("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId: currentUser.id,
        name: adminUserName.value.trim(),
        username: adminUserUsername.value.trim(),
        password: adminUserPassword.value.trim(),
        role: adminUserRole.value,
        shopId: adminUserShop.value || null,
      }),
    });

    adminUserForm.reset();
    showMessage(adminMessage, "Usuario creado.");
  } catch (error) {
    showMessage(adminMessage, error.message);
  }
});

adminConvertForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || currentUser.role !== "admin") return;
  adminMessage.textContent = "";

  try {
    if (!adminConvertUsername.value.trim() || !adminConvertShop.value) {
      showMessage(adminMessage, "Completa usuario y peluqueria.");
      return;
    }
    await fetchJSON("/api/users/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId: currentUser.id,
        username: adminConvertUsername.value.trim(),
        shopId: adminConvertShop.value,
      }),
    });

    adminConvertForm.reset();
    showMessage(adminMessage, "Usuario convertido a peluquero.");
  } catch (error) {
    showMessage(adminMessage, error.message);
  }
});

ownerCreateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || currentUser.role !== "dueno") return;
  ownerManageMessage.textContent = "";

  try {
    if (
      !ownerUserName.value.trim() ||
      !ownerUserUsername.value.trim() ||
      !ownerUserPassword.value.trim()
    ) {
      showMessage(ownerManageMessage, "Completa nombre, usuario y clave.");
      return;
    }
    await fetchJSON("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId: currentUser.id,
        name: ownerUserName.value.trim(),
        username: ownerUserUsername.value.trim(),
        password: ownerUserPassword.value.trim(),
        role: "peluquero",
        shopId: currentUser.shopId,
      }),
    });

    ownerCreateForm.reset();
    showMessage(ownerManageMessage, "Peluquero creado.");
    await loadBarbers(currentUser.shopId, ownerBarber);
  } catch (error) {
    showMessage(ownerManageMessage, error.message);
  }
});

ownerConvertForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser || currentUser.role !== "dueno") return;
  ownerManageMessage.textContent = "";

  try {
    if (!ownerConvertUsername.value.trim()) {
      showMessage(ownerManageMessage, "Completa el usuario.");
      return;
    }
    await fetchJSON("/api/users/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId: currentUser.id,
        username: ownerConvertUsername.value.trim(),
        shopId: currentUser.shopId,
      }),
    });

    ownerConvertForm.reset();
    showMessage(ownerManageMessage, "Usuario convertido a peluquero.");
    await loadBarbers(currentUser.shopId, ownerBarber);
  } catch (error) {
    showMessage(ownerManageMessage, error.message);
  }
});

const today = getTodayISO();
bookingDate.min = today;
bookingDate.value = today;
barberDate.min = today;
barberDate.value = today;
ownerDate.min = today;
ownerDate.value = today;

renderSession();
loadShops().catch(() => {
  bookingMessage.textContent = "No se pudo conectar con el servidor.";
});
if (currentUser?.role === "peluquero") {
  refreshBarberAgenda();
  refreshBarberHistory(currentUser.barberId, barberHistory);
}
if (currentUser?.role === "cliente") {
  loadClientAppointments();
}
if (currentUser?.role === "dueno") {
  loadBarbers(currentUser.shopId, ownerBarber).then(() => {
    refreshOwnerAgenda();
    refreshBarberHistory(ownerBarber.value, ownerHistory);
  });
}
if (currentUser?.role === "admin") {
  loadAdminStats();
}
