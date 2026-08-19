const jwt = require("jsonwebtoken");

function generateJWT(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("Falta JWT_SECRET en el archivo .env");
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "2h"
    }
  );
}

module.exports = { generateJWT };
