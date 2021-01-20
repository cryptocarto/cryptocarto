/*
* Retrieve token asset image
*/
var request = require('request');

module.exports = async function(req, res, next) {
  try {
    var imageName = req.params.tokenaddress;
    urlForImage = 'http://tile-manager.cryptocarto.xyz/img/pin-token/' + imageName;
    
    req.pipe(request(urlForImage)).pipe(res);

  } catch (error) { next(error) }

};