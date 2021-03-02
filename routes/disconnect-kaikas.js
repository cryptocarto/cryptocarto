/*
* Restore previous account when kaikas disconnects
*/

// Get required interfaces
const caver = require('../utils/caver')

module.exports = async function(req, res, next) {
  try {
    // Retrieve account for stored private key
    retrievedAccount = await caver.klay.accounts.privateKeyToAccount(req.session.privatekey);

    // Set session variables
    req.session.address = retrievedAccount.address;
    req.session.privatekey = retrievedAccount.privateKey;
    req.session.kaikasInUse = false;
    req.session.displayname = undefined;
    req.session.consumptionrights = undefined;
    req.session.consumptionrightslastrefill = undefined;

    req.session.generalMessage = 'Kaikas account disconnected.';
    res.send('Done');

  } catch (error) { next(error) }
};