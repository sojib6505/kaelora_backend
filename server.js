const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

// DB connect
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log(" CART ROUTES LOADED");
// Routes
app.use("/api/auth", require("./routes/Authroutes"));
app.use("/api/products", require("./routes/Productroutes"));
app.use("/api/cart", require("./routes/Cartroutes"));
app.use("/api/orders", require("./routes/Orderroutes"));
app.use("/api/admin", require("./routes/Adminroutes"));
app.use("/api/banners", require("./routes/bannerRoutes"));
app.use("/api/chat", require("./routes/Chatroutes"));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/", (req, res) => {
  res.json({ message: "E-Commerce API is running!" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Server Error", error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));