/*
* Generate token asset image - only runs if image does'nt already exist
*/

// Get CryptoCarto contract
const CryptoCartoContract = require('../utils/cryptocarto-contract')

module.exports = async function(req, res, next) {
  try {
    // Get token id from URL
    var tokenId = parseInt(req.params.tokenid);

    //Get tokenData
    tokenData = await CryptoCartoContract.methods.getPinToken(tokenId).call();

    // Formatting metadata
    tokenMetadata = {
      'id': tokenData[0],
      'latitude': parseFloat(tokenData[2]) / 10000,
      'longitude': parseFloat(tokenData[3]) / 10000,
      'message': tokenData[4],
      'created_at_utc_timestamp': tokenData[5]
    };
    
    // Render view
    res.render('token-metadata', { tokenMetadata: tokenMetadata });
  } catch (error) { next(error) }
};