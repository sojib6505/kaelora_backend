const express = require("express");
const axios = require("axios");
const https = require("https");
const Product = require("../models/Product");

const router = express.Router();

// Keep-alive বন্ধ রাখা হচ্ছে যাতে fresh connection ব্যবহার হয় (ECONNRESET এড়াতে)
const httpsAgent = new https.Agent({ keepAlive: false });

// Groq কে call করার helper function, ECONNRESET হলে ১ বার retry করবে
const callGroq = async (messages, retries = 1) => {
  try {
    return await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        httpsAgent,
        timeout: 15000,
      }
    );
  } catch (err) {
    if (retries > 0 && err.code === "ECONNRESET") {
      console.log("Retrying Groq request due to ECONNRESET...");
      return callGroq(messages, retries - 1);
    }
    throw err;
  }
};

router.post("/", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    // সব product data আনো (১৫-২০টা হওয়ায় সবগুলো একসাথে পাঠানো নিরাপদ)
    const products = await Product.find({}).select("name price description category stock");

    const productContext = products
      .map(
        (p) =>
          `- ${p.name}: ৳${p.price}, ${p.description}, Category: ${p.category}, Stock: ${
            p.stock > 0 ? "Available" : "Out of stock"
          }`
      )
      .join("\n");

    const systemInstruction = `তুমি একটা e-commerce শপের customer support assistant। 
নিচের product list ব্যবহার করে customer এর প্রশ্নের উত্তর দাও বাংলায় (বা customer যে ভাষায় জিজ্ঞেস করে সেই ভাষায়)।
Product list:
${productContext}

যদি customer এমন কিছু জিজ্ঞেস করে যা list এ নাই, তাহলে বলো এই product আমাদের কাছে নাই, তবে similar কিছু suggest করো যদি থাকে।
Friendly এবং helpful tone রাখো।`;

    const messages = [
      { role: "system", content: systemInstruction },
      ...history.map((h) => ({
        role: h.role === "user" ? "user" : "assistant",
        content: h.text,
      })),
      { role: "user", content: message },
    ];

    const groqResponse = await callGroq(messages);

    const reply =
      groqResponse.data.choices?.[0]?.message?.content || "দুঃখিত, উত্তর দিতে পারলাম না।";

    res.json({ success: true, reply });
  } catch (error) {
    console.error("Chat error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
});

module.exports = router;