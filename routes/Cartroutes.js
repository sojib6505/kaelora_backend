const express = require("express");
const router = express.Router();
const { getCart, addToCart, updateCartItem, removeFromCart, clearCart, syncCart } = require("../controllers/cartController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/", getCart);
router.post("/add", addToCart);
router.put("/update", updateCartItem);
router.delete("/remove/:productId", removeFromCart);
router.delete("/clear", clearCart);
router.post("/sync", syncCart);

module.exports = router;