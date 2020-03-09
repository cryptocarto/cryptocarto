/*
* Function to get PinTokens for given params - getPinTokensWithParams()
*/

// Get required interfaces
const PinToken = require('./pintoken')
const DisplayName = require('./displayname')

module.exports = async function (params) {
    // Get pins from DB
    var tokensDataFromDB = await PinToken.find(params).sort({modificationTimestamp: -1});

    var tokenIds = new Array;
    var tokensData = new Array;
    var allAddresses = new Array;

    // Create array indexed by tokenId and tokenIds array
    Object.keys(tokensDataFromDB).map(function (objectKey) {
      tokensData[tokensDataFromDB[objectKey]["tokenId"]] = tokensDataFromDB[objectKey];
      tokenIds.push(tokensDataFromDB[objectKey]["tokenId"]);

      // Build an array of every unique addresses
      if (allAddresses.indexOf(tokensDataFromDB[objectKey]["owner"].toLowerCase()) == -1) {
        allAddresses.push(tokensDataFromDB[objectKey]["owner"].toLowerCase());
      }
    })

    // Lookup display names for displayed tokens
    var displayNamesFromDB = await DisplayName.find({'address' : { $in : allAddresses }});
    var displayNames = new Array;

    // Create display name array
    Object.keys(displayNamesFromDB).map(function (objectKey) {
      displayNames[displayNamesFromDB[objectKey]["address"]] = displayNamesFromDB[objectKey]["name"] + 
      " (" + displayNamesFromDB[objectKey]["address"].substring(2,8) + ")";
    })

    // Add display name in tokensData
    Object.keys(tokensData).map(function (objectKey) {
      if (tokensData[objectKey]["owner"].toLowerCase() in displayNames) {
        // If owner has a display name
        tokensData[objectKey]["displayName"] = displayNames[tokensData[objectKey]["owner"].toLowerCase()];
      } else {
        // Else, use 10 first chars of address
        tokensData[objectKey]["displayName"] = tokensData[objectKey]["owner"].substring(0,10);
      }
    })

    return [tokensData, tokenIds];
}