/*
* Create a new transaction
*/

// Get required interfaces
createNewToken = require('../utils/create-new-token')

module.exports = async function(req, res, next) {
  try {

    const message    = req.body.message;
    const latitude   = Math.floor(parseFloat(req.body.latitude) * 10000);
    const longitude  = Math.floor(parseFloat(req.body.longitude) * 10000);

    // Check latitude and logitude are inbounds
    latitudeReq = latitude != 0 && (latitude >= -899999) && (latitude <= 900000);
    longitudeReq = longitude != 0 && (longitude >= -1799999) && (longitude <= 1800000);

    if (!latitudeReq || !longitudeReq) {
      req.session.generalMessage = 'Lat/lon out of bounds';
      res.redirect('/');
      return;
    }

    if (message.length >= 200) {
      req.session.generalMessage = 'Message must be less than 200 chars';
      res.redirect('/');
      return;
    }

    req.session.currentlat = parseFloat(req.body.latitude);
    req.session.currentlng = parseFloat(req.body.longitude);

    // Launch token creation process
    newPinToken = await createNewToken(latitude, longitude, message, req);

    req.session.generalMessage = 'Token #' + newPinToken.tokenId + ' created.';
    req.session.openPinId = newPinToken.tokenId;

    res.redirect('/');

  } catch (error) { next(error) }
};