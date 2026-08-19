require("dotenv").config();

const connectDB = require("./config/db");
const configurePassport = require("./config/passport");
const createApp = require("./app");

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("Falta JWT_SECRET en el archivo .env");
    }

    configurePassport();
    await connectDB();

    const app = createApp();
    const port = Number(process.env.PORT) || 3000;

    app.listen(port, () => {
      console.log(`Servidor listo en http://localhost:${port}`);
      console.log(`Login: http://localhost:${port}/login.html`);
    });
  } catch (error) {
    console.error("No se pudo iniciar el servidor:");
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
