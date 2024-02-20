var express = require("express");
const bcrypt = require("bcrypt");
var router = express.Router();
const passport = require("passport");
const { User } = require("../models");

// Signup
router.post("/", async (req, res, next) => {
  try {
    // Look for duplicate email
    const emailCheck = await User.findOne({
      where: {
        email: req.body.email,
      },
    });
    if (emailCheck) {
      return res.status(403).send("Email already in use.");
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    await User.create({
      email: req.body.email,
      nickname: req.body.nickname,
      password: hashedPassword,
    });
    res.status(201).send("Signup succeded.");
  } catch (error) {
    console.error(error);
    return next(error);
  }
});

// Login
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.log(err);
      return next(err);
    }
    if (info) {
      return res.status(401).send(info.reason);
    }
    return req.login(user, async (loginErr) => {
      if (loginErr) {
        console.log(loginErr);
        return next(loginErr);
      }
      return res.status(200).json(user);
    });
  })(req, res, next);
});

module.exports = router;
