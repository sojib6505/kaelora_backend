const User = require("../models/User");
const admin = require("../config/Firebase");

// @desc  Firebase login user MongoDB save 
// @route POST /api/auth/login
// @access Public (Firebase token required)
const loginOrRegister = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    const { uid, name, email, picture } = decodedToken;

    // User already exists?
    let user = await User.findOne({ firebaseUid: uid });

    if (!user) {
      // New user - create in MongoDB
      user = await User.create({
        firebaseUid: uid,
        name: name || email.split("@")[0],
        email,
        photoURL: picture || "",
      });
    } else {
      // Existing user - update name/photo if changed
      user.name = name || user.name;
      user.photoURL = picture || user.photoURL;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: user.isNew ? "User registered" : "User logged in",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        photoURL: user.photoURL,
        role: user.role,
        phone: user.phone,
        address: user.address,
      },
    });
  }  catch (error) {
    console.error("FULL ERROR:", error.stack || error); 
    res.status(401).json({ success: false, message: "Invalid Firebase token", error: error.message });
  }
};

// @desc  Current user profile
// @route GET /api/auth/me
// @access Private
const getMe = async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

// @desc  Update profile (phone, address)
// @route PUT /api/auth/profile
// @access Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const user = req.user;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = { ...user.address, ...address };

    await user.save();

    res.status(200).json({ success: true, message: "Profile updated", user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { loginOrRegister, getMe, updateProfile };