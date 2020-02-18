pragma solidity ^0.5.6;

import "./ERC721/ERC721Full.sol";

contract CryptoCarto is ERC721Full {

    // Events
    event PinTokenEmitted (uint256 indexed tokenId, int256 latitude, int256 longitude, string message, uint256 timestamp);
    event ConsumptionRightsChanged (address owner, int256 newConsumptionRights, uint256 timestamp);

    // List of PinToken objects indexed by tokenId 
    mapping (uint256 => PinToken) private _pinTokenList;

    // Simple list of all existing token Ids
    uint256[] private _existingTokenIdList;

    // Consumption rights per user address
    mapping (address => ConsumptionRight) private _consumptionRights;
    int256 private constant _DAILY_CONSUMPTION_RIGHTS = 5;

    // PinToken object stucture
    struct PinToken {
        uint256 tokenId;    // UID of token
        address owner;      // Owner of token
        int256 latitude;    // Latitude with 4 decimals (11.132m / -899,999 to +900,000)
        int256 longitude;   // Longitude with 4 decimals (11.132m / -1,799,999 to +1,800,000)
        string message;     // Message to display at this position
        uint256 creationTimestamp;  // Creation timestamp
        uint256 modificationTimestamp;  // Modification timestamp
    }

    // ConsumptionRight object stucture
    struct ConsumptionRight {
        int256 rights;                // Consumption rights counter
        uint256 lastRefillTimestamp;   // Timestamp of last refill
    }

    function _useOneConsumptionRight(address consummingAddress) internal {

        // Creation of consumption rights record for address if not existing
        if (_consumptionRights[consummingAddress].lastRefillTimestamp == 0) {
            ConsumptionRight memory newConsumptionRight = ConsumptionRight({
                rights : _DAILY_CONSUMPTION_RIGHTS,
                lastRefillTimestamp : now
            });

            _consumptionRights[consummingAddress] = newConsumptionRight;
            emit ConsumptionRightsChanged(consummingAddress, _consumptionRights[consummingAddress].rights, now);
        }

        // Refill rights if no refill since at least 24h
        if (_consumptionRights[consummingAddress].lastRefillTimestamp < (now - 86400)) {
            _consumptionRights[consummingAddress].rights = _consumptionRights[consummingAddress].rights + _DAILY_CONSUMPTION_RIGHTS;
            _consumptionRights[consummingAddress].lastRefillTimestamp = now;
            emit ConsumptionRightsChanged(consummingAddress, _consumptionRights[consummingAddress].rights, now);
        }

        // Require at least 1 consumption right
        require(_consumptionRights[consummingAddress].rights > 0, "No consumption rights for this address");

        // Decreases consumption rights by 1
        _consumptionRights[consummingAddress].rights = _consumptionRights[consummingAddress].rights - 1;

        emit ConsumptionRightsChanged(consummingAddress, _consumptionRights[consummingAddress].rights, now);
    }

    function mintPinToken(string memory message, int256 latitude, int256 longitude) public {

        // Check latitude and logitude are inbounds
        bool latitudeReq = latitude != 0 && (latitude >= -899999) && (latitude <= 900000);
        bool longitudeReq = longitude != 0 && (longitude >= -1799999) && (longitude <= 1800000);
        require((latitudeReq && longitudeReq), "Lat/lon out of bounds");

        // Create variables for latitude and longitude formatting
        int idFormattedLatitude = latitude;
        int idFormattedLongitude = longitude;

        // Compute latitude for id format
        if (latitude < 0) {
            idFormattedLatitude = (0 - latitude) + 1000000;
        }

        // Compute longitude for id format
        if (longitude < 0) {
            idFormattedLongitude = (0 - longitude) + 10000000;
        }

        // Generate tokenId with format (negLat?1;0)latitude(negLon?1;0)longitude
        uint256 tokenId = uint256((idFormattedLatitude * 100000000) + idFormattedLongitude);

        // Check token doesnt already exist
        require(_pinTokenList[tokenId].tokenId == 0, "PinToken already exists");

        // Uses 1 consumption right
        _useOneConsumptionRight(msg.sender);

        // Mint token
        _mint(msg.sender, tokenId);

        PinToken memory newPinToken = PinToken({
            tokenId : tokenId,
            owner: msg.sender,
            latitude : latitude,
            longitude : longitude,
            message : message,
            creationTimestamp : now,
            modificationTimestamp : now
        });

        _pinTokenList[tokenId] = newPinToken;
        _existingTokenIdList.push(tokenId);

        emit PinTokenEmitted(tokenId, latitude, longitude, message, now);
    }

    // Update owner on transfer
    function transferFrom(address from, address to, uint256 tokenId) public {
        super.transferFrom(from, to, tokenId);
        _pinTokenList[tokenId].owner = to;
    }

    // Return pintoken total count
    function getTotalPinTokenCount() public view returns (uint) {
        return totalSupply();
    }

    // Return all pin tokens Ids
    function getAllPinTokenIds() public view returns(uint256[] memory) {
        return _existingTokenIdList;
    }

    //TODO: getAllPinTokensInRange

    // Retrieve a PinToken by ID
    function getPinToken (uint tokenId) public view
    returns(uint256, address, int256, int256, string memory, uint256, uint256) {
        require(_pinTokenList[tokenId].tokenId != 0, "PinToken doesnt exist");
        return (
            _pinTokenList[tokenId].tokenId,
            _pinTokenList[tokenId].owner,
            _pinTokenList[tokenId].latitude,
            _pinTokenList[tokenId].longitude,
            _pinTokenList[tokenId].message,
            _pinTokenList[tokenId].creationTimestamp,
            _pinTokenList[tokenId].modificationTimestamp);
    }

}
