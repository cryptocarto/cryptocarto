/*
* Change user display name
*/

// Get required interfaces
const DisplayName = require('../utils/displayname')
const caver = require('../utils/caver')

module.exports = async function(req, res, next) {
  try {
    var newname = req.body.newname.substring(0,20);
    const address = req.session.address.toLowerCase();

    // If kaikas is in use, name change must be signed
    if (req.session.kaikasInUse && typeof req.body.signedmsg == 'undefined') {
      req.session.generalMessage = 'Display name change with Kaikas must be signed';
      res.send('Error');
      return;
    }

    // Check if message signature is valid
    if (req.session.kaikasInUse) {
      addressUsedToSign = caver.klay.accounts.recover(
        "Change name to: '" + newname + "'",
        req.body.signedmsg
      );
      if (addressUsedToSign.toLowerCase() != req.session.address.toLowerCase()) {
        req.session.generalMessage = 'Message signature for name change is invalid';
        res.send('Error');
        return;
      }
    }

    // Save this address/name couple to database or update if existing
    var newDisplayName = new DisplayName({
      address : address,
      name: newname
    });

    if (newname == "") {
      await DisplayName.deleteMany({ address: address });
      newname = undefined;
    } else if (await DisplayName.countDocuments({ address: address })) {
      await DisplayName.updateMany({ address: address }, { $set: { name: newname }})
    } else {
      await newDisplayName.save()
    }

    // Set session variable
    req.session.displayname = newname;

    req.session.generalMessage = 'Display name for address ' + address.substring(0,10) + ' changed to "' + newname + '".';

    // Reload only if CC tx
    if (typeof req.body.signedmsg == 'undefined') {
      res.redirect('/');
    } else {
      res.send('Done');
    }
  } catch (error) { next(error) }
};