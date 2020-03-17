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
    
    var requestParams   = req.body.params;
    var params = new Object;
    var queryInfo = "";

    // Pins by owner
    if ('owner' in requestParams) {
      queryInfo = requestParams["owner"];
      params = {
        "filter" : {owner: { '$regex': new RegExp(requestParams["owner"],"i") }},
        "sort" : {modificationTimestamp: -1},
        "limit": 0
      }
    }

    // Recent pins
    if ('recent' in requestParams) {
      queryInfo = "recent pins";
      params = {
        "filter" : {},
        "sort" : {creationTimestamp: -1},
        "limit": 100
      }
      params["creationTimestamp"] = { '$gt': new RegExp(params["owner"],"i")};
    }
    
    [tokensData, tokenIds] = await getPinTokensWithParams(params);
    res.render('token-data', { tokensData: tokensData, tokenIds: tokenIds, queryInfo: queryInfo } );
   } catch (error) { next(error) }

};