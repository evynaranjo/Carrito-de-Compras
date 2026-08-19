const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      minlength: 6,
      select: false
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    avatar: {
      type: String,
      default: ""
    },
    authProvider: {
      type: String,
      enum: ["local", "google", "both"],
      default: "local"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model("User", userSchema);
