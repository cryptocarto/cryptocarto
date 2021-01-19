/*
* Function to get PinTokens in given map bounds - getPinTokensInBounds
*/

// Get required interfaces
const PinToken = require('./pintoken')
const DisplayName = require('./displayname')

module.exports = async function (lowLatitude, highLatitude, lowLongitude, highLongitude) {

    // Calculate margin as a 50% more than current map displayed
    latMargin = Math.abs(highLatitude - lowLatitude) * 0.5;
    lngMargin = Math.abs(highLongitude - lowLongitude) * 0.5;

    // Get pins from DB (incuding new ones)
    var params = { 
      latitude: { 
        $lt: highLatitude*10000+Math.max(latMargin*10000, 100), 
        $gt: lowLatitude*10000-Math.max(latMargin*10000, 100)
      },
      longitude: { 
        $lt: highLongitude*10000+Math.max(lngMargin*10000, 100), 
        $gt: lowLongitude*10000-Math.max(lngMargin*10000, 100) 
      }
    };

    // Calculate center point
    latitude = (lowLatitude + highLatitude) / 2.0;
    longitude = (lowLongitude + highLongitude) / 2.0;

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

    return [allTokensData, tokenIds, displayNames];
}