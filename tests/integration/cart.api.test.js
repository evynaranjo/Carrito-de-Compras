const request = require("supertest");
const jwt = require("jsonwebtoken");

// ======================================================
// MOCKS
// ======================================================

jest.mock("../../src/models/User", () => ({
  findById: jest.fn(),
  findOne: jest.fn()
}));

jest.mock("../../src/models/Cart", () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock("../../src/models/Product", () => ({
  findById: jest.fn(),
  find: jest.fn(),
  updateOne: jest.fn()
}));

jest.mock("axios", () => ({
  get: jest.fn()
}));

const User = require("../../src/models/User");
const Cart = require("../../src/models/Cart");
const Product = require("../../src/models/Product");
const axios = require("axios");

const createApp = require("../../src/app");

describe("Pruebas de integración - API del carrito", () => {
  let app;

  const userId = "507f191e810c19729de860ea";
  const productId = "507f1f77bcf86cd799439011";

  beforeAll(() => {
    process.env.JWT_SECRET = "secreto-pruebas-jwt";

    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Evita que un token inválido intente conectarse realmente
    // con los servidores de Google.
    axios.get.mockRejectedValue(
      new Error("Token OAuth inválido")
    );
  });

  // ======================================================
  // FUNCIONES AUXILIARES
  // ======================================================

  function generateToken() {
    return jwt.sign(
      {
        userId
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h"
      }
    );
  }

  function mockAuthenticatedUser() {
    User.findById.mockResolvedValue({
      _id: userId,
      email: "pruebas@carrito.com"
    });
  }

  // ======================================================
  // PRUEBA 1
  // PETICIÓN SIN TOKEN
  // ======================================================

  test("GET /api/carrito debe responder 401 si no se envía token", async () => {
    const response = await request(app)
      .get("/api/carrito");

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      error: "Unauthorized",
      message: "Token requerido. Usa Authorization: Bearer <token>."
    });
  });

  // ======================================================
  // PRUEBA 2
  // TOKEN INVÁLIDO
  // ======================================================

  test("GET /api/carrito debe responder 401 con token inválido", async () => {
    const response = await request(app)
      .get("/api/carrito")
      .set(
        "Authorization",
        "Bearer token-completamente-invalido"
      );

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      error: "Unauthorized",
      message: "Token inválido, revocado o expirado."
    });
  });

  // ======================================================
  // PRUEBA 3
  // JWT CORRECTO
  // ======================================================

  test("GET /api/carrito debe permitir acceso con un JWT válido", async () => {
    mockAuthenticatedUser();

    Cart.findOne.mockResolvedValue({
      userId,
      items: [],
      total: 0
    });

    const token = generateToken();

    const response = await request(app)
      .get("/api/carrito")
      .set(
        "Authorization",
        `Bearer ${token}`
      );

    expect(response.status).toBe(200);

    expect(response.body.message).toBe(
      "Carrito obtenido correctamente."
    );

    expect(response.body.authType).toBe("jwt");

    expect(response.body.cart.items).toHaveLength(0);
  });

  // ======================================================
  // PRUEBA 4
  // CANTIDAD NEGATIVA
  // ======================================================

  test("POST /api/carrito/add debe responder 400 con cantidad negativa", async () => {
    mockAuthenticatedUser();

    const token = generateToken();

    const response = await request(app)
      .post("/api/carrito/add")
      .set(
        "Authorization",
        `Bearer ${token}`
      )
      .send({
        productId,
        nombre: "Minecraft",
        precio: 500,
        cantidad: -1,
        image: "minecraft.jpg"
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error: "Bad Request",
      message: "La cantidad para agregar debe ser un entero mayor a 0."
    });

    expect(Product.findById).not.toHaveBeenCalled();
  });

  // ======================================================
  // PRUEBA 5
  // PRODUCTO NO ENCONTRADO
  // ======================================================

  test("POST /api/carrito/add debe responder 404 si el producto no existe", async () => {
    mockAuthenticatedUser();

    Product.findById.mockResolvedValue(null);

    const token = generateToken();

    const response = await request(app)
      .post("/api/carrito/add")
      .set(
        "Authorization",
        `Bearer ${token}`
      )
      .send({
        productId,
        nombre: "Juego inexistente",
        precio: 600,
        cantidad: 1,
        image: "juego.jpg"
      });

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      error: "Not Found",
      message: "Producto no encontrado."
    });
  });

  // ======================================================
  // PRUEBA 6
  // STOCK INSUFICIENTE
  // ======================================================

  test("POST /api/carrito/add debe responder 409 si no existe stock suficiente", async () => {
    mockAuthenticatedUser();

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

    const token = generateToken();

    const response = await request(app)
      .post("/api/carrito/add")
      .set(
        "Authorization",
        `Bearer ${token}`
      )
      .send({
        productId,
        nombre: "Resident Evil",
        precio: 900,
        cantidad: 5,
        image: "resident-evil.jpg"
      });

    expect(response.status).toBe(409);

    expect(response.body).toEqual({
      error: "Conflict",
      message: "Stock insuficiente. Disponible: 2."
    });
  });

  // ======================================================
  // PRUEBA 7
  // AGREGAR PRODUCTO CORRECTAMENTE
  // ======================================================

  test("POST /api/carrito/add debe agregar correctamente un producto", async () => {
    mockAuthenticatedUser();

    Product.findById.mockResolvedValue({
      _id: productId,
      nombre: "Minecraft",
      precio: 500,
      stock: 10,
      image: "minecraft.jpg"
    });

    const cart = {
      userId,
      items: [],
      total: 0,
      save: jest.fn().mockResolvedValue(true)
    };

    Cart.findOne.mockResolvedValue(cart);

    const token = generateToken();

    const response = await request(app)
      .post("/api/carrito/add")
      .set(
        "Authorization",
        `Bearer ${token}`
      )
      .send({
        productId,
        nombre: "Minecraft",
        precio: 500,
        cantidad: 2,
        image: "minecraft.jpg"
      });

    expect(response.status).toBe(201);

    expect(response.body.message).toBe(
      "Producto agregado correctamente."
    );

    expect(response.body.cart.items).toHaveLength(1);

    expect(response.body.cart.items[0].cantidad).toBe(2);
  });

  // ======================================================
  // PRUEBA 8
  // ACTUALIZAR A CANTIDAD NEGATIVA
  // ======================================================

  test("PUT /api/carrito/update/:productId debe responder 400 con cantidad negativa", async () => {
    mockAuthenticatedUser();

    const token = generateToken();

    const response = await request(app)
      .put(`/api/carrito/update/${productId}`)
      .set(
        "Authorization",
        `Bearer ${token}`
      )
      .send({
        cantidad: -3
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      error: "Bad Request",
      message: "La cantidad no puede ser negativa."
    });
  });

  // ======================================================
  // PRUEBA 9
  // CANTIDAD 0 ELIMINA EL PRODUCTO
  // ======================================================

  test("PUT /api/carrito/update/:productId debe eliminar el producto cuando cantidad es 0", async () => {
    mockAuthenticatedUser();

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

    const token = generateToken();

    const response = await request(app)
      .put(`/api/carrito/update/${productId}`)
      .set(
        "Authorization",
        `Bearer ${token}`
      )
      .send({
        cantidad: 0
      });

    expect(response.status).toBe(200);

    expect(response.body.message).toBe(
      "Cantidad 0: producto eliminado del carrito."
    );

    expect(response.body.cart.items).toHaveLength(0);

    expect(response.body.cart.total).toBe(0);
  });

  // ======================================================
  // PRUEBA 10
  // VACIAR CARRITO
  // ======================================================

  test("DELETE /api/carrito/clear debe vaciar correctamente el carrito", async () => {
    mockAuthenticatedUser();

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

    const token = generateToken();

    const response = await request(app)
      .delete("/api/carrito/clear")
      .set(
        "Authorization",
        `Bearer ${token}`
      );

    expect(response.status).toBe(200);

    expect(response.body.message).toBe(
      "Carrito vaciado correctamente."
    );

    expect(response.body.cart.items).toHaveLength(0);

    expect(response.body.cart.total).toBe(0);
  });
});