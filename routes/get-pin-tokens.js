/*
* Ajax return to refresh displayed pins with data around current point
*/

// Get required interfaces
getPinTokensAround = require('../utils/get-pin-tokens-around')

module.exports = async function(req, res, next) {
  try {
    // Control on lat/lng presence
    if (!req.body.latitude || !req.body.longitude) {
      throw new Error('Latitude and longitude are needed.')
    }

    const latitude   = parseFloat(req.body.latitude);
    const longitude  = parseFloat(req.body.longitude);

    // Get PinToken data from DB for current position
    [allTokensData, tokenIds, userTokensData, userTokenIds, displayNames] = await getPinTokensAround(latitude, longitude, req.session.address);

    // Set position session variables
    req.session.currentlat = latitude;
    req.session.currentlng = longitude;

    // Return data
    res.render('neighbour-token-list', { allTokensData: allTokensData, userTokensData: userTokensData, tokenIds: tokenIds, userTokenIds: userTokenIds, displayNames: displayNames } );
  } catch (error) { next(error) }

};