const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    photoURL: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    phone: { type: String, default: "" },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: "Bangladesh" },
    },
  },
  { timestamps: true }
);

// Auto-assign admin role based on .env ADMIN_EMAILS
userSchema.pre("save", async function () {
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim());

  if (adminEmails.includes(this.email)) {
    this.role = "admin";
  }
});

module.exports = mongoose.model("User", userSchema);