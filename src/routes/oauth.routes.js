const express = require("express");
const passport = require("passport");
const asyncHandler = require("../utils/asyncHandler");
const { googleCallback } = require("../controllers/auth.controller");

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login.html?oauth=error"
  }),
  asyncHandler(googleCallback)
);

module.exports = router;
