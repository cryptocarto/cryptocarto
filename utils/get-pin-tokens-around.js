/*
* Function to get PinTokens around given lat/lng - getPinTokensAround
*/

// Get required interfaces
const PinToken = require('./pintoken')

module.exports = async function (latitude, longitude, userAddress) {
    // Get pins from DB (incuding new ones)
    var params = { 
      latitude: { $lt: latitude*10000+1000, $gt: latitude*10000-1000},
      longitude: { $lt: longitude*10000+1000, $gt: longitude*10000-1000}
    };

    var tokensDataFromDB = await PinToken.find(params).sort({timestamp:-1});
    var tokenIds = new Array;
    var allTokensData = new Array;

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