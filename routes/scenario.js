const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const { Scenario } = require("../models");
const { isLoggedIn } = require("./middlewares");

require("dotenv").config();
const app = express();
app.use(bodyParser.json());

// Returns all scenario, login not required
router.get("/", async (req, res) => {
  try {
    let scenarios = await Scenario.findAll({
      attributes: ["id", "authorId", "title", "settings", "createdAt"],
    });
    return res.status(200).json({
      scenarios,
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
