// src/controllers/conversationController.js
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const LLM = require("../services/llmService");

const DEFAULT_PAGE_SIZE = 20;

/**
 * Create a new conversation + initial user message + assistant reply (via LLM).
 * Body: { user_email, first_message, mode?, documentRefs? }
 * user_email is mandatory and must exist in Users collection.
 */
async function createConversation(req, res, next) {
  try {
    const { user_email, first_message, mode = "open", documentRefs = [] } = req.body;

    if (!user_email || typeof user_email !== "string") {
      return res.status(400).json({ error: "user_email is required" });
    }
    if (!first_message || typeof first_message !== "string" || !first_message.trim()) {
      return res.status(400).json({ error: "first_message is required and must be a non-empty string" });
    }

    // Find user by email
    const user = await User.findOne({ email: user_email.toLowerCase().trim() }).lean();
    if (!user) {
      return res.status(400).json({ error: "user not found for provided email" });
    }

    const userObjectId = new mongoose.Types.ObjectId(user._id);

    // Create conversation
    const conv = await Conversation.create({
      userId: userObjectId,
      mode,
      documentRefs,
      title: first_message.slice(0, 80),
    });

    // Create user message
    const userMsg = await Message.create({
      conversationId: conv._id,
      role: "user",
      text: first_message,
      tokens: 0,
    });

    // Call LLM
    let llmResp;
    try {
      llmResp = await LLM.callModel({
        conversationId: conv._id,
        messages: [{ role: "user", text: first_message }],
        mode,
        documentRefs,
      });
    } catch (err) {
      console.error("LLM.callModel threw:", err);
      llmResp = {
        text: "Sorry, I'm having trouble reaching the model right now. Please try again later.",
        meta: { error: true },
      };
    }

    // Save assistant response
    const assistantMsg = await Message.create({
      conversationId: conv._id,
      role: "assistant",
      text: llmResp?.text || "Sorry, no response.",
      meta: llmResp?.meta || {},
      tokens: llmResp?.meta?.tokensEstimate || 0,
    });

    // Return created conversation and messages
    return res.status(201).json({
      conversation: conv.toObject ? conv.toObject() : conv,
      messages: [userMsg, assistantMsg],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List conversations (paginated, global)
 * Query params: ?page=1&limit=20
 */
async function listConversations(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, parseInt(req.query.limit || String(DEFAULT_PAGE_SIZE), 10));
    const skip = (page - 1) * limit;

    const filter = { state: { $ne: "deleted" } };

    const [items, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(filter),
    ]);

    const hasMore = skip + items.length < total;

    res.json({ page, limit, total, hasMore, items });
  } catch (err) {
    next(err);
  }
}

/**
 * List all conversations for a given user email
 * GET /conversations/user/:email
 */
async function listConversationsForUser(req, res, next) {
  try {
    const email = req.params.email;
    if (!email || typeof email !== "string") return res.status(400).json({ error: "email required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    if (!user) return res.status(404).json({ error: "user not found" });

    const items = await Conversation.find({ userId: user._id, state: { $ne: "deleted" } })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ user: { _id: user._id, email: user.email }, total: items.length, items });
  } catch (err) {
    next(err);
  }
}

/**
 * Get a conversation with its messages.
 * Requires query param: ?user_email=...
 * Only returns if the user_email corresponds to the conversation owner.
 */
async function getConversation(req, res, next) {
  try {
    const { id } = req.params;
    const user_email = req.query.user_email;

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid conversation id" });
    if (!user_email || typeof user_email !== "string") return res.status(400).json({ error: "user_email query param is required" });

    const user = await User.findOne({ email: user_email.toLowerCase().trim() }).lean();
    if (!user) return res.status(404).json({ error: "user not found" });

    const conv = await Conversation.findById(id).lean();
    if (!conv) return res.status(404).json({ error: "conversation not found" });

    // Verify ownership
    if (!conv.userId || String(conv.userId) !== String(user._id)) {
      return res.status(403).json({ error: "forbidden: user does not own this conversation" });
    }

    const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 }).lean();

    res.json({ conversation: conv, messages });
  } catch (err) {
    next(err);
  }
}

/**
 * Add a message to an existing conversation and get assistant reply.
 * Body: { user_email, role?, text }
 * Verifies that the user_email owns the conversation.
 */
async function addMessage(req, res, next) {
  try {
    const { id } = req.params;
    const { user_email, role = "user", text } = req.body;

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid conversation id" });
    if (!user_email || typeof user_email !== "string") return res.status(400).json({ error: "user_email is required" });
    if (!text || typeof text !== "string" || !text.trim()) return res.status(400).json({ error: "text is required and must be non-empty" });
    if (!["user", "assistant", "system"].includes(role)) return res.status(400).json({ error: "role must be one of user|assistant|system" });

    const user = await User.findOne({ email: user_email.toLowerCase().trim() }).lean();
    if (!user) return res.status(404).json({ error: "user not found" });

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ error: "conversation not found" });

    // Verify ownership
    if (!conv.userId || String(conv.userId) !== String(user._id)) {
      return res.status(403).json({ error: "forbidden: user does not own this conversation" });
    }

    // Create message from caller
    const msg = await Message.create({
      conversationId: conv._id,
      role,
      text,
    });

    // Build context for LLM: latest N messages (sliding window)
    const recent = await Message.find({ conversationId: conv._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const messagesForLLM = recent.reverse().map((m) => ({ role: m.role, text: m.text }));

    // Ensure the new message is in the context
    if (!messagesForLLM.length || messagesForLLM[messagesForLLM.length - 1].text !== text) {
      messagesForLLM.push({ role, text });
    }

    // Call LLM
    let llmResp;
    try {
      llmResp = await LLM.callModel({
        conversationId: conv._id,
        messages: messagesForLLM,
        mode: conv.mode,
        documentRefs: conv.documentRefs || [],
      });
    } catch (err) {
      console.error("LLM.callModel threw in addMessage:", err);
      llmResp = {
        text: "Sorry, I'm having trouble reaching the model right now. Please try again later.",
        meta: { error: true },
      };
    }

    // Save assistant response
    const assistantMsg = await Message.create({
      conversationId: conv._id,
      role: "assistant",
      text: llmResp?.text || "Sorry, no response.",
      meta: llmResp?.meta || {},
      tokens: llmResp?.meta?.tokensEstimate || 0,
    });

    // Touch updatedAt
    conv.updatedAt = new Date();
    await conv.save();

    res.status(201).json({ messages: [msg, assistantMsg] });
  } catch (err) {
    next(err);
  }
}

/**
 * Soft-delete conversation (mark state=deleted).
 * Only owner can delete — requires body.user_email (or could be query param).
 */
async function deleteConversation(req, res, next) {
  try {
    const { id } = req.params;
    const { user_email } = req.body;

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "Invalid conversation id" });
    if (!user_email || typeof user_email !== "string") return res.status(400).json({ error: "user_email is required" });

    const user = await User.findOne({ email: user_email.toLowerCase().trim() }).lean();
    if (!user) return res.status(404).json({ error: "user not found" });

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ error: "conversation not found" });

    if (!conv.userId || String(conv.userId) !== String(user._id)) {
      return res.status(403).json({ error: "forbidden: user does not own this conversation" });
    }

    conv.state = "deleted";
    await conv.save();

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createConversation,
  listConversations,
  listConversationsForUser,
  getConversation,
  addMessage,
  deleteConversation,
};
