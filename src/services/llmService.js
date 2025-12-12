// src/services/llmService.js
const axios = require("axios");

async function callModel({
  conversationId,
  messages,
  mode = "open",
  documentRefs = [],
}) {
  const providerUrl = process.env.LLM_PROVIDER_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;

  if (!providerUrl || !model) {
    return {
      text: "Model provider not configured.",
      meta: { error: "missing_provider" },
    };
  }

  // Convert your internal message format to Chat Completions format
  const chatMessages = [];

  // Add system instruction
  chatMessages.push({
    role: "system",
    content: "You are an assistant. Answer concisely.",
  });

  // Add documents (grounded mode)
  if (mode === "grounded" && documentRefs.length > 0) {
    chatMessages.push({
      role: "system",
      content: `[DOCUMENTS]\n${documentRefs.join("\n")}`,
    });
  }

  for (const m of messages) {
    chatMessages.push({
      role: m.role,
      content: m.text,
    });
  }

  try {
    const resp = await axios.post(
      providerUrl,
      {
        model: model,
        messages: chatMessages,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const choice = resp.data?.choices?.[0];
    const assistantMessage = choice?.message?.content || "";

    return {
      text: assistantMessage,
      meta: { providerResponse: resp.data },
    };
  } catch (err) {
    console.error("LLM call failed:", err?.response?.data || err?.message);

    return {
      text: "Sorry, I'm having trouble reaching the model right now.",
      meta: {
        error: true,
        details: err?.response?.data || err?.message,
      },
    };
  }
}

module.exports = { callModel };
