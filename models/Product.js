const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: 0 },
    category: { type: String, required: true },
    subCategory: { type: String, default: "" },
    images: [{ url: String, publicId: String }],
    stock: { type: Number, required: true, default: 0 },
    unit: { type: String, default: "piece" }, 
    brand: { type: String, default: "" },
    size: [String],
    rating: {
      type: Number,
      default: 0,
    },
    review: {
      type: Number,
      default: 0,
    },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Text search index
productSchema.index({ name: "text", description: "text", size: "text" });

module.exports = mongoose.model("Product", productSchema);
