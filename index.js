var express = require('express');
const dotenv = require('dotenv');
dotenv.config();
var port = process.env.PORT || 4210;
var app = express();
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const db = require('./utils/db')

// Get required DB interfaces
var PinToken = require('./utils/pintoken')
var ConsumptionRight = require('./utils/consumptionright')

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use('/leaflet', express.static(__dirname + '/leaflet')); // redirect leaflet
app.use('/js', express.static(__dirname + '/js')); // redirect js
app.use('/img', express.static(__dirname + '/img')); // redirect img
app.use('/css', express.static(__dirname + '/css')); // redirect css
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/js', express.static(__dirname + '/node_modules/jquery-ui-dist/')); // redirect JS jQuery UI
app.use('/js', express.static(__dirname + '/node_modules/jquery-validation/dist/')); // redirect JS jQuery validation
app.use('/cluster', express.static(__dirname + '/node_modules/leaflet.markercluster/dist/')); // redirect JS cluster
app.use('/token', express.static(__dirname + '/token-images')); // redirect token images
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));

if (process.env.ENVIRONMENT != 'dev') {
  app.set('trust proxy', 1); // Trusts 1 proxy for secure HHTPS cookiein production
};

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new MongoStore({ mongooseConnection: db.connection, secret: process.env.SESSION_SECRET }),
  rolling: true,
  cookie: {
    secure: (process.env.ENVIRONMENT != 'dev'), // Use a secure HTTPS-only cookie if not in dev
    maxAge: 1209600000 // 2 weeks duration
  }
}));

// Redirect to HTTPS
if (process.env.ENVIRONMENT != 'dev') {
  app.get('*', function (req, res, next) {
    if (req.headers["x-forwarded-proto"] !== 'https') {
      res.redirect('https://' + req.headers.host + req.url);
      return;
    }
    next();
  })
}

// Add general message middleware
app.use(require('./utils/message-middleware'))

//Get a configured caver instance
const caver = require('./utils/caver')

// Get CryptoCarto contract
const CryptoCartoContract = require('./utils/cryptocarto-contract')

// Watch ERC-721 transfers and update cache depending on BC_WATCHER_DELAY var
var bcWatcherDelay = process.env.BC_WATCHER_DELAY || 30;
var bcWatcherDelayWithMargin = parseInt(bcWatcherDelay) + Math.ceil(bcWatcherDelay / 10);
console.log("Delays: " + bcWatcherDelay + " / " + bcWatcherDelayWithMargin);
setInterval(async function () {
  try {
    await caver.klay.getBlockNumber().then(function (latestBlockNumber) {
      console.log("Running transfer watcher at block " + latestBlockNumber);
      CryptoCartoContract.getPastEvents('Transfer', {
        fromBlock: latestBlockNumber - bcWatcherDelayWithMargin, // Get events since last watch
        toBlock: 'latest'
      }
        , function (error, events) {
          try {
            // Updating owner for token
            events.forEach(async event => {
              tokenIdToRemove = event.returnValues.tokenId;
              console.log("Updating token ID #" + event.returnValues.tokenId + " (transfer detected)");
              await PinToken.updateMany({ tokenId: event.returnValues.tokenId }, { $set: { owner: event.returnValues.to } })
            });
          } catch (error) { console.error("Error while crawling events.") }
        })

      CryptoCartoContract.getPastEvents('PinTokenModified', {
        fromBlock: latestBlockNumber - bcWatcherDelayWithMargin, // Get events since last watch
        toBlock: 'latest'
      }
        , function (error, events) {
          try {
            // Updating message and modification date for token
            events.forEach(async event => {
              console.log("Updating token ID #" + event.returnValues.tokenId + " (message updated)");
              await PinToken.updateMany({ tokenId: event.returnValues.tokenId }, { $set: { message: event.returnValues.message, modificationTimestamp: event.returnValues.timestamp } })
            });
          } catch (error) { console.error("Error while crawling events.") }
        })

      CryptoCartoContract.getPastEvents('ConsumptionRightsChanged', {
        fromBlock: latestBlockNumber - bcWatcherDelayWithMargin, // Get events since last watch
        toBlock: 'latest'
      }
        , function (error, events) {
          try {
            events.map(async function (event) {
              var address = event.returnValues.owner.toLowerCase();
              var currentRights = await ConsumptionRight.findOne({ address: address });

              if (!currentRights) {

                //If no DB record, create one with received values and proceed
                var newConsumptionRights = new ConsumptionRight({
                  address: address,
                  rights: event.returnValues.newConsumptionRights,
                  lastRefillTimestamp: event.returnValues.lastRefillTimestamp,
                  lastChangeTimestamp: event.returnValues.eventTimestamp
                });
                await newConsumptionRights.save();

                console.log("Consumption right for address " + address + " created: "
                  + event.returnValues.newConsumptionRights + " (with TS: " + event.returnValues.lastRefillTimestamp + ") ");

              } else if (currentRights.lastChangeTimestamp < event.returnValues.eventTimestamp) {

                //If the event is more recent than last change, update DB
                await ConsumptionRight.updateMany({ address: address }, {
                  $set: {
                    rights: event.returnValues.newConsumptionRights,
                    lastRefillTimestamp: event.returnValues.lastRefillTimestamp,
                    lastChangeTimestamp: event.returnValues.eventTimestamp,
                  }
                });

                console.log("Consumption right for address " + address + " changed to "
                  + event.returnValues.newConsumptionRights + " (new TS: " + event.returnValues.lastRefillTimestamp + ") ");

              } else if (currentRights.lastChangeTimestamp == event.returnValues.eventTimestamp) {
                //In this case, state is unknown: reload data from BC
                updateConsumptionRightsFromBlockchain = require('./utils/update-consumption-rights-from-blockchain')
                updateConsumptionRightsFromBlockchain(address);
                console.log("Consumption right for address " + address + " reloading from blockchain");
              } else {
                console.log("Consumption right for address " + address + " unchanged, old event received (TS: " + event.returnValues.eventTimestamp +
                  ") - event values are " + event.returnValues.newConsumptionRights + " (new TS: " + event.returnValues.lastRefillTimestamp + ") ");
              }
            });
          } catch (error) { console.error("Error while crawling events.") }
        })
    })
    updatePinTokensDB();
  } catch (error) { console.error("Error while watching ERC-721 transfers") }
  // Getting pin data
}, bcWatcherDelay * 1000); // Convert sec to ms

// Triggers an update at app launch
updatePinTokensDB = require('./utils/update-pin-tokens-db')
updatePinTokensDB();

//Define routes

// View a specific pin
app.get('/view-pin/:pinid',
  async function (req, res, next) {
    try {
      // Get token id from URL
      var tokenId = parseInt(req.params.pinid);

      //Get tokenData
      tokenData = await CryptoCartoContract.methods.getPinToken(tokenId).call();

      // Set poition session variables
      req.session.currentlat = parseFloat(tokenData[3]) / 10000;
      req.session.currentlng = parseFloat(tokenData[4]) / 10000;
      req.session.openPinId = tokenId;

      req.session.generalMessage = 'Viewing Pin #' + tokenId;
      req.url = "/";
      app.handle(req, res, next);
    } catch (error) { next(error) }
  });

// Add other routes
app.use(require("./routes"));

//Error handler
app.use(function (err, req, res, next) {
  req.session.generalMessage = "Error: " + err.message;
  res.redirect('/');
})

app.listen(port, function () {
  console.log("CryptoCarto now UP on port " + port);
});
