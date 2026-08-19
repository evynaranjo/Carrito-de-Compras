const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { authenticate } = require("../middleware/auth.middleware");
const {
  getCart,
  addProduct,
  updateQuantity,
  removeProduct,
  clearCart,
  checkout
} = require("../controllers/cart.controller");

const router = express.Router();

router.use(authenticate);

router.get("/", asyncHandler(getCart));
router.post("/add", asyncHandler(addProduct));
router.put("/update/:productId", asyncHandler(updateQuantity));
router.delete("/remove/:productId", asyncHandler(removeProduct));
router.delete("/clear", asyncHandler(clearCart));

// Extra para el botón "Finalizar compra".
router.post("/checkout", asyncHandler(checkout));

module.exports = router;
