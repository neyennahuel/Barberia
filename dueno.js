const currentUser = requireRole(["dueno", "duenovip"]);
setupSessionBadge();

const ownerBarber = document.getElementById("owner-barber");
const ownerDate = document.getElementById("owner-date");
const ownerAppointments = document.getElementById("owner-appointments");
const ownerMessage = document.getElementById("owner-message");
const ownerUserShop = document.getElementById("owner-user-shop");
const ownerCreateForm = document.getElementById("owner-create-form");
const ownerUserName = document.getElementById("owner-user-name");
const ownerUserUsername = document.getElementById("owner-user-username");
const ownerUserPassword = document.getElementById("owner-user-password");
const ownerRemoveForm = document.getElementById("owner-remove-form");
const ownerRemoveBarber = document.getElementById("owner-remove-barber");
const ownerConvertForm = document.getElementById("owner-convert-form");
const ownerConvertUsername = document.getElementById("owner-convert-username");
const ownerLogoForm = document.getElementById("owner-logo-form");
const ownerLogoInput = document.getElementById("owner-logo-input");
const ownerLogoPreview = document.getElementById("owner-logo-preview");
const ownerLogoThumb = document.getElementById("owner-logo-thumb");
const ownerLogoEdit = document.getElementById("owner-logo-edit");
const ownerLogoZoom = document.getElementById("owner-logo-zoom");
const ownerManageMessage = document.getElementById("owner-manage-message");
const ownerRevenue = document.getElementById("owner-revenue");
const ownerSales = document.getElementById("owner-sales");
const ownerAvgTicket = document.getElementById("owner-avg-ticket");
const ownerTopClient = document.getElementById("owner-top-client");
const ownerTopTotal = document.getElementById("owner-top-total");
const ownerSalesChart = document.getElementById("owner-sales-chart");
const ownerStatsPeriod = document.getElementById("owner-stats-period");
const statsFilter = document.getElementById("owner-stats-filter");
const statsMonth = document.getElementById("stats-month");
const statsFrom = document.getElementById("stats-from");
const statsTo = document.getElementById("stats-to");
const statsClear = document.getElementById("stats-clear");
const ownerServiceForm = document.getElementById("owner-service-form");
const ownerServiceName = document.getElementById("owner-service-name");
const ownerServicePrice = document.getElementById("owner-service-price");
const ownerServiceList = document.getElementById("owner-service-list");
const ownerServiceMessage = document.getElementById("owner-service-message");
const confirmModal = document.getElementById("confirm-modal");
const confirmMessage = document.getElementById("confirm-message");
const confirmCancel = document.getElementById("confirm-cancel");
const confirmAccept = document.getElementById("confirm-accept");
const logoModal = document.getElementById("logo-modal");
const logoClose = document.getElementById("logo-close");
const logoCancel = document.getElementById("logo-cancel");
const logoApply = document.getElementById("logo-apply");
const ownerRoleTag = document.getElementById("owner-role-tag");
const vipOnlyBlocks = document.querySelectorAll(".vip-only");
const isVipOwner = currentUser.role === "duenovip";

if (ownerRoleTag) {
  ownerRoleTag.textContent = isVipOwner ? "Dueno VIP" : "Dueno";
}

if (!isVipOwner && vipOnlyBlocks.length) {
  vipOnlyBlocks.forEach((element) => element.classList.add("is-hidden"));
}

const ownerCropper = createCropper({
  input: ownerLogoInput,
  canvas: ownerLogoPreview,
  zoom: ownerLogoZoom,
  message: ownerManageMessage,
});

function openLogoModal() {
  if (!logoModal) return;
  logoModal.classList.remove("is-hidden");
  logoModal.setAttribute("aria-hidden", "false");
  logoApply?.focus();
}

function closeLogoModal() {
  if (!logoModal) return;
  logoModal.classList.add("is-hidden");
  logoModal.setAttribute("aria-hidden", "true");
}

async function syncThumbPreview() {
  if (!ownerLogoThumb) return;
  const blob = await ownerCropper.getBlob(240);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const ctx = ownerLogoThumb.getContext("2d");
    ctx.clearRect(0, 0, ownerLogoThumb.width, ownerLogoThumb.height);
    ctx.drawImage(img, 0, 0, ownerLogoThumb.width, ownerLogoThumb.height);
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function confirmAction(message) {
  if (!confirmModal || !confirmMessage || !confirmCancel || !confirmAccept) {
    return Promise.resolve(window.confirm(message));
  }
  confirmMessage.textContent = message;
  confirmModal.classList.remove("is-hidden");
  confirmModal.setAttribute("aria-hidden", "false");
  confirmAccept.focus();

  return new Promise((resolve) => {
    const cleanup = () => {
      confirmModal.classList.add("is-hidden");
      confirmModal.setAttribute("aria-hidden", "true");
      confirmCancel.removeEventListener("click", onCancel);
      confirmAccept.removeEventListener("click", onAccept);
    };
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    const onAccept = () => {
      cleanup();
      resolve(true);
    };
    confirmCancel.addEventListener("click", onCancel);
    confirmAccept.addEventListener("click", onAccept);
  });
}

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
  if (ownerRemoveBarber) {
    setOptions(ownerRemoveBarber, options, "Selecciona peluquero");
  }
  if (options.length) ownerBarber.value = options[0].value;
}

async function loadServicesManage() {
  if (!ownerServiceList) return;
  ownerServiceList.innerHTML = "";
  ownerServiceMessage.textContent = "";

  try {
    const rows = await fetchJSON(
      `/api/services/manage?actorId=${currentUser.id}&shopId=${currentUser.shopId}`
    );

    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No hay servicios cargados.";
      ownerServiceList.appendChild(empty);
      return;
    }

    rows.forEach((service) => {
      const row = document.createElement("div");
      row.className = "service-item";
      const priceValue = service.price === null || service.price === undefined ? "" : service.price;
      row.innerHTML = `
        <input type="text" value="${service.name}" />
        <input type="number" min="0" step="0.01" value="${priceValue}" placeholder="Sin precio" />
        <button class="ghost" type="button">Guardar</button>
        <button class="ghost" type="button">Eliminar</button>
      `;
      const [nameInput, priceInput] = row.querySelectorAll("input");
      const buttons = row.querySelectorAll("button");
      const saveBtn = buttons[0];
      const deleteBtn = buttons[1];

      saveBtn.addEventListener("click", async () => {
        ownerServiceMessage.textContent = "";
        try {
          const name = nameInput.value.trim();
          const rawPrice = priceInput.value.trim();
          const price = rawPrice === "" ? null : Number(rawPrice);
          if (!name) {
            showMessage(ownerServiceMessage, "El nombre es obligatorio.");
            return;
          }
          await fetchJSON(`/api/services/${service.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actorId: currentUser.id,
              name,
              price,
            }),
          });
          showMessage(ownerServiceMessage, "Servicio actualizado.");
        } catch (error) {
          showMessage(ownerServiceMessage, error.message);
        }
      });

      deleteBtn.addEventListener("click", async () => {
        ownerServiceMessage.textContent = "";
        try {
          await fetchJSON(`/api/services/${service.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actorId: currentUser.id }),
          });
          showMessage(ownerServiceMessage, "Servicio eliminado.");
          loadServicesManage();
        } catch (error) {
          showMessage(ownerServiceMessage, error.message);
        }
      });

      ownerServiceList.appendChild(row);
    });
  } catch (error) {
    showMessage(ownerServiceMessage, error.message);
  }
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

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMonthLabel(month) {
  if (!month) return "";
  const [year, mm] = month.split("-");
  const date = new Date(Number(year), Number(mm) - 1, 1);
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(
    date
  );
}

function renderSalesChart(days) {
  if (!ownerSalesChart) return;
  ownerSalesChart.innerHTML = "";
  const maxTotal = Math.max(...days.map((d) => d.total), 1);
  days.forEach((day) => {
    const item = document.createElement("div");
    item.className = "chart-bar";
    const bar = document.createElement("div");
    bar.className = "bar-fill";
    bar.style.height = `${Math.round((day.total / maxTotal) * 140) + 6}px`;
    bar.title = `${day.date} | ${formatCurrency(day.total)} | ${day.count} ventas`;
    const label = document.createElement("span");
    label.className = "bar-day";
    label.textContent = day.day;
    item.appendChild(bar);
    item.appendChild(label);
    ownerSalesChart.appendChild(item);
  });
}

function buildStatsQuery() {
  const params = new URLSearchParams({
    actorId: currentUser.id,
    shopId: currentUser.shopId,
  });
  if (statsMonth?.value) {
    params.append("month", statsMonth.value);
  }
  if (statsFrom?.value) {
    params.append("from", statsFrom.value);
  }
  if (statsTo?.value) {
    params.append("to", statsTo.value);
  }
  return params.toString();
}

async function loadOwnerStats() {
  if (!ownerRevenue) return;
  try {
    const query = buildStatsQuery();
    const stats = await fetchJSON(`/api/stats/owner?${query}`);
    ownerRevenue.textContent = formatCurrency(stats.totals.revenue);
    ownerSales.textContent = stats.totals.sales;
    ownerAvgTicket.textContent = formatCurrency(stats.totals.avgTicket);
    if (stats.topClient) {
      ownerTopClient.textContent = stats.topClient.name;
      ownerTopTotal.textContent = formatCurrency(stats.topClient.total);
    } else {
      ownerTopClient.textContent = "Sin datos";
      ownerTopTotal.textContent = "";
    }
    if (ownerStatsPeriod) {
      ownerStatsPeriod.textContent = formatMonthLabel(stats.period.month);
    }
    renderSalesChart(stats.salesByDay);
  } catch (error) {
    ownerRevenue.textContent = "-";
    ownerSales.textContent = "-";
    ownerAvgTicket.textContent = "-";
    ownerTopClient.textContent = "Sin datos";
    if (ownerStatsPeriod) ownerStatsPeriod.textContent = "";
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

ownerRemoveForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  ownerManageMessage.textContent = "";

  try {
    if (!ownerRemoveBarber.value) {
      showMessage(ownerManageMessage, "Selecciona un peluquero.");
      return;
    }
    const selectedName =
      ownerRemoveBarber.options[ownerRemoveBarber.selectedIndex]?.textContent ||
      "este peluquero";
    const confirmed = await confirmAction(
      `Se va a eliminar a ${selectedName}. ¿Continuar?`
    );
    if (!confirmed) return;
    await fetchJSON(`/api/barbers/${ownerRemoveBarber.value}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: currentUser.id }),
    });
    showMessage(ownerManageMessage, "Peluquero eliminado.");
    await loadBarbers();
    await refreshAgenda();
    await loadHistory();
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

if (ownerLogoInput) {
  ownerLogoInput.addEventListener("change", () => {
    if (ownerLogoEdit) ownerLogoEdit.disabled = !ownerLogoInput.value;
    openLogoModal();
  });
}

if (ownerLogoEdit) {
  ownerLogoEdit.addEventListener("click", openLogoModal);
}

if (logoCancel) {
  logoCancel.addEventListener("click", closeLogoModal);
}

if (logoClose) {
  logoClose.addEventListener("click", closeLogoModal);
}

if (logoApply) {
  logoApply.addEventListener("click", async () => {
    await syncThumbPreview();
    closeLogoModal();
  });
}

if (ownerServiceForm) {
  ownerServiceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    ownerServiceMessage.textContent = "";

    try {
      const name = ownerServiceName.value.trim();
      const rawPrice = ownerServicePrice.value.trim();
      const price = rawPrice === "" ? null : Number(rawPrice);
      if (!name) {
        showMessage(ownerServiceMessage, "El nombre es obligatorio.");
        return;
      }
      await fetchJSON("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: currentUser.id,
          name,
          price,
          shopId: currentUser.shopId,
        }),
      });
      ownerServiceForm.reset();
      showMessage(ownerServiceMessage, "Servicio agregado.");
      loadServicesManage();
    } catch (error) {
      showMessage(ownerServiceMessage, error.message);
    }
  });
}

if (logoModal) {
  logoModal.addEventListener("click", (event) => {
    if (event.target === logoModal) {
      closeLogoModal();
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && logoModal && !logoModal.classList.contains("is-hidden")) {
    closeLogoModal();
  }
});

ownerBarber.addEventListener("change", async () => {
  await refreshAgenda();
});
ownerDate.addEventListener("change", refreshAgenda);

function openOwnerDatePicker() {
  if (!ownerDate) return;
  if (typeof ownerDate.showPicker === "function") {
    ownerDate.showPicker();
    return;
  }
  ownerDate.focus();
  ownerDate.click();
}

const ownerDateField = ownerDate?.closest(".date-field");
if (ownerDateField) {
  ownerDateField.addEventListener("click", openOwnerDatePicker);
}

const today = getTodayISO();
ownerDate.min = today;
ownerDate.value = today;

loadOwnerShopName();
loadBarbers().then(() => {
  refreshAgenda();
});
loadServicesManage();
loadOwnerStats();

if (statsFilter) {
  statsFilter.addEventListener("submit", (event) => {
    event.preventDefault();
    loadOwnerStats();
  });
}

if (statsClear) {
  statsClear.addEventListener("click", () => {
    if (statsMonth) statsMonth.value = "";
    if (statsFrom) statsFrom.value = "";
    if (statsTo) statsTo.value = "";
    loadOwnerStats();
  });
}

function openStatsPicker(event) {
  const input = event.currentTarget?.querySelector("input");
  if (!input) return;
  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }
  input.focus();
  input.click();
}

const statsDateFields = statsFilter?.querySelectorAll(".date-field") || [];
statsDateFields.forEach((field) => {
  field.addEventListener("click", openStatsPicker);
});
