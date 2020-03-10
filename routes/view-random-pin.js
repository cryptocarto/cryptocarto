/*
* View a random pin token
*/

// Get required interfaces
const PinToken = require('../utils/pintoken');

module.exports = async function(req, res, next) {
  try {
    var randomPinToken = await PinToken.aggregate([ { $sample: { size: 1 } } ]);
    res.redirect('/view-pin/' + randomPinToken[0].tokenId);
  } catch (error) { next(error) }
};