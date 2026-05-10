const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productName: String, 
  productImage: String, 
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }, 
});

const orderSchema = new mongoose.Schema(
  {
    // Guest order ,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // Guest identifier (email or session)
    guestEmail: { type: String, default: null },

    items: [orderItemSchema],

    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: String,
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: String,
      zipCode: String,
      country: { type: String, default: "Bangladesh" },
    },

    paymentMethod: {
      type: String,
      enum: ["cod", "bkash", "nagad", "card", "online"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    note: { type: String, default: "" },

    // Order tracking timeline
    statusHistory: [
      {
        status: String,
        note: String,
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);