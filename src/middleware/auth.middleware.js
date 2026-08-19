const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("../models/User");

function getBearerToken(req) {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim();
}

async function authenticate(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Token requerido. Usa Authorization: Bearer <token>."
    });
  }

  // 1) Primero intentamos tratarlo como JWT generado por nuestra aplicación.
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);

    if (user) {
      req.user = {
        id: user._id,
        email: user.email,
        authType: "jwt"
      };
      return next();
    }
  } catch (jwtError) {
    // No respondemos todavía: podría ser un access token de Google.
  }

  // 2) Si no fue JWT, intentamos validarlo como access token OAuth de Google.
  try {
    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 5000
      }
    );

    const googleData = response.data;

    const user = await User.findOne({
      $or: [
        { googleId: googleData.id },
        { email: String(googleData.email || "").toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "El token OAuth es válido, pero el usuario no existe en la aplicación."
      });
    }

    req.user = {
      id: user._id,
      email: user.email,
      authType: "oauth"
    };

    return next();
  } catch (oauthError) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Token inválido, revocado o expirado."
    });
  }
}

module.exports = { authenticate };
