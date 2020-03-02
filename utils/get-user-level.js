/*
* Function to retrieve user level - getUserLevel(address)
*/

// Get required interfaces
const PinToken = require('./pintoken')

module.exports = async function (userAddress) {
  try {
    var pureTokenCount = await PinToken.countDocuments({ 
      owner: { '$regex': new RegExp(userAddress,"i")},
      creator: { '$regex': new RegExp(userAddress,"i")}
    });

    var userLevel = 0;

    // Define level steps
    var levels = [0,3,9,19,39,69,119];

    while (pureTokenCount > levels[userLevel] && userLevel < levels.length) {
      userLevel++;
    }

    return userLevel;
  } catch (error) {
    console.error(error);
  }  
}