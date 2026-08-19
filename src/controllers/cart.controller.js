const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { recalculateTotal } = require("../utils/cart");

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = await Cart.create({
      userId,
      items: [],
      total: 0
    });
  }

  return cart;
}

async function getCart(req, res) {
  const cart = await getOrCreateCart(req.user.id);

  return res.json({
    message: "Carrito obtenido correctamente.",
    authType: req.user.authType,
    cart
  });
}

async function addProduct(req, res) {
  const { productId, nombre, precio, cantidad, image } = req.body;

  // El documento pide que estos cinco campos estén presentes en el body.
  if (
    !productId ||
    !nombre ||
    precio === undefined ||
    cantidad === undefined ||
    !image
  ) {
    return res.status(400).json({
      error: "Bad Request",
      message:
        "Debes enviar productId, nombre, precio, cantidad e image."
    });
  }

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({
      error: "Bad Request",
      message: "La cantidad para agregar debe ser un entero mayor a 0."
    });
  }

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(404).json({
      error: "Not Found",
      message: "Producto no encontrado."
    });
  }

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      error: "Not Found",
      message: "Producto no encontrado."
    });
  }

  const cart = await getOrCreateCart(req.user.id);

  const existingItem = cart.items.find(
    (item) => item.productId.toString() === productId
  );

  const requestedQuantity = existingItem
    ? existingItem.cantidad + cantidad
    : cantidad;

  if (requestedQuantity > product.stock) {
    return res.status(409).json({
      error: "Conflict",
      message: `Stock insuficiente. Disponible: ${product.stock}.`
    });
  }

  if (existingItem) {
    existingItem.cantidad = requestedQuantity;

    // Refrescamos estos datos desde la BD, no confiamos en el precio del cliente.
    existingItem.nombre = product.nombre;
    existingItem.precio = product.precio;
    existingItem.image = product.image;
  } else {
    cart.items.push({
      productId: product._id,
      nombre: product.nombre,
      precio: product.precio,
      cantidad,
      image: product.image
    });
  }

  recalculateTotal(cart);
  await cart.save();

  return res.status(201).json({
    message: "Producto agregado correctamente.",
    cart
  });
}

async function updateQuantity(req, res) {
  const { productId } = req.params;
  const { cantidad } = req.body;

  if (!Number.isInteger(cantidad)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "cantidad debe ser un número entero."
    });
  }

  if (cantidad < 0) {
    return res.status(400).json({
      error: "Bad Request",
      message: "La cantidad no puede ser negativa."
    });
  }

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(404).json({
      error: "Not Found",
      message: "Producto no encontrado."
    });
  }

  const cart = await getOrCreateCart(req.user.id);

  const itemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId
  );

  if (itemIndex === -1) {
    return res.status(404).json({
      error: "Not Found",
      message: "El producto no existe en el carrito."
    });
  }

  // Requisito: si cantidad = 0, eliminar el producto.
  if (cantidad === 0) {
    cart.items.splice(itemIndex, 1);
    recalculateTotal(cart);
    await cart.save();

    return res.json({
      message: "Cantidad 0: producto eliminado del carrito.",
      cart
    });
  }

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      error: "Not Found",
      message: "Producto no encontrado."
    });
  }

  if (cantidad > product.stock) {
    return res.status(409).json({
      error: "Conflict",
      message: `Stock insuficiente. Disponible: ${product.stock}.`
    });
  }

  cart.items[itemIndex].cantidad = cantidad;
  cart.items[itemIndex].nombre = product.nombre;
  cart.items[itemIndex].precio = product.precio;
  cart.items[itemIndex].image = product.image;

  recalculateTotal(cart);
  await cart.save();

  return res.json({
    message: "Cantidad actualizada correctamente.",
    cart
  });
}

async function removeProduct(req, res) {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    return res.status(404).json({
      error: "Not Found",
      message: "Producto no encontrado."
    });
  }

  const cart = await getOrCreateCart(req.user.id);

  const originalLength = cart.items.length;

  cart.items = cart.items.filter(
    (item) => item.productId.toString() !== productId
  );

  if (cart.items.length === originalLength) {
    return res.status(404).json({
      error: "Not Found",
      message: "El producto no existe en el carrito."
    });
  }

  recalculateTotal(cart);
  await cart.save();

  return res.json({
    message: "Producto eliminado correctamente.",
    cart
  });
}

async function clearCart(req, res) {
  const cart = await getOrCreateCart(req.user.id);

  cart.items = [];
  cart.total = 0;
  await cart.save();

  return res.json({
    message: "Carrito vaciado correctamente.",
    cart
  });
}

// Endpoint extra para que el botón "Finalizar compra" realmente haga algo.
// No reemplaza ninguno de los cinco endpoints obligatorios.
async function checkout(req, res) {
  const cart = await getOrCreateCart(req.user.id);

  if (cart.items.length === 0) {
    return res.status(400).json({
      error: "Bad Request",
      message: "No puedes finalizar una compra con el carrito vacío."
    });
  }

  const products = await Product.find({
    _id: { $in: cart.items.map((item) => item.productId) }
  });

  const productMap = new Map(
    products.map((product) => [product._id.toString(), product])
  );

  for (const item of cart.items) {
    const product = productMap.get(item.productId.toString());

    if (!product) {
      return res.status(404).json({
        error: "Not Found",
        message: `El producto "${item.nombre}" ya no existe.`
      });
    }

    if (item.cantidad > product.stock) {
      return res.status(409).json({
        error: "Conflict",
        message: `Stock insuficiente para "${product.nombre}".`
      });
    }
  }

  for (const item of cart.items) {
    await Product.updateOne(
      { _id: item.productId },
      { $inc: { stock: -item.cantidad } }
    );
  }

  const totalPagado = cart.total;

  cart.items = [];
  cart.total = 0;
  await cart.save();

  return res.json({
    message: "Compra simulada finalizada correctamente.",
    totalPagado,
    cart
  });
}

module.exports = {
  getCart,
  addProduct,
  updateQuantity,
  removeProduct,
  clearCart,
  checkout
};
