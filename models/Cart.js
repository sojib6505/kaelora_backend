const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  price: { type: Number, required: true }, 
});

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

// Total price virtual
cartSchema.virtual("totalPrice").get(function () {
  return this.items.reduce((total, item) => total + item.price * item.quantity, 0);
});

cartSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Cart", cartSchema);