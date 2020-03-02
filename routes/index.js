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
router.post('/change-name', require('./change-name'));
router.post('/transfer-pin', require('./transfer-pin'));
router.post('/modify-pin', require('./modify-pin'));
router.get('/save-user-info', require('./save-user-info'));
router.get('/img/pin-token/:tokenaddress', require('./token-image-generation'));
router.get('/metadata/pin-token/:tokenid', require('./token-metadata'));

// Legacy routes
router.get('/token-metadata/:tokenid', require('./token-metadata-legacy'));
router.get('/token/:tokenaddress', require('./token-image-generation-legacy'));

module.exports = router;
