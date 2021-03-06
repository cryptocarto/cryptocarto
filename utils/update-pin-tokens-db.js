/*
* Function to update PinToken DB from blockchain
*/

// Get required interfaces
const CryptoCartoContract = require('./cryptocarto-contract')
const PinToken = require('./pintoken')

module.exports = async function () {
    try{
        await CryptoCartoContract.methods.getAllPinTokenIds().call().then(async function(tokenIds){
            // Exclude known Pins from lookup (pins already in DB)
            tokenIdsToLookup = tokenIds;
            currentPinIds = await PinToken.distinct("tokenId");
            tokenIdsToLookup = tokenIds.filter(x => !currentPinIds.includes(x));

            // Limit parallel queries to 200 first elements for scale
            tokenIdsToLookup = tokenIdsToLookup.slice(0,200);
            
            // If new tokens, save them in DB
            if (tokenIdsToLookup.length > 0) {

                // Getting token data in parallel
                const tokenDataPromises = tokenIdsToLookup.map(async function(tokenId){
                    return CryptoCartoContract.methods.getPinToken(tokenId).call()
                });

                // Waiting for blockchain return, then saves to DB
                await Promise.all(tokenDataPromises).then(async function(result) {
                    try{
                        // Saves new tokens to DB
                        const tokenSavePromises = Object.keys(result).map(async function (objectKey) {
                        var newPinToken = new PinToken({
                            tokenId : result[objectKey][0],
                            creator : result[objectKey][1],
                            owner: result[objectKey][2],
                            latitude : result[objectKey][3],
                            longitude : result[objectKey][4],
                            message : result[objectKey][5],
                            creationTimestamp : result[objectKey][6],
                            modificationTimestamp : result[objectKey][7]
                        });
                        
                        // Saves if not existing
                        if (!await PinToken.countDocuments({ tokenId: newPinToken.tokenId })) {
                            await newPinToken.save();
                            console.log("PinToken #" + newPinToken.tokenId + " saved to DB.")
                        };
                        
                        })
                        // Wait for saves
                        await Promise.all(tokenSavePromises)
                        
                    } catch (error) {
                        console.error(error);
                    }
                })
            }
        });
    } catch (error) {
        console.error(error);
    }
}