const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const { cloudinary } = require("../config/cloudinary");

// ==================== DASHBOARD ====================

// @desc  Admin dashboard stats
// @route GET /api/admin/dashboard
const getDashboardStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments({ role: "user" });

    const revenueResult = await Order.aggregate([
      { $match: { orderStatus: { $nin: ["cancelled"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Recent 5 orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "name email");

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]);

    // Revenue last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyRevenue = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, orderStatus: { $nin: ["cancelled"] } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Low stock products
    const lowStock = await Product.find({ stock: { $lte: 5 }, isActive: true })
      .select("name stock")
      .limit(5);

    res.status(200).json({
      success: true,
      stats: { totalOrders, totalProducts, totalUsers, totalRevenue },
      recentOrders,
      ordersByStatus,
      dailyRevenue,
      lowStock,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== PRODUCTS ====================

// @desc  Get all products (including inactive)
// @route GET /api/admin/products
const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;
    let query = {};
    if (search) query.$text = { $search: search };
    if (category) query.category = category;
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      products,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Create product
// @route POST /api/admin/products
const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      category,
      rating,
      review,
      unit,
      brand,
      stock,
      size,
      isFeatured,
    } = req.body;

    const images = req.files
      ? req.files.map((file) => ({
          url: file.path,
          publicId: file.filename,
        }))
      : [];

    const product = await Product.create({
      name,
      description,
      price: Number(price),
      discountPrice: Number(discountPrice) || 0,
      category,
      rating: Number(rating) || 0,
      review: Number(review) || 0,
      unit: unit || "piece",
      brand: brand || "",
      stock:Number(stock),
      size: size
        ? size.split(",").map((s) => s.trim())
        : [],
      images,
      isFeatured: isFeatured === "true",
    });

    res.status(201).json({
      success: true,
      message: "Product created",
      product,
    });
  } catch (error) {
    console.log("CREATE PRODUCT ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc  Update product
// @route PUT /api/admin/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const updates = req.body;
    if (updates.price) updates.price = Number(updates.price);
    if (updates.discountPrice) updates.discountPrice = Number(updates.discountPrice);
    if (updates.stock) updates.stock = Number(updates.stock);
    if (updates.tags && typeof updates.tags === "string") updates.tags = JSON.parse(updates.tags);

    // New images uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((f) => ({ url: f.path, publicId: f.filename }));
      updates.images = [...(product.images || []), ...newImages];
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.status(200).json({ success: true, message: "Product updated", product: updatedProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete product image from Cloudinary
// @route DELETE /api/admin/products/:id/image/:publicId
const deleteProductImage = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    const publicId = decodeURIComponent(req.params.publicId);
    await cloudinary.uploader.destroy(publicId);

    product.images = product.images.filter((img) => img.publicId !== publicId);
    await product.save();

    res.status(200).json({ success: true, message: "Image deleted", product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Toggle product active status
// @route PATCH /api/admin/products/:id/toggle
const toggleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    product.isActive = !product.isActive;
    await product.save();

    res.status(200).json({ success: true, message: `Product ${product.isActive ? "activated" : "deactivated"}`, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Delete product permanently
// @route DELETE /api/admin/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    // Delete images from Cloudinary
    for (const img of product.images) {
      if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
    }

    await product.deleteOne();
    res.status(200).json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ORDERS ====================

// @desc  Get all orders
// @route GET /api/admin/orders
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus, search } = req.query;
    let query = {};
    if (status) query.orderStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) {
      query.$or = [
        { "shippingAddress.name": { $regex: search, $options: "i" } },
        { "shippingAddress.phone": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("user", "name email");

    res.status(200).json({
      success: true,
      orders,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Get single order (admin)
// @route GET /api/admin/orders/:id
const getAdminOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email phone");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Update order status
// @route PATCH /api/admin/orders/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, paymentStatus, note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (orderStatus) {
      order.orderStatus = orderStatus;
      order.statusHistory.push({ status: orderStatus, note: note || "" });
    }
    if (paymentStatus) order.paymentStatus = paymentStatus;

    // Order cancel হলে stock ফিরিয়ে দাও
    if (orderStatus === "cancelled") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }
    }

    await order.save();
    res.status(200).json({ success: true, message: "Order updated", order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== USERS ====================

// @desc  Get all users
// @route GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    let query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
    if (role) query.role = role;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query).select("-firebaseUid").sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

    res.status(200).json({
      success: true,
      users,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc  Change user role
// @route PATCH /api/admin/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-firebaseUid");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, message: "Role updated", user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProductImage,
  toggleProduct,
  deleteProduct,
  getAllOrders,
  getAdminOrder,
  updateOrderStatus,
  getAllUsers,
  updateUserRole,
};