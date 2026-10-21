
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const chatWithAI = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // Validate the current question.
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "A valid message is required.",
      });
    }

    // Validate and limit the previous conversation.
    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (item) =>
              item &&
              ["user", "model"].includes(item.role) &&
              typeof item.text === "string" &&
              item.text.trim()
          )
          .slice(-10)
      : [];

    // Convert history to Gemini's expected format.
    const contents = safeHistory.map((item) => ({
      role: item.role,
      parts: [{ text: item.text }],
    }));

    // Add the latest question.
    contents.push({
      role: "user",
      parts: [{ text: message.trim() }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",

      contents,

      config: {
        systemInstruction: `
You are CollabNotes AI, a helpful assistant for beginners.

CONVERSATION RULES:
- Always read previous messages before answering.
- Use conversation history to understand follow-up questions.
- Words such as "it", "its", "they", and "that" can refer
  to topics discussed earlier.
- If the user asks "What are its advantages?" after
  discussing React, explain the advantages of React.
- Do not ask users to repeat information that is already
  clear from the conversation.
- Ask for clarification only when the topic is genuinely
  unclear from the available context.

RESPONSE RULES:
- Use simple English.
- Give short, clear answers.
- Explain concepts with examples when helpful.
- Provide small code examples when requested.
- Avoid unnecessary details.
`,
        maxOutputTokens: 500,
      },
    });

    const reply = response.text;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        message: "The AI returned an empty response.",
      });
    }

    return res.json({ reply });
  
} catch (error) {
    console.error("AI CHAT ERROR:", error);

    if (error.status === 429) {
        return res.status(429).json({
            message:
                "Gemini API daily quota exceeded. Please try again after your quota resets.",
        });
    }

    if (error.status === 503) {
        return res.status(503).json({
            message:
                "Gemini is temporarily busy. Please try again later.",
        });
    }

    return res.status(500).json({
        message: "AI chat failed. Please try again.",
    });
}

};

module.exports = { chatWithAI };
