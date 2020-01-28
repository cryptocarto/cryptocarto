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
var watermark = require('dynamic-watermark');

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

// General message middleware
var messageMiddleware = function (req, res, next) {
  if (typeof req.session.generalMessage != 'undefined') {
    res.locals.generalMessage = req.session.generalMessage;
    req.session.generalMessage = "";
  }
  
  if (typeof req.session.address != 'undefined') {
    res.locals.address = req.session.address;
  }
  
  if (typeof req.session.privatekey != 'undefined') {
    res.locals.privatekey = req.session.privatekey;
  }
  
  if (typeof req.session.currentlat != 'undefined') {
    res.locals.currentlat = req.session.currentlat;
  }
  
  if (typeof req.session.currentlng != 'undefined') {
    res.locals.currentlng = req.session.currentlng;
  }

  if (typeof req.session.openPinId != 'undefined') {
    res.locals.openPinId = req.session.openPinId;
    req.session.openPinId = "";
  }
  next()
}
app.use(messageMiddleware)

//Get a configured caver instance
const caver = require('./utils/caver')

// Get CryptoCarto contract
const CryptoCartoContract = require('./utils/cryptocarto-contract')

// Watch ERC-721 transfers and update cache every minute
setInterval(function() {
  caver.klay.getBlockNumber().then(function(latestBlockNumber){
    console.log("Running transfer watcher at block " + latestBlockNumber);
    CryptoCartoContract.getPastEvents('Transfer', {
      fromBlock: latestBlockNumber - 35, // Get events for last 35 blocks (30 for 30sec + margin)
      toBlock: 'latest'}
    , function(error, events){

      // Updating owner for token
      events.forEach(event => {
        tokenIdToRemove = event.returnValues.tokenId;
        console.log("Updating token ID #" + event.returnValues.tokenId);
        PinToken.updateMany({ tokenId: event.returnValues.tokenId }, { $set: { owner: event.returnValues.to } })
      });

    })
  })
  // Getting pin data
  updatePinTokensDB();
}, 30000); // 30sec

// Triggers an update at app launch
updatePinTokensDB = require('./utils/update-pin-tokens-db')
updatePinTokensDB();

//Define routes

// Generate token asset image - only runs if image does'nt already exist
app.get('/token/:tokenaddress',
async function(req, res, next) {
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
      text: "test",
      source: "http://ec2-3-8-193-219.eu-west-2.compute.amazonaws.com/osm/18/" + Math.floor(xtile) + "/" + Math.floor(ytile) + ".png",
      logo: __dirname + '/img/square.png',
      destination: __dirname + '/token-images/' + tokenid + '.png',
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
});

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
