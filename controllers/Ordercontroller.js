const Order = require("../models/Order");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const mongoose = require("mongoose");
const sendOrderNotificationToAdmin = require("../utils/sendWhatsApp");

// @desc  Place an order (logged in or guest)
// @route POST /api/orders
// @access Public (optional auth)
const placeOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, note } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No items in order" });
    }

    // ============================================================
    // 1-HOUR DUPLICATE PRODUCT ORDER CHECK
    // ============================================================
    if (req.user) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      for (const item of items) {
        const recentOrder = await Order.findOne({
          user: req.user._id,
          "items.product": new mongoose.Types.ObjectId(item.productId),
          createdAt: { $gte: oneHourAgo },
          orderStatus: { $nin: ["cancelled"] },
        });

        if (recentOrder) {
          const product = await Product.findById(item.productId);
          return res.status(429).json({
            success: false,
            message: `আপনি "${product?.name || "এই প্রোডাক্ট"}" ১ ঘন্টার মধ্যে ইতিমধ্যে অর্ডার করেছেন। অনুগ্রহ করে পরে চেষ্টা করুন।`,
            productId: item.productId,
            retryAfter: recentOrder.createdAt.getTime() + 60 * 60 * 1000,
          });
        }
      }
    }

    // Build order items with price snapshot
    let orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findOne({
        _id: item.productId,
        isActive: true,
      });
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`,
        });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `"${product.name}" এর পর্যাপ্ত স্টক নেই`,
        });
      }

      const itemPrice =
        product.discountPrice > 0 ? product.discountPrice : product.price;
      subtotal += itemPrice * item.quantity;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.images?.[0]?.url || "",
        quantity: item.quantity,
        price: itemPrice,
      });

      product.stock -= item.quantity;
      await product.save();
    }

    const shippingCost = Number(req.body.shippingCost) || 0;
    const totalAmount = subtotal + shippingCost;

    const order = await Order.create({
      user: req.user ? req.user._id : null,
      guestEmail: req.user ? null : shippingAddress.email,
      items: orderItems,
      shippingAddress,
      paymentMethod: paymentMethod || "cod",
      subtotal,
      shippingCost,
      totalAmount,
      note: note || "",
      statusHistory: [{ status: "pending", note: "Order placed" }],
    });

    // 👇 WhatsApp notification — এখানে একবারই কল হচ্ছে
    sendOrderNotificationToAdmin(order);

    if (req.user) {
      await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
    }

    res
      .status(201)
      .json({ success: true, message: "Order placed successfully!", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get logged-in user's orders
// @route GET /api/orders/my
// @access Private
const getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { user: req.user._id };
    if (status) query.orderStatus = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get single order (owner or admin)
// @route GET /api/orders/:id
// @access Private
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email",
    );

    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    // Owner or admin check
    if (
      req.user.role !== "admin" &&
      order.user?.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Track order by ID (guest can track with order ID)
// @route GET /api/orders/track/:id
// @access Public
const trackOrder = async (req, res) => {
  console.log("TRACK HIT", req.params.id);
  try {
    const order = await Order.findById(req.params.id).select(
      "orderStatus paymentStatus statusHistory shippingAddress items createdAt totalAmount subtotal shippingCost paymentMethod",
    );
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Track order by phone number (guest)
// @route GET /api/orders/phone/:phone
// @access Public
const trackByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    const orders = await Order.find({
      "shippingAddress.phone": phone,
    })
      .select(
        "orderStatus paymentStatus shippingAddress items createdAt totalAmount subtotal shippingCost paymentMethod statusHistory",
      )
      .sort({ createdAt: -1 })
      .limit(10);

    if (!orders.length) {
      return res.status(404).json({
        success: false,
        message: "এই নম্বরে কোনো অর্ডার পাওয়া যায়নি",
      });
    }

    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getOrder,
  trackOrder,
  trackByPhone,
};
