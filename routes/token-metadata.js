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
      "description": "CryptoCarto PinToken #" + tokenData['tokenId'],
      "name": "#" + tokenData['tokenId'],
      "image": "https://app.cryptocarto.xyz/img/pin-token/" + tokenData['tokenId'],
      'token_id': tokenData['tokenId'],
      'creator': tokenData['creator'],
      'owner': tokenData['owner'],
      'latitude': parseFloat(tokenData['latitude']) / 10000,
      'longitude': parseFloat(tokenData['longitude']) / 10000,
      'message': tokenData['message'],
      'created_at_utc_timestamp': tokenData['creation_timestamp'],
      'modified_at_utc_timestamp': tokenData['modification_timestamp']
    };
    
    // Render view
    res.set('Content-Type', 'application/json');
    res.render('token-metadata', { tokenMetadata: tokenMetadata });
  } catch (error) { 
    res.set('Content-Type', 'application/json');
    res.render('token-metadata', { tokenMetadata: { 'error' : 'Invalid query' }}); 
  }
};