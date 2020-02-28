/*
* Default route: displays application
*/

// Get required interfaces
const caver = require('../utils/caver')
const DisplayName = require('../utils/displayname')
const ConsumptionRight = require('../utils/consumptionright')
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
  
      // Loads display name or apply default
      if (typeof req.session.displayname == 'undefined') {
        var displayName = await DisplayName.findOne({ address: req.session.address });
        
        if (!displayName) {
          req.session.displayname = req.session.address.substring(0,10);
          res.locals.displayname = req.session.address.substring(0,10);
        } else {
          req.session.displayname = displayName.name;
          res.locals.displayname = displayName.name;
        }
      }

      // Loads consumption rights or apply default
      var consumptionRights = await ConsumptionRight.findOne({ address: req.session.address });
      
      if (!consumptionRights) {
        req.session.consumptionrights = 5;
        res.locals.consumptionrights = 5;
        req.session.consumptionrightslastrefill = Math.round(Date.now() / 1000);
        res.locals.consumptionrightslastrefill = Math.round(Date.now() / 1000);
      } else {
        req.session.consumptionrights = consumptionRights.rights;
        res.locals.consumptionrights = consumptionRights.rights;
        req.session.consumptionrightslastrefill = consumptionRights.lastRefillTimestamp;
        res.locals.consumptionrightslastrefill = consumptionRights.lastRefillTimestamp;
      }

      // Get PinToken data from DB for current position
      [allTokensData, tokenIds, userTokensData, userTokenIds, displayNames] = await getPinTokensAround(req.session.currentlat, req.session.currentlng, req.session.address);
      // Render view
      res.render('index', { allTokensData: allTokensData, userTokensData: userTokensData, tokenIds: tokenIds, userTokenIds: userTokenIds, displayNames: displayNames });
  
    } catch (error) { next(error) }

};