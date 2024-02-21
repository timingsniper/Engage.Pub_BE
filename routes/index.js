var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
  res.send('API Online!- Engage.pub');
});

module.exports = router;
