const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const session = require("express-session");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const db = require("./models");
const passportConfig = require("./passport");

// Router Setup
const indexRouter = require("./routes/index");
const userRouter = require("./routes/user");
const conversationRouter = require("./routes/conversation");
const scenarioRouter = require("./routes/scenario");
const messageRouter = require("./routes/message");
const recommendationRouter = require("./routes/recommendation");

dotenv.config();
const app = express();

// DB Connection
db.sequelize.sync().then(() => {
  console.log("DB Connection Suceeded");
});

// Express Setup
passportConfig();
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: process.env.COOKIE_SECRET,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 5,
      domain: process.env.NODE_ENV === "production" && ".engage.pub",
    },
  })
);
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/", indexRouter);
app.use("/user", userRouter);
app.use("/conversation", conversationRouter);
app.use("/scenario", scenarioRouter);
app.use("/message", messageRouter);
app.use("/recommendation", recommendationRouter);

// Open server at port 5000
app.listen(5000, () => {
  console.log("서버 실행 중!");
  console.log(`Is Production: ${process.env.NODE_ENV === "production"}`);
  console.log(`Current Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
