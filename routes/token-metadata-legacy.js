/*
* Generate token asset image - only runs if image does'nt already exist
*/

// Get PinToken interface
const PinToken = require('../utils/pintoken')

module.exports = async function(req, res, next) {
  try {
    // Get token id from URL
    var tokenId = parseInt(req.params.tokenid);

    //Get tokenData from DB
    tokenData = await PinToken.findOne({"tokenId" : tokenId});

    // Formatting metadata
    tokenMetadata = {
      'legacy': "This token metadata is legacy, please point to 'current_metadata_uri'",
      'current_metadata_uri': "https://app.cryptocarto.xyz/metadata/pin-token/" + tokenData['tokenId'],
      'id': tokenData['tokenId'],
      'latitude': parseFloat(tokenData['latitude']) / 10000,
      'longitude': parseFloat(tokenData['longitude']) / 10000,
      'message': tokenData['message'],
      'created_at_utc_timestamp': tokenData['timestamp']
    };
    
    // Render view
    res.render('token-metadata', { tokenMetadata: tokenMetadata });
  } catch (error) { 
    res.render('token-metadata', { tokenMetadata: { 'error' : 'Invalid query' }}); 
  }
};