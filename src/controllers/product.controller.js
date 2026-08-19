const Product = require("../models/Product");

async function listProducts(req, res) {
  const products = await Product.find().sort({ nombre: 1 });

  return res.json({
    count: products.length,
    products
  });
}

module.exports = { listProducts };
