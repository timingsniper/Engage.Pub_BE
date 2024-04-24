const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const { OpenAI } = require("openai");
const { Scenario, User } = require("../models");
const { isLoggedIn } = require("./middlewares");
const AWS = require("aws-sdk");
const axios = require("axios");
const sharp = require("sharp");
const multer = require("multer");

require("dotenv").config();
const app = express();
app.use(bodyParser.json());

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer();

router.get("/myScenarios", isLoggedIn, async (req, res) => {
  const userId = req.user.id;
  console.log(userId);
  try {
    let scenarios = await Scenario.findAll({
      where: { authorId: userId },
      order: [["id", "DESC"]],
    });
    return res.status(200).json({
      scenarios,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching scenarios." });
  }
});

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
      limit: 100,
      offset: 0,
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

router.post("/imageGen", isLoggedIn, async (req, res) => {
  const { settings, aiSetting } = req.body;
  const imagePrompt = `Generate an descriptive image for the scenario given. Setting for the scenario:${settings}. AI setting: ${aiSetting}`;
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
    });
    console.log(response.data[0].url);
    return res.status(200).send(response.data[0].url);
  } catch (error) {
    console.log(error);
  }
});

// Create a new scenario
router.post("/", isLoggedIn, upload.none(), async (req, res) => {
  const {
    authorEmail,
    title,
    settings,
    aiSetting,
    mission,
    startingMessage,
    imageUrl,
  } = req.body;
  try {
    // Validate input
    if (
      !authorEmail ||
      !title ||
      !settings ||
      !aiSetting ||
      !mission ||
      !startingMessage ||
      !imageUrl
    ) {
      return res.status(400).json({ message: "All fields must be filled" });
    }
    const authorInfo = await User.findOne({
      where: { email: authorEmail },
    });
    const authorId = authorInfo.id;

    // Download image from URL
    console.log("Downloading image...");
    const response = await axios({
      method: "GET",
      url: imageUrl,
      responseType: "arraybuffer",
    });
    const imageBuffer = Buffer.from(response.data, "binary");

    // Resize and compress the image
    console.log("Compressing image...");
    const processedImage = await sharp(imageBuffer)
      .resize(300, 300)
      .jpeg({ quality: 90 })
      .toBuffer();

    // Upload to S3
    console.log("Uploading to S3...");
    const s3Response = await s3
      .upload({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `scenarios/${Date.now()}_compressed.jpg`, // Using timestamp to create a unique file name
        Body: processedImage,
        ContentType: "image/jpeg",
      })
      .promise();

    const imgSource = s3Response.Location;

    // Create new scenario
    console.log("Creating scenario...");
    const scenario = await Scenario.create({
      authorId,
      title,
      settings,
      aiSetting,
      mission,
      startingMessage,
      imgSource,
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

// Update an existing scenario
router.put("/:scenarioId", isLoggedIn, upload.none(), async (req, res) => {
  const { scenarioId } = req.params;
  const { title, settings, aiSetting, mission, startingMessage, imageUrl } =
    req.body;

  try {
    // Validate input
    if (
      !title ||
      !settings ||
      !aiSetting ||
      !mission ||
      !startingMessage ||
      !imageUrl
    ) {
      return res.status(400).json({ message: "All fields must be filled" });
    }

    // Find the scenario
    const scenario = await Scenario.findByPk(scenarioId);
    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found" });
    }

    // Download and process image if changed
    if (imageUrl !== scenario.imgSource) {
      console.log("Downloading and processing image...");
      const response = await axios({
        method: "GET",
        url: imageUrl,
        responseType: "arraybuffer",
      });
      const imageBuffer = Buffer.from(response.data, "binary");

      console.log("Compressing image...");
      const processedImage = await sharp(imageBuffer)
        .resize(300, 300)
        .jpeg({ quality: 90 })
        .toBuffer();

      console.log("Uploading to S3...");
      const s3Response = await s3
        .upload({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: `scenarios/${Date.now()}_compressed.jpg`, // Unique file name
          Body: processedImage,
          ContentType: "image/jpeg",
        })
        .promise();

      scenario.imgSource = s3Response.Location;
    }

    // Update scenario
    scenario.title = title;
    scenario.settings = settings;
    scenario.aiSetting = aiSetting;
    scenario.mission = mission;
    scenario.startingMessage = startingMessage;

    await scenario.save();

    return res.status(200).json({
      message: "Scenario updated successfully",
      scenario,
    });
  } catch (error) {
    console.error("Failed to update scenario:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
