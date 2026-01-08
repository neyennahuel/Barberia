const API = "";
const USER_KEY = "barberia_user_v2";

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

function createCropper({ input, canvas, zoom, message }) {
  const ctx = canvas.getContext("2d");
  const state = {
    image: null,
    baseScale: 1,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    startX: 0,
    startY: 0,
  };

  function clampOffsets() {
    if (!state.image) return;
    const imgW = state.image.width * state.baseScale * state.zoom;
    const imgH = state.image.height * state.baseScale * state.zoom;
    const minX = canvas.width - imgW;
    const minY = canvas.height - imgH;
    state.offsetX = Math.min(0, Math.max(minX, state.offsetX));
    state.offsetY = Math.min(0, Math.max(minY, state.offsetY));
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!state.image) return;
    const scale = state.baseScale * state.zoom;
    const width = state.image.width * scale;
    const height = state.image.height * scale;
    clampOffsets();
    ctx.drawImage(state.image, state.offsetX, state.offsetY, width, height);
  }

  function loadFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.image = img;
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      state.baseScale = scale;
      state.zoom = 1;
      if (zoom) zoom.value = "1";
      state.offsetX = (canvas.width - img.width * scale) / 2;
      state.offsetY = (canvas.height - img.height * scale) / 2;
      render();
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      if (message) showMessage(message, "No se pudo leer la imagen.");
    };
    img.src = url;
  }

  input.addEventListener("change", (event) => {
    const file = event.target.files[0];
    loadFile(file);
  });

  if (zoom) {
    zoom.addEventListener("input", (event) => {
      state.zoom = Number(event.target.value) || 1;
      render();
    });
  }

  canvas.addEventListener("mousedown", (event) => {
    state.dragging = true;
    state.startX = event.clientX - state.offsetX;
    state.startY = event.clientY - state.offsetY;
  });

  window.addEventListener("mousemove", (event) => {
    if (!state.dragging) return;
    state.offsetX = event.clientX - state.startX;
    state.offsetY = event.clientY - state.startY;
    render();
  });

  window.addEventListener("mouseup", () => {
    state.dragging = false;
  });

  return {
    async getBlob(size = 400) {
      if (!state.image) return null;
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = size;
      exportCanvas.height = size;
      const exportCtx = exportCanvas.getContext("2d");
      const scale = state.baseScale * state.zoom;
      const width = state.image.width * scale;
      const height = state.image.height * scale;
      exportCtx.drawImage(
        state.image,
        state.offsetX,
        state.offsetY,
        width,
        height
      );
      return new Promise((resolve) => {
        exportCanvas.toBlob((blob) => resolve(blob), "image/png");
      });
    },
  };
}

function requireRole(roles) {
  const user = loadUser();
  if (!user || (roles && !roles.includes(user.role))) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

function setupSessionBadge() {
  const sessionPill = document.getElementById("session-pill");
  const logoutBtn = document.getElementById("logout-btn");
  const user = loadUser();
  if (sessionPill) {
    sessionPill.textContent = user ? `${user.name} | ${user.role}` : "Sin sesion";
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      saveUser(null);
      window.location.href = "index.html";
    });
  }
}
