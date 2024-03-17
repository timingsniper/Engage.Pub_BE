const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const { Scenario } = require("../models");
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
      attributes: ["id", "authorId", "title", "settings", "createdAt", "imgSource"],
      limit: limit,
      offset: offset,
      order: [["createdAt", "DESC"]],
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
router.get("/:scenarioId", isLoggedIn, async (req, res) => {
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

module.exports = router;
