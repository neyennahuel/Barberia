const currentUser = requireRole(["dueno", "duenovip"]);
setupSessionBadge();

const shopName = document.getElementById("shop-name");
const shopAddress = document.getElementById("shop-address");
const shopLocationUrl = document.getElementById("shop-location-url");
const shopDescription = document.getElementById("shop-description");
const shopDetailsForm = document.getElementById("shop-details-form");
const shopImagesForm = document.getElementById("shop-images-form");
const shopImage1 = document.getElementById("shop-image-1");
const shopImage2 = document.getElementById("shop-image-2");
const shopImage1Preview = document.getElementById("shop-image-1-preview");
const shopImage2Preview = document.getElementById("shop-image-2-preview");
const shopLogoForm = document.getElementById("shop-logo-form");
const shopLogoInput = document.getElementById("shop-logo-input");
const shopLogoPreview = document.getElementById("shop-logo-preview");
const shopConfigMessage = document.getElementById("shop-config-message");

function setPreview(imgEl, url) {
  if (!imgEl) return;
  imgEl.src = url || "";
  imgEl.classList.toggle("is-hidden", !url);
}

async function loadShop() {
  try {
    const shop = await fetchJSON(
      `/api/shops/${currentUser.shopId}?actorId=${currentUser.id}`
    );
    shopName.value = shop.name || "";
    shopAddress.value = shop.address || "";
    shopLocationUrl.value = shop.locationUrl || "";
    shopDescription.value = shop.description || "";
    setPreview(shopImage1Preview, shop.imageUrl1);
    setPreview(shopImage2Preview, shop.imageUrl2);
    setPreview(shopLogoPreview, shop.logoUrl);
  } catch (error) {
    showMessage(shopConfigMessage, error.message);
  }
}

shopDetailsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  shopConfigMessage.textContent = "";

  if (!shopName.value.trim()) {
    showMessage(shopConfigMessage, "El nombre es obligatorio.");
    return;
  }
  if (!shopLocationUrl.value.trim()) {
    showMessage(shopConfigMessage, "La ubicacion es obligatoria.");
    return;
  }

  try {
    await fetchJSON(`/api/shops/${currentUser.shopId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actorId: currentUser.id,
        name: shopName.value.trim(),
        address: shopAddress.value.trim(),
        description: shopDescription.value.trim(),
        locationUrl: shopLocationUrl.value.trim(),
      }),
    });
    showMessage(shopConfigMessage, "Datos guardados.");
  } catch (error) {
    showMessage(shopConfigMessage, error.message);
  }
});

shopImagesForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  shopConfigMessage.textContent = "";

  if (!shopImage1.files.length && !shopImage2.files.length) {
    showMessage(shopConfigMessage, "Selecciona al menos una imagen.");
    return;
  }

  const formData = new FormData();
  formData.append("actorId", currentUser.id);
  if (shopImage1.files[0]) {
    formData.append("image1", shopImage1.files[0]);
  }
  if (shopImage2.files[0]) {
    formData.append("image2", shopImage2.files[0]);
  }

  try {
    const response = await fetch(`${API}/api/shops/images`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Error de servidor");
    }
    const data = await response.json();
    setPreview(shopImage1Preview, data.imageUrl1);
    setPreview(shopImage2Preview, data.imageUrl2);
    shopImage1.value = "";
    shopImage2.value = "";
    showMessage(shopConfigMessage, "Imagenes actualizadas.");
  } catch (error) {
    showMessage(shopConfigMessage, error.message);
  }
});

shopLogoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  shopConfigMessage.textContent = "";

  if (!shopLogoInput.files.length) {
    showMessage(shopConfigMessage, "Selecciona un logo.");
    return;
  }

  const formData = new FormData();
  formData.append("actorId", currentUser.id);
  formData.append("logo", shopLogoInput.files[0]);

  try {
    const response = await fetch(`${API}/api/shops/logo`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Error de servidor");
    }
    const data = await response.json();
    setPreview(shopLogoPreview, data.logoUrl);
    shopLogoInput.value = "";
    showMessage(shopConfigMessage, "Logo actualizado.");
  } catch (error) {
    showMessage(shopConfigMessage, error.message);
  }
});

loadShop();
