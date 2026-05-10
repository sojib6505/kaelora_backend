const express = require("express");
const router = express.Router();
const { adminOnly } = require("../middleware/Adminauth");
const Banner = require("../models/Banner");
const { uploadProduct } = require("../config/Cloudinary");
const {
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
} = require("../controllers/adminController");

// All admin routes protected
router.use(adminOnly);

// Dashboard
router.get("/dashboard", getDashboardStats);

// Products
router.get("/products", getAllProducts);
router.post("/products", uploadProduct.array("images", 5), createProduct); // max 5 images
router.put("/products/:id", uploadProduct.array("images", 5), updateProduct);
router.delete("/products/:id/image/:publicId", deleteProductImage);
router.patch("/products/:id/toggle", toggleProduct);
router.delete("/products/:id", deleteProduct);

// Orders
router.get("/orders", getAllOrders);
router.get("/orders/:id", getAdminOrder);
router.patch("/orders/:id/status", updateOrderStatus);

// Users
router.get("/users", getAllUsers);
router.patch("/users/:id/role", updateUserRole);

// Banners
router.get("/banners", async (req, res) => {
  const banners = await Banner.find().sort({ order: 1 });
  res.json({ success: true, banners });
});

router.post("/banners", uploadProduct.single("image"), async (req, res) => {
  try {
    const { button, redirectLink, order } = req.body;
    const banner = await Banner.create({
      image: { url: req.file.path, publicId: req.file.filename },
      button,
      redirectLink,
      order: Number(order) || 0,
    });
    res.status(201).json({ success: true, banner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/banners/:id", async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (banner?.image?.publicId) {
      const { cloudinary } = require("../config/Cloudinary");
      await cloudinary.uploader.destroy(banner.image.publicId);
    }
    await banner.deleteOne();
    res.json({ success: true, message: "Banner deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/banners/:id/toggle", async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  banner.isActive = !banner.isActive;
  await banner.save();
  res.json({ success: true, banner });
});

module.exports = router;
