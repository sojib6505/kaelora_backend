const express = require("express");
const router = express.Router();
const { placeOrder, getMyOrders, getOrder, trackOrder ,trackByPhone} = require("../controllers/Ordercontroller");
const { protect, optionalAuth } = require("../middleware/Auth");

router.post("/", optionalAuth, placeOrder);
router.get("/my", protect, getMyOrders);
router.get("/track/:id", trackOrder);
router.get("/:id", protect, getOrder);
router.get("/phone/:phone", trackByPhone);

module.exports = router;