const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const { Message, Conversation } = require("../models");
const { isLoggedIn } = require("./middlewares");

require("dotenv").config();
const app = express();
app.use(bodyParser.json());

// Add new message to expressions
router.post("/", isLoggedIn, async (req, res) => {
  const userId = req.user.id;
  const { scenarioId, role, content, translation } = req.body;

  try {
    // Validate input
    if (!userId || !scenarioId || !role || !content) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Find the conversation by scenarioId and userId
    const conversation = await Conversation.findOne({
      where: {
        scenarioId: scenarioId,
        userId: userId,
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Parse the messages, find the message to update, and set its 'saved' property
    const messages = conversation.messages;

    const messageIndex = messages.findIndex(
      (m) => m.content === content && m.role === "assistant"
    );

    if (messageIndex === -1) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Toggle the saved status
    if (messages[messageIndex].saved) {
      // If message is saved, delete it from Message table and set saved to false
      await Message.destroy({
        where: {
          userId: userId,
          content: content,
        },
      });
      messages[messageIndex].saved = false;
    } else {
      // If message is not saved, create it in the Message table and set saved to true
      await Message.create({
        userId,
        scenarioId,
        role: role,
        content: content,
        translation: translation,
      });
      messages[messageIndex].saved = true;
    }

    // Save the updated messages array back to the conversation
    conversation.messages = messages;
    await conversation.save();

    // Respond with the created message and a success status
    return res.status(201).json({
      message: "Message saved/deleted successfully",
      data: messages[messageIndex],
    });
  } catch (error) {
    console.error("Failed to create message:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.get("/", isLoggedIn, async (req, res) => {
  const userId = req.user.id;

  try {
    // Find all saved messages for the user
    const messages = await Message.findAll({
      where: {
        userId: userId,
      },
    });

    return res.status(200).json({
      messages,
    });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.delete("/:messageId", isLoggedIn, async (req, res) => {
  const { messageId } = req.params;

  try {
    // Find the message
    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Delete the message
    await message.destroy();
    return res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Failed to delete message:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

module.exports = router;
