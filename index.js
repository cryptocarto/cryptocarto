var express = require('express');
const dotenv = require('dotenv');
dotenv.config();
var port = process.env.PORT || 4210;
var app = express();

// Connect to mongo and declare PinToken schema
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', function() { console.log("Connected to DB")});

var pinTokenSchema = new mongoose.Schema({
  tokenId : String,
  owner: String,
  latitude : Number,
  longitude : Number,
  message : String,
  timestamp : String
});

var PinToken = mongoose.model('PinToken', pinTokenSchema);

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


//Setting up Klaytn data
const Caver = require('caver-js')
const caver = new Caver('https://api.'+process.env.KLAYTN_NETWORK+'.klaytn.net:8651/')

// Deployed smart contract address
const smartContractAddress = process.env.SMART_CONTRACT_ADDRESS

// Get the ABI
const fs = require('fs')
const deployedAbi = fs.readFileSync(__dirname + '/deployedABI', 'utf8')

// Setting contract
const CryptoCartoContract = deployedAbi
  && smartContractAddress
  && new caver.klay.Contract(JSON.parse(deployedAbi), smartContractAddress)

// Setting up fee delegation structure
const feePayerAddress = process.env.FEE_PAYER_ADDRESS;
const feePayerPrivateKey = process.env.FEE_PAYER_PRIVATE_KEY;
caver.klay.accounts.wallet.add(feePayerPrivateKey, feePayerAddress);

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

// Function to update PinToken DB from blockchain
updatePinTokensDB = async function () {
  await CryptoCartoContract.methods.getAllPinTokenIds().call().then(async function(tokenIds){

    // Exclude known Pins from lookup (pins already in DB)
    tokenIdsToLookup = tokenIds;
    currentPinIds = await PinToken.distinct("tokenId");
    tokenIdsToLookup = tokenIds.filter(x => !currentPinIds.includes(x));
    
    // If new tokens, save them in DB
    if (tokenIdsToLookup.length > 0) {

      // Getting token data in parallel
      const tokenDataPromises = tokenIdsToLookup.map(async function(tokenId){
        return CryptoCartoContract.methods.getPinToken(tokenId).call()
      });

      // Waiting for blockchain return, then saves to DB
      await Promise.all(tokenDataPromises).then(async function(result) {

        // Saves new tokens to DB
        const tokenSavePromises = Object.keys(result).map(async function (objectKey) {
          var newPinToken = new PinToken({
            tokenId : result[objectKey][0],
            owner: result[objectKey][1],
            latitude : result[objectKey][2],
            longitude : result[objectKey][3],
            message : result[objectKey][4],
            timestamp : result[objectKey][5]
          });
        
          // Saves if not existing
          if (!await PinToken.countDocuments({ tokenId: newPinToken.tokenId })) {
            await newPinToken.save();
            console.log("PinToken #" + newPinToken.tokenId + " saved to DB.")
          };
          
        })
        // Wait for saves
        await Promise.all(tokenSavePromises)
      })
    }
  });
}

// Triggers an update at app launch
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

    // Get pins from DB (incuding new ones)
    var tokensDataFromDB = await PinToken.find().sort({timestamp:-1});
    var tokenIds = new Array;
    var allTokensData = new Array;

    // Create array indexed by tokenId and tokenIds array
    Object.keys(tokensDataFromDB).map(function (objectKey) {
      allTokensData[tokensDataFromDB[objectKey]["tokenId"]] = tokensDataFromDB[objectKey];
      tokenIds.push(tokensDataFromDB[objectKey]["tokenId"]);
    })

    // Get tokens for this specific user
    var userTokensDataFromDB = await PinToken.find({ owner: { '$regex': new RegExp(req.session.address,"i")} }).sort({timestamp:-1});
    var userTokenIds = new Array;
    var userTokensData = new Array;

    // Create array indexed by tokenId and userTokenIds array
    Object.keys(userTokensDataFromDB).map(function (objectKey) {
      userTokensData[userTokensDataFromDB[objectKey]["tokenId"]] = userTokensDataFromDB[objectKey];
      userTokenIds.push(userTokensDataFromDB[objectKey]["tokenId"]);
    })

    // Render view
    res.render('index', { allTokensData: allTokensData, userTokensData: userTokensData, tokenIds: tokenIds, userTokenIds: userTokenIds });

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

// Generate token asset image - only runs if image does'nt already exist
app.get('/token-metadata/:tokenid',
async function(req, res, next) {
  try {
    // Get token id from URL
    var tokenId = parseInt(req.params.tokenid);

    //Get tokenData
    tokenData = await CryptoCartoContract.methods.getPinToken(tokenId).call();

    // Formatting metadata
    tokenMetadata = {
      'id': tokenData[0],
      'latitude': parseFloat(tokenData[2]) / 10000,
      'longitude': parseFloat(tokenData[3]) / 10000,
      'message': tokenData[4],
      'created_at_utc_timestamp': tokenData[5]
    };
    
    // Render view
    res.render('token-metadata', { tokenMetadata: tokenMetadata });
  } catch (error) { next(error) }
});

// Download a text file with user info
app.get('/save-user-info',
async function(req, res, next) {
  try {

    // Redirect to home if no user info
    if ((typeof req.session.address == 'undefined') || (typeof req.session.privatekey == 'undefined')) {
      res.redirect('/');
      return;
    }

    // Generate user data
    var filename = "CryptoCarto_UserData_" + req.session.address + ".txt";
    var userDataText = "Klaytn Wallet Data for address " + req.session.address + 
                       "\nGenerated by CryptoCarto - https://cryptocarto.xyz" + 
                       "\n-----------------------------------------------------------" + 
                       "\nUse your private key at https://app.cryptocarto.xyz/ to see your tokens and get new ones" +
                       "\nBrowse your collection at https://cypress.explore.bitcrystals.com/address/?address=" + req.session.address +
                       "\nCheck your Klaytn transactions at https://scope.klaytn.com/account/" + req.session.address +
                       "\n-----------------------------------------------------------" + 
                       "\nUser Address: " + req.session.address + 
                       "\nUser Private Key: " + req.session.privatekey + 
                       "\n-----------------------------------------------------------" + 
                       "\nCONFIDENTIAL DATA - KEEP THIS FILE SAFE - ANYONE WITH ACCESS CAN CONSUME YOUR ASSETS";
    
    // Render textfile
    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', 'text/plain');
    res.charset = 'UTF-8';
    res.write(userDataText);
    res.end();
    return;
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
      feePayer: feePayerAddress,
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

// Import an existing private key
app.post('/import-pk',
async function(req, res, next) {
  try {
    const privatekey    = req.body.newprivatekey;

    // Retrieve account for this private key
    retrievedAccount = await caver.klay.accounts.privateKeyToAccount(privatekey);

    // Set session variables
    req.session.address = retrievedAccount.address;
    req.session.privatekey = retrievedAccount.privateKey;

    req.session.generalMessage = 'Account with address ' + retrievedAccount.address.substring(0,10) + '... was succesfully retrieved.';
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


// Transfers a pin token to a new user
app.post('/transfer-pin',
async function(req, res, next) {
  try {

    const newAddress  = req.body.transferaddress;
    const tokenId     = req.body.tokenidtotransfer;

    // sign transaction
    const { rawTransaction: senderRawTransaction } = await caver.klay.accounts.signTransaction({
      type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
      from: req.session.address,
      to: process.env.SMART_CONTRACT_ADDRESS, //Contract on mainnet
      gas: '50000000',
      data: CryptoCartoContract.methods.transferFrom(req.session.address, newAddress, tokenId).encodeABI(),
      value: caver.utils.toPeb('0', 'KLAY'),
    }, req.session.privatekey);
    
    // Send transaction through fee delegation
    await caver.klay.sendTransaction({
      senderRawTransaction: senderRawTransaction,
      feePayer: feePayerAddress,
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

    req.session.generalMessage = 'Token #' + tokenId + ' was transferred to ' + newAddress;

    // Updating token owner
    console.log("Updating token ID #" + tokenId);
    await PinToken.updateMany({ tokenId: tokenId }, { $set: { owner: newAddress } })

    res.redirect('/');

  } catch (error) { next(error) }
});

//Error handler
app.use(function (err, req, res, next) {
  req.session.generalMessage = "Error: " + err.message;
  res.redirect('/');
})

app.listen(port, function(){
	console.log("CryptoCarto now UP on port "+port);
});
