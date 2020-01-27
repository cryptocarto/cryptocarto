/*
* Declare routes
*/

var express = require('express');
var router = express.Router();

// Route listing
router.get('save-user-info', require('./save-user-info'));
router.get('/token-metadata/:tokenid', require('./token-metadata'));

module.exports = router;
