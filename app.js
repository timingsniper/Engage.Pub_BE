const express = require("express");
const path = require("path");
const dotenv = require('dotenv');
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const db = require("./models");
dotenv.config();

const app = express();

// DB Connection
db.sequelize.sync().then(() => {
  console.log("DB Connection Suceeded");
});

// Express Setup
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Router Setup
const indexRouter = require("./routes/index");
const userRouter = require("./routes/user");

// Routes
app.use("/", indexRouter);
app.use("/user", userRouter);

app.listen(5000, () => {
  console.log("서버 실행 중!");
});

module.exports = app;
