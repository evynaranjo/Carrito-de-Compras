const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { generateJWT } = require("../utils/jwt");

async function register(req, res) {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({
      error: "Bad Request",
      message: "nombre, email y password son obligatorios."
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "Bad Request",
      message: "La contraseña debe tener al menos 6 caracteres."
    });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    return res.status(409).json({
      error: "Conflict",
      message: "Ya existe una cuenta con ese correo."
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    nombre: nombre.trim(),
    email: normalizedEmail,
    password: passwordHash,
    authProvider: "local"
  });

  const token = generateJWT(user);

  return res.status(201).json({
    message: "Usuario registrado correctamente.",
    token,
    user: {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      authProvider: user.authProvider
    }
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: "Bad Request",
      message: "email y password son obligatorios."
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user || !user.password) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Credenciales incorrectas."
    });
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Credenciales incorrectas."
    });
  }

  const token = generateJWT(user);

  return res.json({
    message: "Inicio de sesión exitoso.",
    token,
    user: {
      id: user._id,
      nombre: user.nombre,
      email: user.email,
      authProvider: user.authProvider
    }
  });
}

async function googleCallback(req, res) {
  const { user, accessToken } = req.user || {};

  if (!user || !accessToken) {
    return res.status(401).send("No fue posible completar el inicio de sesión con Google.");
  }

  // El callback devuelve una pequeña página que guarda el access token OAuth
  // en localStorage y regresa al login. Así el usuario puede verlo/copiarlo.
  const safeToken = JSON.stringify(accessToken);

  return res.type("html").send(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>OAuth completado</title>
</head>
<body>
  <p>Autenticación completada. Redirigiendo...</p>
  <script>
    localStorage.setItem("token", ${safeToken});
    localStorage.setItem("authType", "oauth");
    window.location.replace("/login.html?oauth=success");
  </script>
</body>
</html>`);
}

module.exports = {
  register,
  login,
  googleCallback
};
