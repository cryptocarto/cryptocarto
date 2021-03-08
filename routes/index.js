/*
* Declare routes
*/

var express = require('express');
var router = express.Router();

// Route listing
router.get('/', require('./main'));
router.post('/get-pin-tokens', require('./get-pin-tokens'));
router.post('/get-pin-tokens-with-params', require('./get-pin-tokens-with-params'));
router.post('/get-pin-tokens-in-bounds', require('./get-pin-tokens-in-bounds'));
router.post('/new-transaction', require('./new-transaction'));
router.post('/import-pk', require('./import-pk'));
router.get('/wipe-key', require('./wipe-key'));
router.post('/change-name', require('./change-name'));
router.post('/transfer-pin', require('./transfer-pin'));
router.post('/modify-pin', require('./modify-pin'));
router.get('/save-user-info', require('./save-user-info'));
router.get('/img/pin-token/:tokenaddress', require('./token-image-retrieval'));
router.get('/metadata/pin-token/:tokenid', require('./token-metadata'));
router.get('/view-random-pin', require('./view-random-pin'));
router.get('/get-leaderboard', require('./get-leaderboard'));
router.post('/connect-kaikas', require('./connect-kaikas'));
router.get('/disconnect-kaikas', require('./disconnect-kaikas'));

// Legacy routes
router.get('/token-metadata/:tokenid', require('./token-metadata-legacy'));

module.exports = router;
