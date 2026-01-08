const currentUser = requireRole(["dueno"]);
setupSessionBadge();

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
const ownerLogoForm = document.getElementById("owner-logo-form");
const ownerLogoInput = document.getElementById("owner-logo-input");
const ownerLogoPreview = document.getElementById("owner-logo-preview");
const ownerLogoZoom = document.getElementById("owner-logo-zoom");
const ownerManageMessage = document.getElementById("owner-manage-message");

const ownerCropper = createCropper({
  input: ownerLogoInput,
  canvas: ownerLogoPreview,
  zoom: ownerLogoZoom,
  message: ownerManageMessage,
});

async function loadOwnerShopName() {
  try {
    const shops = await fetchJSON("/api/shops");
    const shop = shops.find((item) => item.id === currentUser.shopId);
    ownerUserShop.value = shop ? shop.name : "";
  } catch (error) {
    ownerUserShop.value = "";
  }
}

async function loadBarbers() {
  const barbers = await fetchJSON(`/api/barbers?shopId=${currentUser.shopId}`);
  const options = barbers.map((barber) => ({ label: barber.name, value: barber.id }));
  setOptions(ownerBarber, options, "Selecciona peluquero");
  if (options.length) ownerBarber.value = options[0].value;
}

async function refreshAgenda() {
  ownerAppointments.innerHTML = "";
  ownerMessage.textContent = "";

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
      button.addEventListener("click", () => cancelAppointment(row.id));
      li.appendChild(text);
      li.appendChild(button);
      ownerAppointments.appendChild(li);
    });
  } catch (error) {
    ownerMessage.textContent = error.message;
  }
}

async function loadHistory() {
  ownerHistory.innerHTML = "";
  const barberId = ownerBarber.value;
  if (!barberId) return;

  try {
    const rows = await fetchJSON(`/api/history/barber?barberId=${barberId}`);
    if (!rows.length) {
      const li = document.createElement("li");
      li.textContent = "Sin historial cargado.";
      ownerHistory.appendChild(li);
      return;
    }
    rows.forEach((row) => {
      const li = document.createElement("li");
      li.textContent = `${row.month} | ${row.total} cortes`;
      ownerHistory.appendChild(li);
    });
  } catch (error) {
    const li = document.createElement("li");
    li.textContent = error.message;
    ownerHistory.appendChild(li);
  }
}

async function cancelAppointment(appointmentId) {
  if (!appointmentId) return;
  try {
    await fetchJSON(`/api/appointments/${appointmentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: currentUser.id }),
    });
    showMessage(ownerMessage, "Turno cancelado.");
    refreshAgenda();
  } catch (error) {
    showMessage(ownerMessage, error.message);
  }
}

ownerCreateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
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
    await loadBarbers();
  } catch (error) {
    showMessage(ownerManageMessage, error.message);
  }
});

ownerConvertForm.addEventListener("submit", async (event) => {
  event.preventDefault();
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
    await loadBarbers();
  } catch (error) {
    showMessage(ownerManageMessage, error.message);
  }
});

ownerLogoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  ownerManageMessage.textContent = "";

  const blob = await ownerCropper.getBlob(400);
  if (!blob) {
    showMessage(ownerManageMessage, "Selecciona una imagen.");
    return;
  }

  const formData = new FormData();
  formData.append("actorId", currentUser.id);
  formData.append("logo", blob, "logo.png");

  try {
    const response = await fetch(`${API}/api/shops/logo`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error("Error al subir");
    }
    ownerLogoInput.value = "";
    showMessage(ownerManageMessage, "Logo actualizado.");
  } catch (error) {
    showMessage(ownerManageMessage, "No se pudo subir el logo.");
  }
});

ownerBarber.addEventListener("change", async () => {
  await refreshAgenda();
  await loadHistory();
});
ownerDate.addEventListener("change", refreshAgenda);

const today = getTodayISO();
ownerDate.min = today;
ownerDate.value = today;

loadOwnerShopName();
loadBarbers().then(() => {
  refreshAgenda();
  loadHistory();
});
