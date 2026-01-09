const currentUser = requireRole(["cliente"]);
setupSessionBadge();

const bookingForm = document.getElementById("booking-form");
const bookingShop = document.getElementById("booking-shop");
const bookingBarber = document.getElementById("booking-barber");
const bookingService = document.getElementById("booking-service");
const bookingDate = document.getElementById("booking-date");
const bookingSlots = document.getElementById("booking-slots");
const bookingMessage = document.getElementById("booking-message");
const bookingPanel = document.getElementById("booking-panel");
const bookingSection = document.getElementById("turno");
const clientAppointments = document.getElementById("client-appointments");
const clientMessage = document.getElementById("client-message");
const shopList = document.getElementById("shop-list");
const shopSearch = document.getElementById("shop-search");

let cachedShops = [];
let selectedSlot = "";

function createLogoData(name) {
  const canvas = document.createElement("canvas");
  const size = 80;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffdcc7";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  ctx.fillText(initials || "B", size / 2, size / 2);
  return canvas.toDataURL("image/png");
}

function getFilteredShops() {
  if (!shopSearch) return cachedShops;
  const term = shopSearch.value.trim().toLowerCase();
  if (!term) return cachedShops;
  return cachedShops.filter((shop) => {
    const haystack = `${shop.name} ${shop.address}`.toLowerCase();
    return haystack.includes(term);
  });
}

function renderShopCards() {
  shopList.innerHTML = "";
  const filtered = getFilteredShops();
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No se encontraron barberias.";
    shopList.appendChild(empty);
    return;
  }
  filtered.forEach((shop) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shop-card";
    button.innerHTML = `
      <img class="shop-logo" alt="Logo de ${shop.name}" />
      <div class="shop-meta">
        <h4>${shop.name}</h4>
        <p>${shop.address}</p>
      </div>
    `;
    const img = button.querySelector("img");
    img.src = shop.logo_url || createLogoData(shop.name);
    button.addEventListener("click", () => {
      bookingShop.value = shop.id;
      refreshBooking();
      document.getElementById("turno").scrollIntoView({ behavior: "smooth" });
    });
    shopList.appendChild(button);
  });
}

function updateBookingVisibility() {
  const hasShop = Boolean(bookingShop.value);
  if (bookingSection) {
    bookingSection.classList.toggle("is-hidden", !hasShop);
  }
  if (bookingPanel) {
    bookingPanel.classList.toggle("is-hidden", !hasShop);
  }
}

async function loadShops() {
  cachedShops = await fetchJSON("/api/shops");
  renderShopCards();
  updateBookingVisibility();
}

async function loadBarbers(shopId) {
  if (!shopId) {
    setOptions(bookingBarber, [], "Selecciona peluquero");
    return;
  }
  const barbers = await fetchJSON(`/api/barbers?shopId=${shopId}`);
  const options = barbers.map((barber) => ({ label: barber.name, value: barber.id }));
  setOptions(bookingBarber, options, "Selecciona peluquero");
  if (options.length) bookingBarber.value = options[0].value;
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
  updateBookingVisibility();
  if (!bookingShop.value) {
    setOptions(bookingBarber, [], "Selecciona peluquero");
    setOptions(bookingService, [], "Selecciona servicio");
    bookingSlots.innerHTML = "";
    bookingMessage.textContent = "";
    return;
  }
  await loadBarbers(bookingShop.value);
  await loadServices(bookingShop.value);
  await renderSlots();
}

async function loadClientAppointments() {
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

bookingShop.addEventListener("change", refreshBooking);
bookingBarber.addEventListener("change", renderSlots);
bookingDate.addEventListener("change", renderSlots);
if (shopSearch) {
  shopSearch.addEventListener("input", renderShopCards);
}

function openDatePicker() {
  if (!bookingDate) return;
  if (typeof bookingDate.showPicker === "function") {
    bookingDate.showPicker();
    return;
  }
  bookingDate.focus();
  bookingDate.click();
}

const bookingDateField = bookingDate?.closest(".date-field");
if (bookingDateField) {
  bookingDateField.addEventListener("click", openDatePicker);
}

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  bookingMessage.textContent = "";

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

const today = getTodayISO();
bookingDate.min = today;
bookingDate.value = today;

loadShops().catch(() => {
  bookingMessage.textContent = "No se pudo conectar con el servidor.";
});
loadClientAppointments();
