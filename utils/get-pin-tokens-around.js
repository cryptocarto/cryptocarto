/*
* Function to get PinTokens around given lat/lng - getPinTokensAround
*/

// Get required interfaces
const PinToken = require('./pintoken')
const DisplayName = require('./displayname')

module.exports = async function (latitude, longitude, userAddress) {
    // Get pins from DB (incuding new ones)
    var params = { 
      latitude: { $lt: latitude*10000+1000, $gt: latitude*10000-1000},
      longitude: { $lt: longitude*10000+1000, $gt: longitude*10000-1000}
    };

    // Get tokens sorted by distance from center
    var tokensDataFromDB = await PinToken.find(params);
    tokensDataFromDB.sort(function(doc1, doc2) { 
      doc1DistanceToCenter = Math.sqrt(
        Math.pow(Math.abs(Math.abs(doc1.latitude) - Math.abs(latitude*10000)), 2) + 
        Math.pow(Math.abs(Math.abs(doc1.longitude) - Math.abs(longitude*10000)), 2)
      );
      doc2DistanceToCenter = Math.sqrt(
        Math.pow(Math.abs(Math.abs(doc2.latitude) - Math.abs(latitude*10000)), 2) + 
        Math.pow(Math.abs(Math.abs(doc2.longitude) - Math.abs(longitude*10000)), 2)
      );
      return doc1DistanceToCenter - doc2DistanceToCenter
    });

    var tokenIds = new Array;
    var allTokensData = new Array;
    var allAddresses = new Array;

    // Create array indexed by tokenId and tokenIds array
    Object.keys(tokensDataFromDB).map(function (objectKey) {
      allTokensData[tokensDataFromDB[objectKey]["tokenId"]] = tokensDataFromDB[objectKey];
      tokenIds.push(tokensDataFromDB[objectKey]["tokenId"]);

      // Build an array of every unique addresses
      if (allAddresses.indexOf(tokensDataFromDB[objectKey]["owner"]) == -1) {
        allAddresses.push(tokensDataFromDB[objectKey]["owner"]);
      }
    })

    // Lookup display names for displayed tokens
    var displayNamesFromDB = await DisplayName.find({'address' : { $in : allAddresses }});
    var displayNames = new Array;

    // Create display name array
    Object.keys(displayNamesFromDB).map(function (objectKey) {
      displayNames[displayNamesFromDB[objectKey]["address"]] = displayNamesFromDB[objectKey]["name"];
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
    
    return [allTokensData, tokenIds, userTokensData, userTokenIds, displayNames];
}