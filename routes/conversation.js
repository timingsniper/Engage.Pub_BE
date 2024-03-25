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
      const systemInstruction = `You are an AI designed to help users practice their English. You will be using only English to converse with the user. You will adhere to the settings given. This is the scenario. Scenario setting given to user:${scenario.settings}. AI setting, means this is for you: ${scenario.aiSetting}`;
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
  try {
    // Retrieve or start a new conversation context
    let conversation = await Conversation.findOne({
      where: { scenarioId, userId },
    });

    // Append the user's message to the conversation context
    let messages = conversation.messages;
    messages.push({ role: "user", content: message });

    // Call GPT for response
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
    });

    // Checking response
    console.log(completion);

    // Extract the AI response
    const aiResponse = completion.choices[0].message.content;

    // Append AI's response to the conversation context
    messages.push({ role: "assistant", content: aiResponse });

    // Update conversation with new messages and save it
    conversation.messages = messages;
    await conversation.save();

    // Return the response to the frontend
    return res.status(200).json({
      response: aiResponse,
    });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
