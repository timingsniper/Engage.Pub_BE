const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const { Scenario, User } = require("../models");
const { isLoggedIn } = require("./middlewares");

require("dotenv").config();
const app = express();
app.use(bodyParser.json());

// Returns all scenario, login not required
router.get("/:pageId", async (req, res) => {
  let { pageId } = req.params;
  const limit = 8;
  const offset = (pageId - 1) * limit;
  try {
    const totalScenarios = await Scenario.count();
    const totalPages = Math.ceil(totalScenarios / limit);
    let scenarios = await Scenario.findAll({
      attributes: [
        "id",
        "authorId",
        "title",
        "settings",
        "createdAt",
        "imgSource",
      ],
      limit: limit,
      offset: offset,
      order: [["id", "DESC"]],
    });
    const nextPage = pageId < totalPages ? parseInt(pageId) + 1 : null;
    return res.status(200).json({
      scenarios,
      nextPage,
    });
  } catch (error) {
    console.log(error);
  }
});

// Returns a single scenario detail
router.get("/detail/:scenarioId", isLoggedIn, async (req, res) => {
  const { scenarioId } = req.params;
  try {
    let scenario = await Scenario.findOne({
      where: { id: scenarioId },
    });
    if (!scenario) {
      return res.status(404).send("No such scenario found.");
    }
    return res.status(200).json({
      scenario,
    });
  } catch (error) {
    console.log(error);
  }
});

// Create a new scenario
router.post("/", isLoggedIn, async (req, res) => {
  const {
    authorEmail,
    title,
    settings,
    aiSetting,
    mission,
    startingMessage,
    // imgSource,
  } = req.body;
  try {
    // Validate input
    if (
      !authorEmail ||
      !title ||
      !settings ||
      !aiSetting ||
      !mission ||
      !startingMessage
      // || !imgSource
    ) {
      return res.status(400).json({ message: "All fields must be filled" });
    }
    const authorInfo = await User.findOne({
      where: { email: authorEmail },
    });
    const authorId = authorInfo.id;
    // Create new scenario
    const scenario = await Scenario.create({
      authorId,
      title,
      settings,
      aiSetting,
      mission,
      startingMessage,
      imgSource: 'https://picsum.photos/200/300',
    });

    return res.status(201).json({
      message: "Scenario created successfully",
      scenario,
    });
  } catch (error) {
    console.error("Failed to create scenario:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
