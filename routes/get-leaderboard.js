/*
* Ajax return to display leaderboard
*/

// Get required interfaces
const PinToken = require('../utils/pintoken')
const DisplayName = require('../utils/displayname')

module.exports = async function(req, res, next) {
  try {

    // Retrieve leaderboard data from DB for pure tokens (owner == creator)
    var leaderboardData = await PinToken.aggregate([
      { $match: { $expr: {$eq: ['$creator','$owner'] }}},
      { $group: { _id: {$toLower:'$owner'}, pureTokens: {$sum: 1} }},
      { $sort: { pureTokens : -1 }},
      { $limit: 20 }
    ]);

    // Create an array for all addresses and assigns levels
    var allAddresses = new Array;
    var levels = [0,3,9,19,39,69,119];
    Object.keys(leaderboardData).map(function (objectKey) {
      // Build an array of every unique addresses
      if (allAddresses.indexOf(leaderboardData[objectKey]["_id"].toLowerCase()) == -1) {
        allAddresses.push(leaderboardData[objectKey]["_id"].toLowerCase());
      }

      // Assigns user level
      userLevel = 0;
      while (leaderboardData[objectKey]["pureTokens"] > levels[userLevel] && userLevel < levels.length) {
        userLevel++;
      }
      leaderboardData[objectKey]["userLevel"] = userLevel;
    })

    // Lookup display names for displayed tokens
    var displayNamesFromDB = await DisplayName.find({'address' : { $in : allAddresses }});
    var displayNames = new Array;

    // Create display name array
    Object.keys(displayNamesFromDB).map(function (objectKey) {
      displayNames[displayNamesFromDB[objectKey]["address"]] = displayNamesFromDB[objectKey]["name"] + 
      " (" + displayNamesFromDB[objectKey]["address"].substring(2,8) + ")";
    })

    // Add display name in leaderboardData
    Object.keys(leaderboardData).map(function (objectKey) {
      if (leaderboardData[objectKey]["_id"].toLowerCase() in displayNames) {
        // If owner has a display name
        leaderboardData[objectKey]["displayName"] = displayNames[leaderboardData[objectKey]["_id"].toLowerCase()];
      } else {
        // Else, use 10 first chars of address
        leaderboardData[objectKey]["displayName"] = leaderboardData[objectKey]["_id"].substring(0,10);
      }
    })

    res.render('leaderboard-data', { leaderboard: leaderboardData } );
   } catch (error) { next(error) }

};