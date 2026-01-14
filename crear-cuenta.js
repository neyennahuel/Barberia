const registerForm = document.getElementById("register-form");
const registerUsername = document.getElementById("register-username");
const registerPassword = document.getElementById("register-password");
const registerMessage = document.getElementById("register-message");

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    registerMessage.textContent = "";

    if (!registerUsername.value.trim() || !registerPassword.value.trim()) {
      showMessage(registerMessage, "Completa todos los campos.");
      return;
    }

    try {
      await fetchJSON("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: registerUsername.value.trim(),
          password: registerPassword.value.trim(),
        }),
      });
      registerForm.reset();
      showMessage(registerMessage, "Cuenta creada. Ya podes iniciar sesion.");
    } catch (error) {
      showMessage(registerMessage, error.message);
    }
  });
}
