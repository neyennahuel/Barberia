const ownerShopForm = document.getElementById("owner-shop-form");
const shopName = document.getElementById("shop-name");
const shopAddress = document.getElementById("shop-address");
const ownerName = document.getElementById("owner-name");
const ownerUsername = document.getElementById("owner-username");
const ownerPassword = document.getElementById("owner-password");
const ownerShopMessage = document.getElementById("owner-shop-message");

ownerShopForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  ownerShopMessage.textContent = "";

  if (
    !shopName.value.trim() ||
    !shopAddress.value.trim() ||
    !ownerName.value.trim() ||
    !ownerUsername.value.trim() ||
    !ownerPassword.value.trim()
  ) {
    showMessage(ownerShopMessage, "Completa todos los campos.");
    return;
  }

  try {
    await fetchJSON("/api/shops/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: shopName.value.trim(),
        address: shopAddress.value.trim(),
        ownerName: ownerName.value.trim(),
        ownerUsername: ownerUsername.value.trim(),
        ownerPassword: ownerPassword.value.trim(),
      }),
    });
    ownerShopForm.reset();
    showMessage(
      ownerShopMessage,
      "Solicitud enviada. Te avisaremos cuando sea aprobada."
    );
  } catch (error) {
    showMessage(ownerShopMessage, error.message);
  }
});
