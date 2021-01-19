/*
* Ajax return to refresh displayed pins with data in given map bounds
*/

// Get required interfaces
getPinTokensInBounds = require('../utils/get-pin-tokens-in-bounds')

module.exports = async function(req, res, next) {
  try {
    // Control on lat/lng presence
    if (!req.body.lowLatitude || !req.body.highLatitude || !req.body.lowLongitude || !req.body.highLongitude) {
      throw new Error('Latitude and longitude (high/low) are needed.')
    }

    const lowLatitude   = parseFloat(req.body.lowLatitude);
    const highLatitude  = parseFloat(req.body.highLatitude);
    const lowLongitude   = parseFloat(req.body.lowLongitude);
    const highLongitude  = parseFloat(req.body.highLongitude);

    // Get PinToken data from DB for current position
    [allTokensData, tokenIds, displayNames] = await getPinTokensInBounds(lowLatitude, highLatitude, lowLongitude, highLongitude);

    // Set position session variables
    req.session.currentlat = (lowLatitude + highLatitude) / 2.0;
    req.session.currentlng = (lowLongitude + highLongitude) / 2.0;

    // Return data
    res.render('neighbour-token-list', { allTokensData: allTokensData, tokenIds: tokenIds, displayNames: displayNames } );
  } catch (error) { next(error) }

};