const sessionPill = document.getElementById("session-pill");
const loginForm = document.getElementById("login-form");
const loginUser = document.getElementById("login-user");
const loginPass = document.getElementById("login-pass");
const loginMessage = document.getElementById("login-message");
const heroLogin = document.getElementById("hero-login");
const heroLogout = document.getElementById("hero-logout");

const existingUser = loadUser();
if (existingUser && sessionPill) {
  sessionPill.textContent = `${existingUser.name} | ${existingUser.role}`;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";

  try {
    const user = await fetchJSON("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: loginUser.value.trim(),
        password: loginPass.value.trim(),
      }),
    });

    saveUser(user);
    const next = {
      cliente: "cliente.html",
      peluquero: "peluquero.html",
      dueno: "dueno.html",
      duenovip: "dueno.html",
      admin: "admin.html",
    }[user.role];
    window.location.href = next || "index.html";
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

if (heroLogin) {
  heroLogin.addEventListener("click", () => {
    loginUser.focus();
  });
}

if (heroLogout) {
  heroLogout.addEventListener("click", () => {
    saveUser(null);
    if (sessionPill) sessionPill.textContent = "Sin sesion";
  });
}
