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
const adminOwnerRoleForm = document.getElementById("admin-owner-role-form");
const adminOwnerUsername = document.getElementById("admin-owner-username");
const adminOwnerRole = document.getElementById("admin-owner-role");
const adminLogoForm = document.getElementById("admin-logo-form");
const adminLogoShop = document.getElementById("admin-logo-shop");
const adminLogoInput = document.getElementById("admin-logo-input");
const adminLogoPreview = document.getElementById("admin-logo-preview");
const adminLogoZoom = document.getElementById("admin-logo-zoom");
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
  cachedShops = await fetchJSON("/api/shops");
  const options = cachedShops.map((shop) => ({ label: shop.name, value: shop.id }));
  setOptions(adminUserShop, options, "Selecciona una peluqueria");
  setOptions(adminConvertShop, options, "Selecciona una peluqueria");
  setOptions(adminLogoShop, options, "Selecciona una peluqueria");
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

if (adminOwnerRoleForm) {
  adminOwnerRoleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminMessage.textContent = "";

    try {
      if (!adminOwnerUsername.value.trim()) {
        showMessage(adminMessage, "Completa el usuario.");
        return;
      }
      await fetchJSON("/api/users/owner-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorId: currentUser.id,
          username: adminOwnerUsername.value.trim(),
          role: adminOwnerRole.value,
        }),
      });

      adminOwnerRoleForm.reset();
      showMessage(adminMessage, "Rol actualizado.");
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

loadShops().catch(() => {
  adminMessage.textContent = "No se pudo cargar peluquerias.";
});
loadAdminStats();
