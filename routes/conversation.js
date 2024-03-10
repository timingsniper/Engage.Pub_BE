const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const { OpenAI } = require("openai");
const { Conversation } = require("../models");
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
  const { userId } = req.body;
  try {
    let conversation = await Conversation.findOne({
      where: { scenarioId, userId },
    });
    if (!conversation) {
      return res
        .status(404)
        .send("No conversation record found for this scenario.");
    }
    return res.status(200).send(conversation.messages);
  } catch (error) {
    console.log(error);
  }
});

// Talk to AI in selected scenario
router.post("/:scenarioId", isLoggedIn, async (req, res) => {
  const { scenarioId } = req.params;
  const { userId, message } = req.body;
  try {
    // Retrieve or start a new conversation context
    let conversation = await Conversation.findOne({
      where: { scenarioId, userId },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        scenarioId,
        userId,
        messages: [
          {
            role: "system",
            content:
              "You are a worker at Mcdonalds. The user will approach you as a customer. Help out the user.",
          },
        ],
      });
    }

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
