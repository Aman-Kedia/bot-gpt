// src/routes/conversations.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/conversationController");
const mongoose = require("mongoose");

function validateObjectId(req, res, next) {
  const { id } = req.params;
  if (id && !mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid conversation ID" });
  }
  next();
}

// Create new conversation with first message (requires user_email)
router.post("/", controller.createConversation);

// List all conversations (global)
router.get("/", controller.listConversations);

// List all conversations for a specific user (by email)
router.get("/user/:email", controller.listConversationsForUser);

// Get conversation details (requires ?user_email=...)
router.get("/:id", validateObjectId, controller.getConversation);

// Add message to conversation (requires user_email in body)
router.post("/:id/messages", validateObjectId, controller.addMessage);

// Delete conversation (requires user_email in body)
router.delete("/:id", validateObjectId, controller.deleteConversation);

module.exports = router;
