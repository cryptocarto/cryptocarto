/*
* Use Kaikas address in app after wallet connection
* Previously used private key is kept to restore previous account when kaikas disconnects
*/

module.exports = async function(req, res, next) {
  try {
    const kaikasAddress    = req.body.kaikasaddress;

    // Set session variables
    req.session.address = kaikasAddress;
    req.session.kaikasInUse = true;
    req.session.displayname = undefined;
    req.session.consumptionrights = undefined;
    req.session.consumptionrightslastrefill = undefined;

    req.session.generalMessage = 'Kaikas account ' + kaikasAddress.substring(0,10) + '... connected.';
    res.send('Done');

  } catch (error) { next(error) }
};