var express = require("express");
const bcrypt = require("bcrypt");
var router = express.Router();
const passport = require("passport");
const { User } = require("../models");
const { isLoggedIn, isNotLoggedIn } = require("./middlewares");

// Get user info
router.get("/", async (req, res, next) => {
  try {
    if (req.user) {
      const userInfo = await User.findOne({
        where: { id: req.user.id },
        attributes: {
          exclude: ["password"],
        },
      });
      res.status(200).json(userInfo);
    } else {
      res.status(200).json(null);
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// Signup
router.post("/", isNotLoggedIn, async (req, res, next) => {
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
router.post("/login", isNotLoggedIn, (req, res, next) => {
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
      // Exclude password from the user info returned
      const userInfo = await User.findOne({
        where: { id: user.id },
        attributes: {
          exclude: ["password"],
        },
      });
      return res.status(200).json(userInfo);
    });
  })(req, res, next);
});

// Logout
router.post("/logout", isLoggedIn, (req, res) => {
  req.logout();
  req.session.destroy();
  res.status(200).send("Logout Succeeded");
});

module.exports = router;
