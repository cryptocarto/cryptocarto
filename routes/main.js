/*
* Default route: displays application
*/

// Get required interfaces
const caver = require('../utils/caver')
getPinTokensAround = require('../utils/get-pin-tokens-around')

module.exports = async function(req, res, next) {
    try {
  
      // Create a new account on the fly if not in session
      if ((typeof req.session.address == 'undefined') || (typeof req.session.privatekey == 'undefined')) {
        const newAccount = caver.klay.accounts.create();
        req.session.address = newAccount.address;
        res.locals.address = newAccount.address;
        req.session.privatekey = newAccount.privateKey;
        res.locals.privatekey = newAccount.privateKey;
      }
  
      // Default position of the map, Paris if not existing
      if ((typeof req.session.currentlat == 'undefined') || (typeof req.session.currentlng == 'undefined')) {
        req.session.currentlat = 48.8722;
        res.locals.currentlat = 48.8722;
        req.session.currentlng = 2.3321;
        res.locals.currentlng = 2.3321;
      }

      // Get PinToken data from DB for current position
      [allTokensData, tokenIds, userTokensData, userTokenIds] = await getPinTokensAround(req.session.currentlat, req.session.currentlng, req.session.address);
      // Render view
      res.render('index', { allTokensData: allTokensData, userTokensData: userTokensData, tokenIds: tokenIds, userTokenIds: userTokenIds });
  
    } catch (error) { next(error) }

};