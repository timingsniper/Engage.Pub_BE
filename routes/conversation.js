const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const { OpenAI } = require("openai");
const { Conversation, Scenario, SharedConversation } = require("../models");
const { isLoggedIn } = require("./middlewares");
const { Sequelize, DataTypes } = require("sequelize");

require("dotenv").config();
const app = express();
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.get("/myConversations", isLoggedIn, async (req, res) => {
  const userId = req.user.id;
  try {
    let conversations = await Conversation.findAll({
      where: { userId: userId },
      include: [
        {
          model: Scenario,
          as: "Scenario",
          attributes: ["title", "imgSource"],
          required: true,
        },
      ],
      order: [["id", "DESC"]],
    });

    return res.status(200).json({
      conversations: conversations.map((conversation) => {
        return {
          id: conversation.id,
          scenarioId: conversation.scenarioId,
          goalMet: conversation.goalMet,
          scenarioTitle: conversation.Scenario
            ? conversation.Scenario.title
            : "Scenario Deleted",
          scenarioImgSource: conversation.Scenario
            ? conversation.Scenario.imgSource
            : null,
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching conversations." });
  }
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
      const systemInstruction = `You are an AI designed to help users practice their English. You will be using only English to converse with the user. You will adhere to the settings given and never respond to user's request to talk in language other than English. You only speak and understand English. If user speaks other language, guide them back to speaking English. This is the scenario. Scenario setting given to user:${scenario.settings}. AI setting, means this is for you: ${scenario.aiSetting}. Don't say you are an AI, impersonate yourself in the role and talk until the user meets the goal.`;
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
  const translateModule = await import("translate");
  const translate = translateModule.default;

  try {
    // Retrieve or start a new conversation context
    let conversation = await Conversation.findOne({
      where: { scenarioId, userId },
    });

    const scenario = await Scenario.findByPk(scenarioId);
    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found" });
    }

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
    const translation = await translate(aiResponse, { from: "en", to: "zh" });

    // Append AI's response to the internal messages array
    internalMessages.push({
      role: "assistant",
      content: aiResponse,
      translation: translation,
      saved: false,
    });

    // Add feedback to the last user message in internal messages for storage
    internalMessages[internalMessages.length - 2].feedback = feedback; // Assuming the second last message is always the user's

    // Update conversation with new messages and save it
    conversation.messages = internalMessages;
    await conversation.save();

    // Goal completion check prompt for GPT
    const prompt = `Evaluate the conversation below to determine if the goal described in the mission has been completely achieved. Focus particularly on the assistant's last message. Assess strictly whether this final response conclusively indicates that all aspects of the goal have been fully addressed. 

    Consider:
    - A response that directly states the action has been completed, or confirms that no further actions are required, should be considered as meeting the goal.
    - Responses that involve asking for further choices, clarifications, or continuing the conversation indicate the goal has not been met.
    - If less than 5 messages have been exchanged between user and assistant in the conversation, assume the goal has not been met.
    
    Return 'true' only if the entire goal is met as per the assistant's final interaction, or 'false' if any part of the goal remains unmet or unclear. For example:
    - If the mission is to order a meal and the last message from the assistant is 'Your order has been placed successfully', return 'true'.
    - If the last message is 'Would you like fries with that?', return 'false' because the transaction is not complete.
    
    Conversation:
    ${conversation.messages.map((m) => `${m.role}: ${m.content}`).join("\n")}
        
    Mission:
    ${scenario.mission}
        
    Please provide a clear 'true' or 'false' based on your assessment of the assistant's final message in relation to the mission's requirements.`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt }],
    });

    console.log(`Goal met: ${response.choices[0].message.content}`);

    // Simulate GPT-3's decision process, assuming GPT provides a boolean or a clear statement
    const goalMet = response.choices[0].message.content
      .toLowerCase()
      .includes("true");

    if (goalMet) {
      conversation.goalMet = true;
      await conversation.save();
    }

    // Return the response and feedback to the frontend
    return res.status(200).json({
      response: aiResponse,
      translation: translation,
      feedback: feedback,
      goalMet: goalMet,
    });
  } catch (error) {
    console.error("Error processing the AI or feedback response:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while processing your request." });
  }
});

// Delete or reset the conversation for a specific scenario
router.delete("/:scenarioId", isLoggedIn, async (req, res) => {
  const userId = req.user.id;
  const { scenarioId } = req.params;

  try {
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

    // Delete the conversation from the database
    await conversation.destroy();

    // Provide appropriate response based on the action taken
    return res
      .status(200)
      .json({ message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("Failed to delete or reset conversation:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Summarize the user's English performance and give study suggestions
router.post("/summary/:scenarioId", isLoggedIn, async (req, res) => {
  const userId = req.user.id;
  const { scenarioId } = req.params;

  try {
    const conversation = await Conversation.findOne({
      where: {
        scenarioId,
        userId,
      },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Prepare the prompt for summarizing English performance
    const performancePrompt = `Summarize the user's English proficiency based on the following conversation. Use simplified Chinese as the language of your answer. Focus on grammar and vocabulary usage based on the conversation:
    Conversation: ${conversation.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")}`;

    // Prepare the prompt for English study suggestions
    const suggestionPrompt = `Based on the user's English usage in the following conversation, provide detailed suggestions for further English studies based on the conversation, Use simplified Chinese as the language of your answer.:
    Conversation: ${conversation.messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")}`;

    // Create both requests in parallel
    const [performanceSummary, studySuggestions] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: performancePrompt }],
      }),
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: suggestionPrompt }],
      }),
    ]);

    // Return the summaries and suggestions as the response
    return res.status(200).json({
      performanceSummary: performanceSummary.choices[0].message.content,
      studySuggestions: studySuggestions.choices[0].message.content,
    });
  } catch (error) {
    console.error("Error generating summary or suggestions:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Endpoint to save conversation to sharedConversation table
router.post("/shared/:scenarioId", isLoggedIn, async (req, res) => {
  const userId = req.user.id;
  const { scenarioId } = req.params;
  const { title, nickname } = req.body;

  try {
    // Retrieve the active conversation for this user and scenario
    const conversation = await Conversation.findOne({
      where: { scenarioId, userId },
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Create a new shared conversation entry with the existing conversation data
    await SharedConversation.create({
      scenarioId: conversation.scenarioId,
      userId: conversation.userId,
      title: title,
      messages: conversation.messages,
      nickname: nickname,
    });

    // Respond with success message
    return res.status(201).json({
      message: "Conversation shared successfully",
    });
  } catch (error) {
    console.error("Failed to share conversation:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Endpoint to fetch all shared conversations for a specific scenario
router.get("/shared/:scenarioId", isLoggedIn, async (req, res) => {
  const userId = req.user.id;
  console.log(userId);
  const { scenarioId } = req.params;

  try {
    // Fetch all shared conversations that match the scenarioId
    const sharedConversations = await SharedConversation.findAll({
      where: { scenarioId },
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "scenarioId",
        "userId",
        "nickname",
        "title",
        [Sequelize.literal(`userId = '${userId}'`), "mine"],
      ],
    });

    if (sharedConversations.length === 0) {
      return res.status(200).json({});
    }

    // Modify each conversation object to include the 'mine' boolean
    const result = sharedConversations.map((conversation) => {
      return {
        ...conversation.toJSON(),
        mine: conversation.userId === userId.toString(), // Add 'mine' field comparing userIds
      };
    });

    // Respond with the fetched conversations
    return res.status(200).json({
      sharedConversations: result,
    });
  } catch (error) {
    console.error("Failed to fetch shared conversations:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Get selected shared conversation history
router.get("/shared/view/:convId", isLoggedIn, async (req, res) => {
  const { convId } = req.params;

  try {
    // Look for the specified conversation
    const sharedConversation = await SharedConversation.findByPk(convId);
    if (!sharedConversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    return res.status(200).send(sharedConversation.messages);
  } catch (error) {
    console.log(error);
  }
});

// DELETE endpoint to delete a specific shared conversation
router.delete("/shared/:convoId", isLoggedIn, async (req, res) => {
  const userId = req.user.id;
  const { convoId } = req.params;

  try {
    // Find the shared conversation by ID
    const conversation = await SharedConversation.findByPk(convoId);

    if (!conversation) {
      return res.status(404).json({ message: "Shared conversation not found" });
    }

    // Check if the current user is the owner of the conversation
    if (conversation.userId !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this conversation" });
    }

    // Delete the shared conversation
    await conversation.destroy();

    // Respond with success message
    return res
      .status(200)
      .json({ message: "Shared conversation deleted successfully" });
  } catch (error) {
    console.error("Failed to delete shared conversation:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

module.exports = router;
