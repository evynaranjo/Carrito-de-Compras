require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Product = require("./models/Product");

const products = [
  {
    nombre: "The Witcher 3",
    precio: 599,
    stock: 10,
    image: "/images/thewitcher.png"
  },
  {
    nombre: "Cyberpunk 2077",
    precio: 899,
    stock: 6,
    image: "/images/cyberpunk.png"
  },
  {
    nombre: "Minecraft",
    precio: 499,
    stock: 15,
    image: "/images/minecraft.png"
  },
  {
    nombre: "Red Dead Redemption 2",
    precio: 799,
    stock: 8,
    image: "/images/rdr2.png"
  },
  {
    nombre: "Hogwarts Legacy",
    precio: 999,
    stock: 7,
    image: "/images/hogwarts.png"
  },
  {
    nombre: "Grand Theft Auto V",
    precio: 699,
    stock: 12,
    image: "/images/gtav.png"
  }
];

async function seed() {
  try {
    await connectDB();

    await Product.deleteMany({});
    const inserted = await Product.insertMany(products);

    console.log(`Seed completado: ${inserted.length} productos creados.`);
  } catch (error) {
    console.error("Error al cargar productos:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
