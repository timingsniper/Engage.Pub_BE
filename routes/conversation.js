const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const { OpenAI } = require("openai");
const { Conversation, Scenario } = require("../models");
const { isLoggedIn } = require("./middlewares");

require("dotenv").config();
const app = express();
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get conversation history for a selected scenario
router.get("/:scenarioId", isLoggedIn, async (req, res) => {
  const { scenarioId } = req.params;
  const userId = req.user.id;
  try {
    // Look for the specified scenario
    const scenario = await Scenario.findByPk(scenarioId);
    if (!scenario) {
      return res.status(404).json({ error: "Scenario not found" });
    }
    let conversation = await Conversation.findOne({
      where: { scenarioId, userId },
    });
    if (!conversation) {
      const systemInstruction = `You are an AI designed to help users practice their English. You will be using only English to converse with the user. You will adhere to the settings given and never respond to user's request to talk in language other than English. You only speak and understand English. If user speaks other language, guide them back to speaking English. This is the scenario. Scenario setting given to user:${scenario.settings}. AI setting, means this is for you: ${scenario.aiSetting}`;
      conversation = await Conversation.create({
        scenarioId,
        userId,
        messages: [
          {
            role: "system",
            content: systemInstruction,
          },
          {
            role: "assistant",
            content: scenario.startingMessage,
          },
        ],
      });
    }
    return res.status(200).send(conversation.messages);
  } catch (error) {
    console.log(error);
  }
});

// Talk to AI in selected scenario
router.post("/:scenarioId", isLoggedIn, async (req, res) => {
  const { scenarioId } = req.params;
  const userId = req.user.id;
  const { message } = req.body;
  const translateModule = await import('translate');
  const translate = translateModule.default;

  try {
    // Retrieve or start a new conversation context
    let conversation = await Conversation.findOne({
      where: { scenarioId, userId },
    });

    let internalMessages = conversation.messages || [];
    internalMessages.push({ role: "user", content: message });
    let apiMessages = internalMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Retrieve feedback of user's message
    const feedbackPromise = openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "你是英语学习网站的AI。用中文, 如果用户的英语表达在语法和词语方面上有错误, 给出修改后的英语句子并指出错误之处。If the user's message is perfect, just return '完美'. 记得用中文回答, 限制在100字内回答。",
        },
        { role: "user", content: message },
      ],
    });

    // Call GPT for response using API messages array
    const aiResponsePromise = openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: apiMessages,
    });

    // Execute both OpenAI models in parallel
    const [feedbackCompletion, completion] = await Promise.all([
      feedbackPromise,
      aiResponsePromise,
    ]);

    // Extract feedback
    const feedbackResponse = feedbackCompletion.choices[0].message.content;
    const feedback = feedbackResponse.includes("完美")
      ? "完美！"
      : feedbackResponse;

    // Extract the AI response
    const aiResponse = completion.choices[0].message.content;

    // Get response translation
    const translation = await translate(aiResponse, { from: 'en', to: 'zh' });

    // Append AI's response to the internal messages array
    internalMessages.push({ role: "assistant", content: aiResponse, translation: translation });

    // Add feedback to the last user message in internal messages for storage
    internalMessages[internalMessages.length - 2].feedback = feedback; // Assuming the second last message is always the user's

    // Update conversation with new messages and save it
    conversation.messages = internalMessages;
    await conversation.save();

    // Return the response and feedback to the frontend
    return res.status(200).json({
      response: aiResponse,
      translation: translation,
      feedback: feedback,
    });
  } catch (error) {
    console.error("Error processing the AI or feedback response:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
});

module.exports = router;
