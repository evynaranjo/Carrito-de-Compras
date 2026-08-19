const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/auth.middleware");
const { listProducts } = require("../controllers/product.controller");

const router = express.Router();

router.get("/", authenticate, asyncHandler(listProducts));

module.exports = router;
