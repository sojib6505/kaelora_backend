const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    image: { url: String, publicId: String },
    button: { type: String, default: "Shop Now" },
    redirectLink: { type: String, default: "/shop" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);