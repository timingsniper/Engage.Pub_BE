var express = require('express');
var router = express.Router();
const { User } = require('../models')

router.get('/', function(req, res) {
  res.send('User');
});

module.exports = router;
