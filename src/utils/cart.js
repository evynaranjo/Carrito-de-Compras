function recalculateTotal(cart) {
  const total = cart.items.reduce((sum, item) => {
    return sum + item.precio * item.cantidad;
  }, 0);

  cart.total = Number(total.toFixed(2));
  return cart.total;
}

module.exports = { recalculateTotal };
