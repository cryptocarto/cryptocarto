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
app.get('/',
async function(req, res, next) {
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
});

// Function to get PinTokens around given lat/lng
getPinTokensAround = async function (latitude, longitude, userAddress) {
    // Get pins from DB (incuding new ones)
    var params = { 
      latitude: { $lt: latitude*10000+1000, $gt: latitude*10000-1000},
      longitude: { $lt: longitude*10000+1000, $gt: longitude*10000-1000}
    };

    var tokensDataFromDB = await PinToken.find(params).sort({timestamp:-1});
    var tokenIds = new Array;
    var allTokensData = new Object;

    // Create array indexed by tokenId and tokenIds array
    Object.keys(tokensDataFromDB).map(function (objectKey) {
      allTokensData[tokensDataFromDB[objectKey]["tokenId"]] = tokensDataFromDB[objectKey];
      tokenIds.push(tokensDataFromDB[objectKey]["tokenId"]);
    })

    // Get tokens for this specific user
    var userTokensDataFromDB = await PinToken.find({ owner: { '$regex': new RegExp(userAddress,"i")} }).sort({timestamp:-1});
    var userTokenIds = new Array;
    var userTokensData = new Object;

    // Create array indexed by tokenId and userTokenIds array
    Object.keys(userTokensDataFromDB).map(function (objectKey) {
      userTokensData[userTokensDataFromDB[objectKey]["tokenId"]] = userTokensDataFromDB[objectKey];
      userTokenIds.push(userTokensDataFromDB[objectKey]["tokenId"]);
    })

    return [allTokensData, tokenIds, userTokensData, userTokenIds];
}

// Generate token asset image - only runs if image does'nt already exist
app.post('/get-pin-tokens',
async function(req, res, next) {
  try {
    // Control on lat/lng presence
    if (!req.body.latitude || !req.body.longitude) {
      throw new Error('Latitude and longitude are needed.')
    }

    const latitude   = parseFloat(req.body.latitude);
    const longitude  = parseFloat(req.body.longitude);

    // Get PinToken data from DB for current position
    [allTokensData, tokenIds, userTokensData, userTokenIds] = await getPinTokensAround(latitude, longitude, req.session.address);

    // Set position session variables
    req.session.currentlat = latitude;
    req.session.currentlng = longitude;

    // Return data
    res.render('get-pin-tokens', { pinTokensData: { allTokensData: allTokensData, userTokensData: userTokensData, tokenIds: tokenIds, userTokenIds: userTokenIds } });
  } catch (error) { next(error) }
});

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

// Create a new transaction
app.post('/new-transaction',
async function(req, res, next) {
  try {

    const message    = req.body.message;
    const latitude   = Math.floor(parseFloat(req.body.latitude) * 10000);
    const longitude  = Math.floor(parseFloat(req.body.longitude) * 10000);

    // Check latitude and logitude are inbounds
    latitudeReq = latitude != 0 && (latitude >= -899999) && (latitude <= 900000);
    longitudeReq = longitude != 0 && (longitude >= -1799999) && (longitude <= 1800000);

    if (!latitudeReq || !longitudeReq) {
      req.session.generalMessage = 'Lat/lon out of bounds';
      res.redirect('/new-transaction');
      return;
    }

    req.session.currentlat = parseFloat(req.body.latitude);
    req.session.currentlng = parseFloat(req.body.longitude);

    // sign transaction
    const { rawTransaction: senderRawTransaction } = await caver.klay.accounts.signTransaction({
      type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
      from: req.session.address,
      to: process.env.SMART_CONTRACT_ADDRESS, //Contract on mainnet
      gas: '50000000',
      data: CryptoCartoContract.methods.mintPinToken(message, latitude, longitude).encodeABI(),
      value: caver.utils.toPeb('0', 'KLAY'), //0.00001
    }, req.session.privatekey);
    
    // Send transaction through fee delegation
    await caver.klay.sendTransaction({
      senderRawTransaction: senderRawTransaction,
      feePayer: process.env.FEE_PAYER_ADDRESS,
    })
    .on('transactionHash', function(hash){
        console.log('transactionHash', hash);
    })
    .on('receipt', function(receipt){
        console.log('receipt', receipt);
        console.log('Tx hash is '+ receipt.transactionHash);
        console.log('Sender Tx hash is '+ receipt.senderTxHash);
    })
    .on('error', console.error);

    req.session.generalMessage = 'Transaction was created on blockchain.';

    // Updates the PinTokens DB
    await updatePinTokensDB();

    res.redirect('/');

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

// Add routes
app.use(require("./routes"));

//Error handler
app.use(function (err, req, res, next) {
  req.session.generalMessage = "Error: " + err.message;
  res.redirect('/');
})

app.listen(port, function(){
	console.log("CryptoCarto now UP on port "+port);
});
