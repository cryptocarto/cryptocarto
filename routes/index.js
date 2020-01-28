/*
* Declare routes
*/

var express = require('express');
var router = express.Router();

// Route listing
router.get('/', require('./main'));
router.post('/get-pin-tokens', require('./get-pin-tokens'));
router.post('/new-transaction', require('./new-transaction'));
router.post('/import-pk', require('./import-pk'));
router.post('/transfer-pin', require('./transfer-pin'));
router.get('/save-user-info', require('./save-user-info'));
router.get('/token-metadata/:tokenid', require('./token-metadata'));
router.get('/token/:tokenaddress', require('./token-image-generation'));

module.exports = router;
