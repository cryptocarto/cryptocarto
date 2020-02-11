/*
* Change user display name
*/

// Get required interfaces
const DisplayName = require('../utils/displayname')

module.exports = async function(req, res, next) {
  try {
    const newname = req.body.newname.substring(0,20);
    const address = req.session.address;

    // Save this address/name couple to database or update if existing
    var newDisplayName = new DisplayName({
      address : req.session.address,
      name: newname
    });

    if (await DisplayName.countDocuments({ address: address })) {
      await DisplayName.updateMany({ address: address }, { $set: { name: newname }})
    } else {
      await newDisplayName.save()
    }

    // Set session variable
    req.session.displayname = newname;

    req.session.generalMessage = 'Display name for address ' + address.substring(0,10) + ' changed to "' + newname + '".';
    res.redirect('/');
  } catch (error) { next(error) }
};