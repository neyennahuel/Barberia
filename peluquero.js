const currentUser = requireRole(["peluquero"]);
setupSessionBadge();

const barberDate = document.getElementById("barber-date");
const barberAppointments = document.getElementById("barber-appointments");
const barberMessage = document.getElementById("barber-message");
const barberHistory = document.getElementById("barber-history");

async function refreshAgenda() {
  barberAppointments.innerHTML = "";
  barberMessage.textContent = "";

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
      button.addEventListener("click", () => cancelAppointment(row.id));
      li.appendChild(text);
      li.appendChild(button);
      barberAppointments.appendChild(li);
    });
  } catch (error) {
    barberMessage.textContent = error.message;
  }
}

async function loadHistory() {
  barberHistory.innerHTML = "";
  try {
    const rows = await fetchJSON(
      `/api/history/barber?barberId=${currentUser.barberId}`
    );
    if (!rows.length) {
      const li = document.createElement("li");
      li.textContent = "Sin historial cargado.";
      barberHistory.appendChild(li);
      return;
    }
    rows.forEach((row) => {
      const li = document.createElement("li");
      li.textContent = `${row.month} | ${row.total} cortes`;
      barberHistory.appendChild(li);
    });
  } catch (error) {
    const li = document.createElement("li");
    li.textContent = error.message;
    barberHistory.appendChild(li);
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
    showMessage(barberMessage, "Turno cancelado.");
    refreshAgenda();
  } catch (error) {
    showMessage(barberMessage, error.message);
  }
}

barberDate.addEventListener("change", refreshAgenda);

const today = getTodayISO();
barberDate.min = today;
barberDate.value = today;

refreshAgenda();
loadHistory();
