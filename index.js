var express = require('express');
const dotenv = require('dotenv');
dotenv.config();
var port = process.env.PORT || 4210;
var app = express();

// Get a PinToken DB interface
var PinToken = require('./utils/pintoken')

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
app.use('/token', express.static(__dirname + '/token-images')); // redirect token images
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));

// Redirect to HTTPS
if (process.env.ENVIRONMENT != 'dev') {
  app.get('*', function(req, res, next) {
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

// Watch ERC-721 transfers and update cache every minute
setInterval(async function() {
  try {
    await caver.klay.getBlockNumber().then(function(latestBlockNumber){
      console.log("Running transfer watcher at block " + latestBlockNumber);
      CryptoCartoContract.getPastEvents('Transfer', {
        fromBlock: latestBlockNumber - 35, // Get events for last 35 blocks (30 for 30sec + margin)
        toBlock: 'latest'}
      , function(error, events){
        try {
          // Updating owner for token
          events.forEach(event => {
            tokenIdToRemove = event.returnValues.tokenId;
            console.log("Updating token ID #" + event.returnValues.tokenId);
            PinToken.updateMany({ tokenId: event.returnValues.tokenId }, { $set: { owner: event.returnValues.to } })
          });
        } catch (error) { console.error("Error while crawling events.") }
      })
      CryptoCartoContract.getPastEvents('ConsumptionRightsChanged', {
        fromBlock: latestBlockNumber - 35, // Get events for last 35 blocks (30 for 30sec + margin)
        toBlock: 'latest'}
      , function(error, events){
        try {
          events.forEach(event => {

            // TODO: change consumption right record in DB: max val for oldest TS

            console.log("Consumption right for address " + event.returnValues.owner + " changed to " 
            + event.returnValues.newConsumptionRights + " (new TS: " + event.returnValues.lastRefillTimestamp + ") ")
          });
        } catch (error) { console.error("Error while crawling events.") }
      })
    })
    updatePinTokensDB();
  } catch (error) { console.error("Error while watching ERC-20 transfers.") }
  // Getting pin data
}, 30000); // 30sec

// Triggers an update at app launch
updatePinTokensDB = require('./utils/update-pin-tokens-db')
updatePinTokensDB();

//Define routes

// View a specific pin
app.get('/view-pin/:pinid',
async function(req, res, next) {
  try {
    // Get token id from URL
    var tokenId = parseInt(req.params.pinid);

    //Get tokenData
    tokenData = await CryptoCartoContract.methods.getPinToken(tokenId).call();

    // Set poition session variables
    req.session.currentlat = parseFloat(tokenData[2]) / 10000;
    req.session.currentlng = parseFloat(tokenData[3]) / 10000;
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

app.listen(port, function(){
	console.log("CryptoCarto now UP on port "+port);
});
