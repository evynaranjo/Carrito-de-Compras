const path = require("path");
const express = require("express");
const passport = require("passport");

const authRoutes = require("./routes/auth.routes");
const oauthRoutes = require("./routes/oauth.routes");
const productRoutes = require("./routes/product.routes");
const cartRoutes = require("./routes/cart.routes");
const { notFound, errorHandler } = require("./middleware/error.middleware");

function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use(passport.initialize());

  // API
  app.use("/api", authRoutes);
  app.use("/auth", oauthRoutes);
  app.use("/api/productos", productRoutes);
  app.use("/api/carrito", cartRoutes);

  // Frontend estático
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
