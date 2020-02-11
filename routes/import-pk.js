/*
* Import an existing private key
*/

// Get required interfaces
const caver = require('../utils/caver')

module.exports = async function(req, res, next) {
  try {
    const privatekey    = req.body.newprivatekey;

    // Retrieve account for this private key
    retrievedAccount = await caver.klay.accounts.privateKeyToAccount(privatekey);

    // Set session variables
    req.session.address = retrievedAccount.address;
    req.session.privatekey = retrievedAccount.privateKey;
    req.session.displayname = undefined;

    req.session.generalMessage = 'Account with address ' + retrievedAccount.address.substring(0,10) + '... was succesfully retrieved.';
    res.redirect('/');
  } catch (error) { next(error) }
};