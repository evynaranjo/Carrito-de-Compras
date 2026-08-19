function notFound(req, res, next) {
  if (req.path.startsWith("/api") || req.path.startsWith("/auth")) {
    return res.status(404).json({
      error: "Not Found",
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
    });
  }

  next();
}

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err?.name === "ValidationError") {
    return res.status(400).json({
      error: "Bad Request",
      message: Object.values(err.errors)
        .map((item) => item.message)
        .join(", ")
    });
  }

  if (err?.code === 11000) {
    return res.status(409).json({
      error: "Conflict",
      message: "Ya existe un registro con esos datos únicos."
    });
  }

  return res.status(err.status || 500).json({
    error: err.status ? "Request Error" : "Internal Server Error",
    message: err.message || "Ocurrió un error inesperado."
  });
}

module.exports = { notFound, errorHandler };
