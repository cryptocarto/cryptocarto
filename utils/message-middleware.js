/*
* General message middleware
*/

module.exports = function (req, res, next) {
    if (typeof req.session.generalMessage != 'undefined') {
        res.locals.generalMessage = req.session.generalMessage;
        req.session.generalMessage = "";
    }

    if (typeof req.session.address != 'undefined') {
        res.locals.address = req.session.address;
    }

    if (typeof req.session.privatekey != 'undefined') {
        res.locals.privatekey = req.session.privatekey;
    }

    if (typeof req.session.currentlat != 'undefined') {
        res.locals.currentlat = req.session.currentlat;
    }

    if (typeof req.session.currentlng != 'undefined') {
        res.locals.currentlng = req.session.currentlng;
    }

    if (typeof req.session.displayname != 'undefined') {
        res.locals.displayname = req.session.displayname;
    }

    if (typeof req.session.userlevel != 'undefined') {
        res.locals.userlevel = req.session.userlevel;
    }

    if (typeof req.session.consumptionrights != 'undefined') {
        res.locals.consumptionrights = req.session.consumptionrights;
    }

    if (typeof req.session.consumptionrightslastrefill != 'undefined') {
        res.locals.consumptionrightslastrefill = req.session.consumptionrightslastrefill;
    }

    if (typeof req.session.notEnoughRights != 'undefined') {
        res.locals.notEnoughRights = req.session.notEnoughRights;
    }

    if (typeof req.session.openPinId != 'undefined') {
        res.locals.openPinId = req.session.openPinId;
        req.session.openPinId = "";
    }

    if (typeof req.session.kaikasInUse != 'undefined') {
        res.locals.kaikasInUse = req.session.kaikasInUse;
    }

    next()
}