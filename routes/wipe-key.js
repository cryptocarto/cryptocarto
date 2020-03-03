/*
* Wipe current key in session
*/

module.exports = async function(req, res, next) {
  try {
    // Set session variables
    req.session.address = undefined;
    req.session.privatekey = undefined;
    req.session.displayname = undefined;
    req.session.consumptionrights = undefined;
    req.session.consumptionrightslastrefill = undefined;

    req.session.generalMessage = 'Account wiped.';
    res.redirect('/');
  } catch (error) { next(error) }
};