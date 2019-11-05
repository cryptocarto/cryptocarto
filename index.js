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


//Define routes
app.get('/',
async function(req, res, next) {
  try {
    const Caver = require('caver-js')
    const caver = new Caver('https://api.cypress.klaytn.net:8651/')

    // Deployed smart contract address
    const smartContractAddress = process.env.SMART_CONTRACT_ADDRESS

    // Get the ABI
    const fs = require('fs')
    const deployedAbi = fs.readFileSync('deployedABI', 'utf8')
    
    // Setting Cryptocarto account for pulls
    const account = caver.klay.accounts.wallet.add(process.env.KLAYTN_WALLET_KEY_FOR_CALLS)
    
    // Setting contract
    const CryptoCartoContract = deployedAbi
      && smartContractAddress
      && new caver.klay.Contract(JSON.parse(deployedAbi), smartContractAddress)
    
    // Getting pin data
    CryptoCartoContract.methods.getAllPinTokenIds().call().then(async function(tokenIds){
        var allTokensData = new Array;
        for(tokenId of tokenIds) {
            tokenDataReturned = await CryptoCartoContract.methods.getPinToken(tokenId).call()
            allTokensData[tokenDataReturned[0]] = tokenDataReturned;
        }

        // Render view
        res.render('index', { allTokensData: allTokensData, tokenIds: tokenIds });
    })
  } catch (error) { next(error) }
});

app.listen(port, function(){
	console.log("CryptoCarto now UP on port "+port);
});
