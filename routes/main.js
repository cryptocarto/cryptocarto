/*
* Default route: displays application
*/

// Get required interfaces
const caver = require('../utils/caver')
const DisplayName = require('../utils/displayname')
const ConsumptionRight = require('../utils/consumptionright')
const PinToken = require('../utils/pintoken');
const {Crawler, middleware} = require('es6-crawler-detect/src')
getPinTokensAround = require('../utils/get-pin-tokens-around')
getUserLevel = require('../utils/get-user-level')
createNewToken = require('../utils/create-new-token')
addConsumptionRights = require('../utils/add-consumption-rights')

module.exports = async function(req, res, next) {
    try {
  
      // Crawler detection
      var CrawlerDetector = new Crawler();
      var isCrawler = CrawlerDetector.isCrawler(req.headers['user-agent']);

      // Create a new account on the fly if not in session
      if ((typeof req.session.address == 'undefined') || (typeof req.session.privatekey == 'undefined')) {
        const newAccount = caver.klay.accounts.create();
        req.session.address = newAccount.address;
        res.locals.address = newAccount.address;
        req.session.privatekey = newAccount.privateKey;
        res.locals.privatekey = newAccount.privateKey;

        // Create a new pintoken close to a pre-existing one for this new account (excludes crawlers)
        if (!isCrawler) {
          randomLocationNotFound = true;
          while (randomLocationNotFound) {
            randomPinToken = await PinToken.aggregate([ { $sample: { size: 1 } } ]);
            latitude = randomPinToken[0].latitude + (Math.round(Math.random() * 200) - 100);
            longitude = randomPinToken[0].longitude + (Math.round(Math.random() * 200) - 100);
            randomLocationNotFound = await PinToken.exists({"latitude" : latitude, "longitude" : longitude});
          }
          message = "This is my first spot!";
          newPinToken = await createNewToken(latitude, longitude, message, req);

          // Sets user view to this first pin coordinates
          req.session.currentlat = latitude / 10000;
          res.locals.currentlat = latitude / 10000;
          req.session.currentlng = longitude / 10000;
          res.locals.currentlng = longitude / 10000;

          // Add 6 bonus consumption rights for new users
          addConsumptionRights(newAccount.address, process.env.BONUS_RIGHTS_NEW_USERS);
          res.locals.welcome = true;
        } else {
          res.locals.welcome = false;
        }
      } else {
        res.locals.welcome = false;
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

      // Get user level
      var userLevel = await getUserLevel(req.session.address);
      req.session.userlevel = userLevel;
      res.locals.userlevel = userLevel;

      // Loads consumption rights or apply default
      var consumptionRights = await ConsumptionRight.findOne({ address: req.session.address.toLowerCase() });
      
      if (!consumptionRights) {
        req.session.consumptionrights = 5;
        res.locals.consumptionrights = 5;
        req.session.consumptionrightslastrefill = Math.round(Date.now() / 1000);
        res.locals.consumptionrightslastrefill = Math.round(Date.now() / 1000);
        req.session.notEnoughRights = false;
        res.locals.notEnoughRights = false;
        
      } else {
        req.session.consumptionrights = consumptionRights.rights;
        res.locals.consumptionrights = consumptionRights.rights;
        req.session.consumptionrightslastrefill = consumptionRights.lastRefillTimestamp;
        res.locals.consumptionrightslastrefill = consumptionRights.lastRefillTimestamp;

        // Check if has consumption rights
        timestampTimeRemaining = new Date((parseInt(consumptionRights.lastRefillTimestamp) + 79200) * 1000).getTime();
        timestampCurrent = new Date().getTime();
        timestampTimeBeforeNextRefill = new Date(timestampTimeRemaining - timestampCurrent).getTime();
        hasEnoughRights = (consumptionRights.rights > 0) || ((timestampTimeBeforeNextRefill) < 0);
  
        req.session.notEnoughRights = !hasEnoughRights;
        res.locals.notEnoughRights = !hasEnoughRights;
      }

      // Get PinToken data from DB for current position
      [allTokensData, tokenIds, displayNames] = await getPinTokensAround(req.session.currentlat, req.session.currentlng);
      // Render view
      res.render('index', { allTokensData: allTokensData, tokenIds: tokenIds, displayNames: displayNames });
  
    } catch (error) { next(error) }

};