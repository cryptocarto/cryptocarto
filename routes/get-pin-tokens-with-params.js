/*
* Ajax return to refresh displayed pins with data around current point
*/

// Get required interfaces
getPinTokensWithParams = require('../utils/get-pin-tokens-with-params')

module.exports = async function(req, res, next) {
  try {
    // Control params presence
    if (!req.body.params) {
      throw new Error('Params are needed.')
    }
    
    var params   = req.body.params;
    var queryInfo = "";

    // Add case insensitive filter on owner param is present
    if ('owner' in params) {
      queryInfo = params["owner"];
      params["owner"] = { '$regex': new RegExp(params["owner"],"i")};
    }
    
    [tokensData, tokenIds] = await getPinTokensWithParams(params);
    res.render('token-data', { tokensData: tokensData, tokenIds: tokenIds, queryInfo: queryInfo } );
   } catch (error) { next(error) }

};