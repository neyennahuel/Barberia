const currentUser = requireRole(["admin"]);
setupSessionBadge();

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
const adminOwnerUpgradeForm = document.getElementById("admin-owner-upgrade-form");
const adminOwnerUpgrade = document.getElementById("admin-owner-upgrade");
const adminOwnerDowngradeForm = document.getElementById("admin-owner-downgrade-form");
const adminOwnerDowngrade = document.getElementById("admin-owner-downgrade");
const adminLogoForm = document.getElementById("admin-logo-form");
const adminLogoShop = document.getElementById("admin-logo-shop");
const adminLogoInput = document.getElementById("admin-logo-input");
const adminLogoPreview = document.getElementById("admin-logo-preview");
const adminLogoZoom = document.getElementById("admin-logo-zoom");
const adminDeleteShopForm = document.getElementById("admin-delete-shop-form");
const adminDeleteShop = document.getElementById("admin-delete-shop");
const adminPendingList = document.getElementById("admin-pending-list");
const adminPendingMessage = document.getElementById("admin-pending-message");
const adminStats = document.getElementById("admin-stats");
const adminMessage = document.getElementById("admin-message");

let cachedShops = [];
const adminCropper = createCropper({
  input: adminLogoInput,
  canvas: adminLogoPreview,
  zoom: adminLogoZoom,
  message: adminMessage,
});

async function loadShops() {
  cachedShops = await fetchJSON(`/api/shops?actorId=${currentUser.id}`);
  const options = cachedShops.map((shop) => ({ label: shop.name, value: shop.id }));
  setOptions(adminUserShop, options, "Selecciona una peluqueria");
  setOptions(adminConvertShop, options, "Selecciona una peluqueria");
  setOptions(adminLogoShop, options, "Selecciona una peluqueria");
  setOptions(adminDeleteShop, options, "Selecciona una peluqueria");
}

async function loadOwners() {
  if (!adminOwnerUpgrade || !adminOwnerDowngrade) return;
  try {
    const owners = await fetchJSON(
      `/api/users/owners?actorId=${currentUser.id}&role=dueno`
    );
    const vips = await fetchJSON(
      `/api/users/owners?actorId=${currentUser.id}&role=duenovip`
    );
    setOptions(
      adminOwnerUpgrade,
      owners.map((owner) => ({
        label: `${owner.name} (${owner.username})`,
        value: owner.username,
      })),
      "Selecciona dueno"
    );
    setOptions(
      adminOwnerDowngrade,
      vips.map((owner) => ({
        label: `${owner.name} (${owner.username})`,
        value: owner.username,
      })),
      "Selecciona dueno VIP"
    );
  } catch (error) {
    showMessage(adminMessage, error.message);
  }
}

async function loadPendingShops() {
  if (!adminPendingList) return;
  adminPendingList.innerHTML = "";
  if (adminPendingMessage) adminPendingMessage.textContent = "";

  try {
    const rows = await fetchJSON(`/api/shops/pending?actorId=${currentUser.id}`);
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No hay peluquerias pendientes.";
      adminPendingList.appendChild(empty);
      return;
    }

    rows.forEach((shop) => {
      const item = document.createElement("div");
      item.className = "pending-item";

      const info = document.createElement("div");
      info.className = "pending-info";

      const title = document.createElement("p");
      title.className = "pending-title";
      title.textContent = shop.name;

      const ownerLabel = shop.ownerName
        ? `${shop.ownerName} (${shop.ownerRole || "dueno"})`
        : "Sin dueno";
      const meta = document.createElement("p");
      meta.className = "muted";
      meta.textContent = `${shop.address} | ${ownerLabel}`;

      info.appendChild(title);
      info.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "pending-actions";

      const approveBtn = document.createElement("button");
      approveBtn.type = "button";
      approveBtn.className = "cta";
      approveBtn.textContent = "Aprobar";

      const rejectBtn = document.createElement("button");
      rejectBtn.type = "button";
      rejectBtn.className = "danger";
      rejectBtn.textContent = "Rechazar";

      approveBtn.addEventListener("click", async () => {
        try {
          await fetchJSON(`/api/shops/${shop.id}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actorId: currentUser.id }),
          });
          await loadPendingShops();
          await loadShops();
          showMessage(adminPendingMessage, "Peluqueria aprobada.");
        } catch (error) {
          showMessage(adminPendingMessage, error.message);
        }
      });

      rejectBtn.addEventListener("click", async () => {
        const confirmed = window.confirm(
          `Rechazar la peluqueria "${shop.name}"?`
        );
        if (!confirmed) return;
        try {
          await fetchJSON(`/api/shops/${shop.id}/reject`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ actorId: currentUser.id }),
          });
          await loadPendingShops();
          await loadShops();
          showMessage(adminPendingMessage, "Peluqueria rechazada.");
        } catch (error) {
          showMessage(adminPendingMessage, error.message);
        }
      });

      actions.appendChild(approveBtn);
      actions.appendChild(rejectBtn);
      item.appendChild(info);
      item.appendChild(actions);
      adminPendingList.appendChild(item);
    });
  } catch (error) {
    showMessage(adminPendingMessage, error.message);
  }
}

async function loadAdminStats() {
  try {
    const stats = await fetchJSON("/api/stats/appointments");
    adminStats.textContent = stats.total ?? 0;
  } catch (error) {
    adminStats.textContent = "0";
  }
}

adminShopForm.addEventListener("submit", async (event) => {
  event.preventDefault();
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

if (adminOwnerUpgradeForm) {
  adminOwnerUpgradeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminMessage.textContent = "";

    try {
      if (!adminOwnerUpgrade.value) {
        showMessage(adminMessage, "Selecciona un dueno.");
        return;
      }
      await fetchJSON("/api/users/owner-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: currentUser.id,
          username: adminOwnerUpgrade.value,
          role: "duenovip",
        }),
      });

      adminOwnerUpgradeForm.reset();
      showMessage(adminMessage, "Rol actualizado.");
      await loadOwners();
    } catch (error) {
      showMessage(adminMessage, error.message);
    }
  });
}

if (adminOwnerDowngradeForm) {
  adminOwnerDowngradeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminMessage.textContent = "";

    try {
      if (!adminOwnerDowngrade.value) {
        showMessage(adminMessage, "Selecciona un dueno VIP.");
        return;
      }
      await fetchJSON("/api/users/owner-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: currentUser.id,
          username: adminOwnerDowngrade.value,
          role: "dueno",
        }),
      });

      adminOwnerDowngradeForm.reset();
      showMessage(adminMessage, "Rol actualizado.");
      await loadOwners();
    } catch (error) {
      showMessage(adminMessage, error.message);
    }
  });
}

adminLogoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminMessage.textContent = "";

  if (!adminLogoShop.value) {
    showMessage(adminMessage, "Selecciona una peluqueria.");
    return;
  }
  const blob = await adminCropper.getBlob(400);
  if (!blob) {
    showMessage(adminMessage, "Selecciona una imagen.");
    return;
  }

  const formData = new FormData();
  formData.append("actorId", currentUser.id);
  formData.append("shopId", adminLogoShop.value);
  formData.append("logo", blob, "logo.png");

  try {
    const response = await fetch(`${API}/api/shops/logo`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      throw new Error("Error al subir");
    }
    adminLogoInput.value = "";
    showMessage(adminMessage, "Logo actualizado.");
  } catch (error) {
    showMessage(adminMessage, "No se pudo subir el logo.");
  }
});

if (adminDeleteShopForm) {
  adminDeleteShopForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminMessage.textContent = "";

    if (!adminDeleteShop.value) {
      showMessage(adminMessage, "Selecciona una peluqueria.");
      return;
    }

    const targetName = adminDeleteShop.options[adminDeleteShop.selectedIndex]?.text;
    const confirmed = window.confirm(
      `Eliminar la peluqueria "${targetName}"? Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      await fetchJSON(`/api/shops/${adminDeleteShop.value}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: currentUser.id }),
      });
      await loadShops();
      showMessage(adminMessage, "Peluqueria eliminada.");
    } catch (error) {
      showMessage(adminMessage, error.message);
    }
  });
}

loadShops().catch(() => {
  adminMessage.textContent = "No se pudo cargar peluquerias.";
});
loadAdminStats();
loadPendingShops();
loadOwners();
