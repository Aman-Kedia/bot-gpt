const mongoose = require("mongoose");
const { Schema } = mongoose;

const ConversationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    title: { type: String },
    mode: {
      type: String,
      enum: ["open", "grounded"],
      default: "open",
    },
    documentRefs: [{ type: String }],
    state: {
      type: String,
      enum: ["active", "archived", "deleted"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model("Conversation", ConversationSchema);
