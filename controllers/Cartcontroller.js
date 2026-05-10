const Cart = require("../models/Cart");
const Product = require("../models/Product");

// @desc  Get user's cart
// @route GET /api/cart
// @access Private
const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product", "name images price stock isActive");

    if (!cart) {
      return res.status(200).json({ success: true, cart: { items: [], totalPrice: 0 } });
    }

    res.status(200).json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Add item to cart (or update quantity)
// @route POST /api/cart
// @access Private
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    if (product.stock < quantity) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    const existingItem = cart.items.find((item) => item.product.toString() === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
        price: product.discountPrice > 0 ? product.discountPrice : product.price,
      });
    }

    await cart.save();
    await cart.populate("items.product", "name images price stock");

    res.status(200).json({ success: true, message: "Added to cart", cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update cart item quantity
// @route PUT /api/cart/update
// @access Private
const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    const item = cart.items.find((item) => item.product.toString() === productId);
    if (!item) return res.status(404).json({ success: false, message: "Item not in cart" });

    item.quantity = quantity;
    await cart.save();
    await cart.populate("items.product", "name images price stock");

    res.status(200).json({ success: true, message: "Cart updated", cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Remove item from cart
// @route DELETE /api/cart/remove/:productId
// @access Private
const removeFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    cart.items = cart.items.filter((item) => item.product.toString() !== req.params.productId);
    await cart.save();

    res.status(200).json({ success: true, message: "Item removed", cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Clear entire cart
// @route DELETE /api/cart/clear
// @access Private
const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    res.status(200).json({ success: true, message: "Cart cleared" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Sync guest cart (localStorage) to DB cart on login
// @route POST /api/cart/sync
// @access Private
const syncCart = async (req, res) => {
  try {
    const { items } = req.body; // Guest cart items from localStorage: [{productId, quantity}]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "No items to sync" });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    for (const guestItem of items) {
      const product = await Product.findOne({ _id: guestItem.productId, isActive: true });
      if (!product) continue;

      const existing = cart.items.find((i) => i.product.toString() === guestItem.productId);
      if (existing) {
        // Keep whichever is larger, or merge - guest quantity add 
        existing.quantity = Math.max(existing.quantity, guestItem.quantity);
      } else {
        cart.items.push({
          product: guestItem.productId,
          quantity: guestItem.quantity,
          price: product.discountPrice > 0 ? product.discountPrice : product.price,
        });
      }
    }

    await cart.save();
    await cart.populate("items.product", "name images price stock");

    res.status(200).json({ success: true, message: "Cart synced", cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart, syncCart };