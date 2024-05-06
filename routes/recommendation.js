const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const { OpenAI } = require("openai");
const { Scenario, User } = require("../models");
const { isLoggedIn } = require("./middlewares");
const axios = require("axios");
const sharp = require("sharp");
const multer = require("multer");

require("dotenv").config();
const app = express();
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Endpoint to get expression recommendation for a scenario
router.get("/expression/:scenarioId", isLoggedIn, async (req, res) => {
  const { scenarioId } = req.params;
  const translateModule = await import("translate");
  const translate = translateModule.default;
  try {
    let scenario = await Scenario.findOne({
      where: { id: scenarioId },
    });
    if (!scenario) {
      return res.status(404).send("No such scenario found.");
    }
    const prompt = `Recommend a common English expression in sentence that can be used in the following scenario to achieve the goal: Title: "${scenario.title}, Settings: "${scenario.settings}. Goal:${scenario.mission} Return just the expression as the answer.`;
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt }],
    });
    // Get response translation
    const translation = await translate(
      response.choices[0].message.content,
      { from: "en", to: "zh" }
    );
    return res.status(200).json({
      expression: response.choices[0].message.content,
      translation,
    });
  } catch (error) {
    console.error("Failed to get expression:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Endpoint to get vocabulary recommendations for a scenario
router.get("/vocab/:scenarioId", isLoggedIn, async (req, res) => {
    const { scenarioId } = req.params;
    const translateModule = await import("translate");
    const translate = translateModule.default;
  
    try {
      const scenario = await Scenario.findOne({
        where: { id: scenarioId },
      });
  
      if (!scenario) {
        return res.status(404).send("No such scenario found.");
      }
  
      const prompt = `Recommend three important English vocabulary words that would be useful in the following scenario to achieve the goal: Title: "${scenario.title}", Settings: "${scenario.settings}", Goal: "${scenario.mission}". Please list each vocabulary word separated by a comma. Example response: word1, word2, word3`;
  
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "system", content: prompt }],
      });
      console.log(response.choices[0].message.content)
      const vocabList = response.choices[0].message.content.split(',').map(word => word.trim()).slice(0, 3);
  
      // Translate each vocabulary word
      const translations = await Promise.all(vocabList.map(word => 
        translate(word, { from: "en", to: "zh" })
      ));
  
      const vocabItems = vocabList.map((vocab, index) => ({
        vocabulary: vocab,
        translation: translations[index]
      }));
  
      return res.status(200).json(vocabItems);
    } catch (error) {
      console.error("Failed to get vocabulary:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  });
  

module.exports = router;
