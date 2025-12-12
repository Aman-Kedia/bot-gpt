// src/controllers/userController.js
const User = require("../models/User");

async function createUser(req, res, next) {
  try {
    const { name, email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "email is required" });
    }
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail }).lean();
    if (existing) {
      return res.status(409).json({ error: "user already exists", user: existing });
    }

    const user = await User.create({
      name: name || null,
      email: normalizedEmail,
    });

    return res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (err) {
    next(err);
  }
}

async function getUserByEmail(req, res, next) {
  try {
    const email = req.params.email;
    if (!email) return res.status(400).json({ error: "email required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    if (!user) return res.status(404).json({ error: "user not found" });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { createUser, getUserByEmail };
