/*
* Generate token asset image - only runs if image does'nt already exist
*/

// Get required interfaces
var watermark = require('dynamic-watermark');

module.exports = async function(req, res, next) {
  try {
    // Get token id from URL
    var tokenid = req.params.tokenaddress.replace('.png', '');

    // Decode latitude and longitude
    idFormattedLatitude  = Math.trunc(tokenid/100000000)
    idFormattedLongitude = tokenid - (idFormattedLatitude * 100000000)
    if (idFormattedLatitude > 1000000) {
      idFormattedLatitude = 0 - (idFormattedLatitude - 1000000);
    }
    latitude = idFormattedLatitude / 10000;
    if (idFormattedLongitude > 10000000) {
      idFormattedLongitude = 0 - (idFormattedLongitude - 10000000);
    }
    longitude = idFormattedLongitude / 10000;

    // Calculate tile coordinates
    n = 2 ** 18 // n = 2 ^ zoom
    xtile = n * ((longitude + 180) / 360)
    ytile = n * (1 - (Math.log(Math.tan(latitude / 180 * Math.PI) + (1/Math.cos(latitude / 180 * Math.PI))) / Math.PI)) / 2

    // Position of the square on the tile
    xCirclePosition = ((xtile - Math.trunc(xtile)) * 256) - 12
    yCirclePosition = ((ytile - Math.trunc(ytile)) * 256) - 12

    var optionsImageWatermark = {
      type: "image",
      source: "http://ec2-3-8-193-219.eu-west-2.compute.amazonaws.com/osm/18/" + Math.floor(xtile) + "/" + Math.floor(ytile) + ".png",
      logo: __dirname + '/../img/square.png',
      destination: __dirname + '/../token-images/' + tokenid + '.png',
      position: {
          logoX : Math.round(xCirclePosition),
          logoY : Math.round(yCirclePosition),
          logoHeight: 24,
          logoWidth: 24
      }
    };
    // Create image
    watermark.embed(optionsImageWatermark, function(status) {
      res.redirect('/token/' + tokenid + '.png');
      console.log(status);
    });

  } catch (error) { next(error) }

};