const admin = require("../config/Firebase");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found in database" });
    }

    req.user = user;
    req.firebaseUser = decodedToken;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid Firebase token", error: error.message });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (user) {
      req.user = user;
      req.firebaseUser = decodedToken;
    }
    return next();
  } catch (error) {
    return next();
  }
};

module.exports = { protect, optionalAuth };