const form = document.getElementById("registerForm");
const messageBox = document.getElementById("message");

function showMessage(text, type = "error") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ nombre, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "No se pudo crear la cuenta.");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("authType", "jwt");

    showMessage("Cuenta creada. Redirigiendo al carrito...", "success");

    setTimeout(() => {
      window.location.href = "/";
    }, 700);
  } catch (error) {
    showMessage(error.message);
  }
});
