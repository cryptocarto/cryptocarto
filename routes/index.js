/*
* Declare routes
*/

var express = require('express');
var router = express.Router();

// Route listing
router.get('/view-pin/:pinid', require('./view-pin'));
router.post('/transfer-pin', require('./transfer-pin'));
router.get('/save-user-info', require('./save-user-info'));
router.get('/token-metadata/:tokenid', require('./token-metadata'));

module.exports = router;
