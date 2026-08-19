const token = localStorage.getItem("token");

if (!token) {
  window.location.replace("/login.html");
}

const productGrid = document.getElementById("productGrid");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const messageBox = document.getElementById("message");

let products = [];
let cart = {
  items: [],
  total: 0
};

function money(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(value);
}

function showMessage(text, type = "success") {
  messageBox.textContent = text;
  messageBox.className = `message ${type}`;

  window.clearTimeout(showMessage.timeoutId);
  showMessage.timeoutId = window.setTimeout(() => {
    messageBox.className = "message hidden";
  }, 3500);
}

async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("authType");
    window.location.replace("/login.html");
    throw new Error(data.message || "Tu sesión ya no es válida.");
  }

  if (!response.ok) {
    const error = new Error(data.message || `Error HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}

function renderProducts() {
  productGrid.innerHTML = products
    .map(
      (product) => `
        <article class="producto">
          <div class="caja-imagen">
            <img src="${product.image}" alt="${product.nombre}" class="imagen">
            <span class="stock">${product.stock} en stock</span>
          </div>

          <div class="datos">
            <div>
              <h3>${product.nombre}</h3>
              <p class="muted">Producto disponible</p>
            </div>

            <div class="precio-boton">
              <strong class="price">${money(product.precio)}</strong>
              <button
                class="btn primary small agregar"
                type="button"
                data-product-id="${product._id}"
                ${product.stock <= 0 ? "disabled" : ""}
              >
                Agregar
              </button>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  document.querySelectorAll(".agregar").forEach((button) => {
    button.addEventListener("click", () => {
      addProduct(button.dataset.productId);
    });
  });
}

function renderCart() {
  const totalItems = cart.items.reduce((sum, item) => sum + item.cantidad, 0);
  cartCount.textContent = totalItems;
  cartTotal.textContent = money(cart.total || 0);

  if (!cart.items.length) {
    cartItems.innerHTML = `
      <div class="vacio">
        <span>🛒</span>
        <h3>Tu carrito está vacío</h3>
        <p>Agrega un producto del catálogo para comenzar.</p>
      </div>
    `;
    return;
  }

  cartItems.innerHTML = cart.items
    .map(
      (item) => `
        <article class="producto-carrito">
          <img src="${item.image}" alt="${item.nombre}">
          <div class="datos-carrito">
            <div class="nombre-carrito">
              <div>
                <strong>${item.nombre}</strong>
                <span>${money(item.precio)}</span>
              </div>
              <button
                class="eliminar"
                type="button"
                data-remove-id="${item.productId}"
                aria-label="Eliminar ${item.nombre}"
              >×</button>
            </div>

            <div class="cantidad">
              <button
                class="cambiar-cantidad"
                type="button"
                data-action="minus"
                data-product-id="${item.productId}"
                data-quantity="${item.cantidad}"
              >−</button>

              <span>${item.cantidad}</span>

              <button
                class="cambiar-cantidad"
                type="button"
                data-action="plus"
                data-product-id="${item.productId}"
                data-quantity="${item.cantidad}"
              >+</button>

              <strong>${money(item.precio * item.cantidad)}</strong>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  document.querySelectorAll(".cambiar-cantidad").forEach((button) => {
    button.addEventListener("click", async () => {
      const current = Number(button.dataset.quantity);
      const next =
        button.dataset.action === "plus" ? current + 1 : current - 1;

      await updateQuantity(button.dataset.productId, next);
    });
  });

  document.querySelectorAll(".eliminar").forEach((button) => {
    button.addEventListener("click", async () => {
      await removeProduct(button.dataset.removeId);
    });
  });
}

async function loadProducts() {
  const data = await apiFetch("/api/productos");
  products = data.products;
  renderProducts();
}

async function loadCart() {
  const data = await apiFetch("/api/carrito");
  cart = data.cart;
  renderCart();
}

async function addProduct(productId) {
  const product = products.find((item) => item._id === productId);

  if (!product) return;

  try {
    const data = await apiFetch("/api/carrito/add", {
      method: "POST",
      body: JSON.stringify({
        productId: product._id,
        nombre: product.nombre,
        precio: product.precio,
        cantidad: 1,
        image: product.image
      })
    });

    cart = data.cart;
    renderCart();
    openCart();
    showMessage(data.message);
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function updateQuantity(productId, cantidad) {
  try {
    const data = await apiFetch(`/api/carrito/update/${productId}`, {
      method: "PUT",
      body: JSON.stringify({ cantidad })
    });

    cart = data.cart;
    renderCart();
    showMessage(data.message);
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function removeProduct(productId) {
  try {
    const data = await apiFetch(`/api/carrito/remove/${productId}`, {
      method: "DELETE"
    });

    cart = data.cart;
    renderCart();
    showMessage(data.message);
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function clearCart() {
  try {
    const data = await apiFetch("/api/carrito/clear", {
      method: "DELETE"
    });

    cart = data.cart;
    renderCart();
    showMessage(data.message);
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function checkout() {
  if (!cart.items.length) {
    showMessage("El carrito está vacío.", "error");
    return;
  }

  try {
    const data = await apiFetch("/api/carrito/checkout", {
      method: "POST"
    });

    cart = data.cart;
    renderCart();
    await loadProducts();
    showMessage(`${data.message} Total: ${money(data.totalPagado)}`);
    closeCart();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function openCart() {
  cartDrawer.classList.add("open");
  drawerBackdrop.classList.add("show");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  drawerBackdrop.classList.remove("show");
  cartDrawer.setAttribute("aria-hidden", "true");
}

document.getElementById("cartFab").addEventListener("click", openCart);
document.getElementById("closeCartBtn").addEventListener("click", closeCart);
drawerBackdrop.addEventListener("click", closeCart);

document.getElementById("clearCartBtn").addEventListener("click", clearCart);
document.getElementById("checkoutBtn").addEventListener("click", checkout);

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("authType");
  window.location.replace("/login.html");
});

(async function init() {
  try {
    await Promise.all([loadProducts(), loadCart()]);
  } catch (error) {
    showMessage(error.message, "error");
  }
})();
