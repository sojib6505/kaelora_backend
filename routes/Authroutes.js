const express = require("express");
const router = express.Router();
const { loginOrRegister, getMe, updateProfile } = require("../controllers/Authcontroller");
const { protect } = require("../middleware/Auth");

router.post("/login", loginOrRegister);           // Firebase login/register
router.get("/me", protect, getMe);                // Get current user
router.put("/profile", protect, updateProfile);   // Update profile

module.exports = router;