var express = require('express');
const dotenv = require('dotenv');
dotenv.config();
var port = process.env.PORT || 4210;
var app = express();

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use('/leaflet', express.static(__dirname + '/leaflet')); // redirect leaflet
app.use('/js', express.static(__dirname + '/js')); // redirect js
app.use('/css', express.static(__dirname + '/css')); // redirect css
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));

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
const deployedAbi = fs.readFileSync('deployedABI', 'utf8')

// Setting Cryptocarto account for pulls
// const account = caver.klay.accounts.wallet.add(process.env.KLAYTN_WALLET_KEY_FOR_CALLS)

// Setting contract
const CryptoCartoContract = deployedAbi
  && smartContractAddress
  && new caver.klay.Contract(JSON.parse(deployedAbi), smartContractAddress)

// Setting up fee delegation structure
const feePayerAddress = process.env.FEE_PAYER_ADDRESS;
const feePayerPrivateKey = process.env.FEE_PAYER_PRIVATE_KEY;
caver.klay.accounts.wallet.add(feePayerPrivateKey, feePayerAddress);

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

    // Getting pin data
    CryptoCartoContract.methods.getAllPinTokenIds().call().then(async function(tokenIds){

        // Getting token data in parallel
        const tokenDataPromises = tokenIds.map(async function(tokenId){
          return CryptoCartoContract.methods.getPinToken(tokenId).call()
        });

        // Waiting for execution and retrieving
         await Promise.all(tokenDataPromises).then(function(result){
          var allTokensData = new Array;
          result.forEach(tokenData => {
            allTokensData[tokenData[0]] = tokenData;
          })

          // Sort tokens by timestamp DESC
          tokenIds.sort((a, b) => allTokensData[b][5] - allTokensData[a][5])

          // Render view
           res.render('index', { allTokensData: allTokensData, tokenIds: tokenIds });
         })

    })
  } catch (error) { next(error) }
});

app.post('/new-transaction',
async function(req, res, next) {
  try {

    const message    = req.body.message;
    const longitude  = Math.floor(parseFloat(req.body.longitude) * 10000);
    const latitude   = Math.floor(parseFloat(req.body.latitude) * 10000);

    // Check latitude and logitude are inbounds
    latitudeReq = latitude != 0 && (latitude >= -899999) && (latitude <= 900000);
    longitudeReq = longitude != 0 && (longitude >= -1799999) && (longitude <= 1800000);

    if (!latitudeReq || !longitudeReq) {
      req.session.generalMessage = 'Lat/lon out of bounds';
      res.redirect('/new-transaction');
      return;
    }

    // sign transaction
    const { rawTransaction: senderRawTransaction } = await caver.klay.accounts.signTransaction({
      type: 'FEE_DELEGATED_SMART_CONTRACT_EXECUTION',
      from: req.session.address,
      to: process.env.SMART_CONTRACT_ADDRESS, //Contract on mainnet
      gas: '50000000',
      data: CryptoCartoContract.methods.mintPinToken(message, longitude, latitude).encodeABI(),
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

    res.redirect('/');

  } catch (error) { next(error) }
});

app.listen(port, function(){
	console.log("CryptoCarto now UP on port "+port);
});
