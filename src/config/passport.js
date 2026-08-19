const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

function configurePassport() {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    throw new Error(
      "Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_CALLBACK_URL en .env"
    );
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const avatar = profile.photos?.[0]?.value || "";

          if (!email) {
            return done(new Error("Google no devolvió un correo electrónico."));
          }

          let user = await User.findOne({
            $or: [{ googleId: profile.id }, { email }]
          }).select("+password");

          if (!user) {
            user = await User.create({
              nombre: profile.displayName || "Usuario Google",
              email,
              googleId: profile.id,
              avatar,
              authProvider: "google"
            });
          } else {
            let changed = false;

            if (!user.googleId) {
              user.googleId = profile.id;
              changed = true;
            }

            if (!user.avatar && avatar) {
              user.avatar = avatar;
              changed = true;
            }

            if (user.password && user.authProvider === "local") {
              user.authProvider = "both";
              changed = true;
            } else if (!user.password && user.authProvider !== "google") {
              user.authProvider = "google";
              changed = true;
            }

            if (changed) {
              await user.save();
            }
          }

          // Guardamos el accessToken dentro de req.user para que el callback
          // pueda entregarlo al frontend. El carrito acepta JWT o access token OAuth.
          return done(null, { user, accessToken });
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  return passport;
}

module.exports = configurePassport;
