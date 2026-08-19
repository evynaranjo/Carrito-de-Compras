const loginForm = document.getElementById("loginForm");
const manualTokenForm = document.getElementById("manualTokenForm");
const messageBox = document.getElementById("message");
const tokenPanel = document.getElementById("tokenPanel");
const tokenOutput = document.getElementById("tokenOutput");
const tokenType = document.getElementById("tokenType");
const copyTokenBtn = document.getElementById("copyTokenBtn");
const enterCartBtn = document.getElementById("enterCartBtn");

function showMessage(text, type = "error") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

function hideMessage() {
  messageBox.className = "message hidden";
}

function showToken(token, authType) {
  tokenOutput.value = token;
  tokenType.textContent =
    authType === "oauth"
      ? "Access token OAuth de Google"
      : "JWT generado por la aplicación";

  tokenPanel.classList.remove("hidden");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "No fue posible iniciar sesión.");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("authType", "jwt");

    showToken(data.token, "jwt");
    showMessage("Login correcto. Ya puedes copiar el JWT o entrar al carrito.", "success");
  } catch (error) {
    showMessage(error.message);
  }
});

manualTokenForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();

  const token = document.getElementById("manualToken").value.trim();

  if (!token) {
    showMessage("Pega un token primero.");
    return;
  }

  try {
    const response = await fetch("/api/carrito", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Token inválido.");
    }

    localStorage.setItem("token", token);
    localStorage.setItem("authType", data.authType || "token");
    window.location.href = "/";
  } catch (error) {
    localStorage.removeItem("token");
    localStorage.removeItem("authType");
    showMessage(error.message);
  }
});

copyTokenBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(tokenOutput.value);
    showMessage("Token copiado.", "success");
  } catch {
    tokenOutput.select();
    document.execCommand("copy");
    showMessage("Token copiado.", "success");
  }
});

enterCartBtn.addEventListener("click", () => {
  window.location.href = "/";
});

const params = new URLSearchParams(window.location.search);

if (params.get("oauth") === "success") {
  const token = localStorage.getItem("token");

  if (token) {
    showToken(token, "oauth");
    showMessage(
      "Google OAuth completado. El access token quedó guardado y puede usarse como Bearer token.",
      "success"
    );
  }
}

if (params.get("oauth") === "error") {
  showMessage("No fue posible completar el inicio de sesión con Google.");
}
