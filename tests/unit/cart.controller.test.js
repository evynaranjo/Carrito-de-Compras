const Cart = require("../../src/models/Cart");
const Product = require("../../src/models/Product");

jest.mock("../../src/models/Cart");
jest.mock("../../src/models/Product");

const {
  addProduct,
  updateQuantity,
  clearCart
} = require("../../src/controllers/cart.controller");

function createResponse() {
  const res = {};

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
}

describe("Pruebas unitarias del carrito", () => {
  const productId = "507f1f77bcf86cd799439011";
  const userId = "507f191e810c19729de860ea";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================================================
  // 1. CANTIDAD NEGATIVA
  // =====================================================
  test("Debe responder 400 si la cantidad es negativa", async () => {
    const req = {
      user: {
        id: userId
      },
      body: {
        productId,
        nombre: "Minecraft",
        precio: 500,
        cantidad: -1,
        image: "minecraft.jpg"
      }
    };

    const res = createResponse();

    await addProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      error: "Bad Request",
      message: "La cantidad para agregar debe ser un entero mayor a 0."
    });

    expect(Product.findById).not.toHaveBeenCalled();
  });

  // =====================================================
  // 2. PRODUCTO INEXISTENTE
  // =====================================================
  test("Debe responder 404 si el producto no existe", async () => {
    Product.findById.mockResolvedValue(null);

    const req = {
      user: {
        id: userId
      },
      body: {
        productId,
        nombre: "Juego inexistente",
        precio: 500,
        cantidad: 1,
        image: "juego.jpg"
      }
    };

    const res = createResponse();

    await addProduct(req, res);

    expect(Product.findById).toHaveBeenCalledWith(productId);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      error: "Not Found",
      message: "Producto no encontrado."
    });
  });

  // =====================================================
  // 3. STOCK INSUFICIENTE
  // =====================================================
  test("Debe responder 409 si no existe stock suficiente", async () => {
    Product.findById.mockResolvedValue({
      _id: productId,
      nombre: "Resident Evil",
      precio: 900,
      stock: 2,
      image: "resident-evil.jpg"
    });

    Cart.findOne.mockResolvedValue({
      userId,
      items: [],
      total: 0,
      save: jest.fn()
    });

    const req = {
      user: {
        id: userId
      },
      body: {
        productId,
        nombre: "Resident Evil",
        precio: 900,
        cantidad: 5,
        image: "resident-evil.jpg"
      }
    };

    const res = createResponse();

    await addProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(409);

    expect(res.json).toHaveBeenCalledWith({
      error: "Conflict",
      message: "Stock insuficiente. Disponible: 2."
    });
  });

  // =====================================================
  // 4. AGREGAR PRODUCTO CORRECTAMENTE
  // =====================================================
  test("Debe agregar correctamente un producto al carrito", async () => {
    const product = {
      _id: productId,
      nombre: "Minecraft",
      precio: 500,
      stock: 10,
      image: "minecraft.jpg"
    };

    const cart = {
      userId,
      items: [],
      total: 0,
      save: jest.fn().mockResolvedValue(true)
    };

    Product.findById.mockResolvedValue(product);
    Cart.findOne.mockResolvedValue(cart);

    const req = {
      user: {
        id: userId
      },
      body: {
        productId,
        nombre: "Minecraft",
        precio: 500,
        cantidad: 2,
        image: "minecraft.jpg"
      }
    };

    const res = createResponse();

    await addProduct(req, res);

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].cantidad).toBe(2);

    expect(cart.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(201);
  });

  // =====================================================
  // 5. ACTUALIZAR CON CANTIDAD NEGATIVA
  // =====================================================
  test("Debe responder 400 al actualizar a una cantidad negativa", async () => {
    const req = {
      user: {
        id: userId
      },
      params: {
        productId
      },
      body: {
        cantidad: -5
      }
    };

    const res = createResponse();

    await updateQuantity(req, res);

    expect(res.status).toHaveBeenCalledWith(400);

    expect(res.json).toHaveBeenCalledWith({
      error: "Bad Request",
      message: "La cantidad no puede ser negativa."
    });
  });

  // =====================================================
  // 6. CANTIDAD 0 ELIMINA EL PRODUCTO
  // =====================================================
  test("Debe eliminar el producto cuando la cantidad cambia a 0", async () => {
    const cart = {
      userId,
      items: [
        {
          productId,
          nombre: "Minecraft",
          precio: 500,
          cantidad: 2,
          image: "minecraft.jpg"
        }
      ],
      total: 1000,
      save: jest.fn().mockResolvedValue(true)
    };

    Cart.findOne.mockResolvedValue(cart);

    const req = {
      user: {
        id: userId
      },
      params: {
        productId
      },
      body: {
        cantidad: 0
      }
    };

    const res = createResponse();

    await updateQuantity(req, res);

    expect(cart.items).toHaveLength(0);

    expect(cart.save).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith({
      message: "Cantidad 0: producto eliminado del carrito.",
      cart
    });
  });

  // =====================================================
  // 7. PRODUCTO NO ESTÁ EN EL CARRITO
  // =====================================================
  test("Debe responder 404 si el producto no está en el carrito", async () => {
    const cart = {
      userId,
      items: [],
      total: 0,
      save: jest.fn()
    };

    Cart.findOne.mockResolvedValue(cart);

    const req = {
      user: {
        id: userId
      },
      params: {
        productId
      },
      body: {
        cantidad: 2
      }
    };

    const res = createResponse();

    await updateQuantity(req, res);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith({
      error: "Not Found",
      message: "El producto no existe en el carrito."
    });
  });

  // =====================================================
  // 8. NUEVA CANTIDAD SUPERA EL STOCK
  // =====================================================
  test("Debe responder 409 si la nueva cantidad supera el stock", async () => {
    const cart = {
      userId,
      items: [
        {
          productId,
          nombre: "Minecraft",
          precio: 500,
          cantidad: 1,
          image: "minecraft.jpg"
        }
      ],
      total: 500,
      save: jest.fn()
    };

    Cart.findOne.mockResolvedValue(cart);

    Product.findById.mockResolvedValue({
      _id: productId,
      nombre: "Minecraft",
      precio: 500,
      stock: 3,
      image: "minecraft.jpg"
    });

    const req = {
      user: {
        id: userId
      },
      params: {
        productId
      },
      body: {
        cantidad: 10
      }
    };

    const res = createResponse();

    await updateQuantity(req, res);

    expect(res.status).toHaveBeenCalledWith(409);

    expect(res.json).toHaveBeenCalledWith({
      error: "Conflict",
      message: "Stock insuficiente. Disponible: 3."
    });
  });

  // =====================================================
  // 9. VACIAR CARRITO
  // =====================================================
  test("Debe vaciar correctamente el carrito", async () => {
    const cart = {
      userId,
      items: [
        {
          productId,
          nombre: "Minecraft",
          precio: 500,
          cantidad: 2,
          image: "minecraft.jpg"
        }
      ],
      total: 1000,
      save: jest.fn().mockResolvedValue(true)
    };

    Cart.findOne.mockResolvedValue(cart);

    const req = {
      user: {
        id: userId
      }
    };

    const res = createResponse();

    await clearCart(req, res);

    expect(cart.items).toHaveLength(0);
    expect(cart.total).toBe(0);

    expect(cart.save).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith({
      message: "Carrito vaciado correctamente.",
      cart
    });
  });
});



