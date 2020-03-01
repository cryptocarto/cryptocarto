pragma solidity ^0.5.6;

import "./ERC721/ERC721Full.sol";

contract CryptoCartoPinTokenContract is ERC721Full {

    // Owner address and base URL to be set in constructor
    address private _owner;
    address private _admin;
    string private _baseURL;

    modifier _ownerOrAdminOnly() {
      require((msg.sender == _owner) || (msg.sender == _admin), "Function restricted to contract owner or admin");
      _;
    }

    // Events
    event PinTokenEmitted (uint256 indexed tokenId, int256 latitude, int256 longitude, string message, uint256 timestamp);
    event PinTokenModified (uint256 indexed tokenId, string message, uint256 timestamp);
    event ConsumptionRightsChanged (address owner, int256 newConsumptionRights, uint256 lastRefillTimestamp, uint256 eventTimestamp);

    // List of PinToken objects indexed by tokenId
    mapping (uint256 => PinToken) private _pinTokenList;

    // Simple list of all existing token Ids
    uint256[] private _existingTokenIdList;

    // Simple list of all known addresses (which had interactions with consumption rights)
    address[] _allKnownAddresses;

    // Consumption rights per user address
    mapping (address => ConsumptionRight) private _consumptionRights;
    int256 private constant _DAILY_CONSUMPTION_RIGHTS = 5;

    // PinToken object stucture
    struct PinToken {
        uint256 tokenId;    // UID of token
        address creator;    // Original creator of token
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

    // Constructor: sets metadata and contract owner
    constructor() ERC721Full("CryptoCarto PinToken", "CARTO") public {
        _owner = msg.sender;
        _admin = address(0xF04A50cebC74Ac94F690F0b3AA90eA5FF6B65AC9);
        _baseURL = "https://app.cryptocarto.xyz/metadata/pin-token/";
    }

    // Internal function to consume 1 cunsumption right. Also manages rights creation and refill
    function _useOneConsumptionRight(address consummingAddress) internal {

        // Creation of consumption rights record for address if not existing
        if (_consumptionRights[consummingAddress].lastRefillTimestamp == 0) {
            _createConsumptionRightsForAddress(consummingAddress);
        }

        // Refill rights if no refill since at least 22h (1 day with 2h margin)
        if (_consumptionRights[consummingAddress].lastRefillTimestamp < (now - 79200)) {
            _consumptionRights[consummingAddress].rights = _consumptionRights[consummingAddress].rights + _DAILY_CONSUMPTION_RIGHTS;
            _consumptionRights[consummingAddress].lastRefillTimestamp = now;
        }

        // Require at least 1 consumption right
        require(_consumptionRights[consummingAddress].rights > 0, "No consumption rights for this address");

        // Decreases consumption rights by 1
        _consumptionRights[consummingAddress].rights = _consumptionRights[consummingAddress].rights - 1;

        emit ConsumptionRightsChanged(consummingAddress, _consumptionRights[consummingAddress].rights,
                _consumptionRights[consummingAddress].lastRefillTimestamp, now);
    }

    // Internal function to create new cunsumption rights for a given address
    function _createConsumptionRightsForAddress(address newAddress) internal {

        // Creation of consumption rights record for address if not existing
        require(_consumptionRights[newAddress].lastRefillTimestamp == 0, "Need an unknown address to create consumption rights");
        ConsumptionRight memory newConsumptionRight = ConsumptionRight({
            rights : _DAILY_CONSUMPTION_RIGHTS,
            lastRefillTimestamp : now
        });

        _consumptionRights[newAddress] = newConsumptionRight;
        _allKnownAddresses.push(newAddress);
    }

    // Function to mint a new PinToken. Consumes a consumption right
    function mintPinToken(string memory message, int256 latitude, int256 longitude) public {

        // Check latitude and logitude are inbounds
        bool latitudeReq = (latitude >= -899999) && (latitude <= 900000);
        bool longitudeReq = (longitude >= -1799999) && (longitude <= 1800000);
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

        // Check that message is less than 200 characters
        require(bytes(message).length < 200, "Message is too long (200 bytes limit)");

        // Uses 1 consumption right
        _useOneConsumptionRight(msg.sender);

        // Mint token
        _mint(msg.sender, tokenId);

        PinToken memory newPinToken = PinToken({
            tokenId : tokenId,
            creator: msg.sender,
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

    // Returns URI for a givne tokenId
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return string(abi.encodePacked(_baseURL, _numericTokenIdToString(tokenId)));
    }

    // Updates PinToken message. Consumes a consumption right
    function updatePinToken(uint256 tokenId, string memory newMessage) public {
        require(ownerOf(tokenId) == msg.sender, "Cannot update a token that is not own");

        _useOneConsumptionRight(msg.sender);

        _pinTokenList[tokenId].message = newMessage;
        _pinTokenList[tokenId].modificationTimestamp = now;

        emit PinTokenModified(tokenId, newMessage, now);
    }

    // Transfers a PinToken to another user. Consumes a consumption right
    function transferFrom(address from, address to, uint256 tokenId) public {
        super.transferFrom(from, to, tokenId);
        _useOneConsumptionRight(msg.sender);
        _pinTokenList[tokenId].owner = to;
        _pinTokenList[tokenId].modificationTimestamp = now;
    }

    // Return pintoken total count
    function getTotalPinTokenCount() public view returns (uint) {
        return totalSupply();
    }

    // Return all pin tokens Ids
    function getAllPinTokenIds() public view returns(uint256[] memory) {
        return _existingTokenIdList;
    }

    // Retrieve a PinToken by ID
    function getPinToken(uint tokenId) public view
    returns(uint256, address, address, int256, int256, string memory, uint256, uint256) {
        require(_pinTokenList[tokenId].tokenId != 0, "PinToken doesnt exist");
        PinToken memory pinToken = _pinTokenList[tokenId];
        return (
            pinToken.tokenId,
            pinToken.creator,
            pinToken.owner,
            pinToken.latitude,
            pinToken.longitude,
            pinToken.message,
            pinToken.creationTimestamp,
            pinToken.modificationTimestamp);
    }

    // Retrieve remaining consumption rights by address
    function getConsumptionRightsForAddress(address addressToCheck) public view returns(int256, uint256) {
        require(_consumptionRights[addressToCheck].lastRefillTimestamp != 0, "Address unknowned by consumption rights system");
        return (_consumptionRights[addressToCheck].rights, _consumptionRights[addressToCheck].lastRefillTimestamp);
    }

    // Admin function to trigger refill rights for an address (ignores timestamp control and does not reset it)
    // Cannot refill over the _DAILY_CONSUMPTION_RIGHTS limit
    function refillConsumptionRightsForAddress(address addressToRefill) public _ownerOrAdminOnly {
        // Need to know the address and to ensure rights are not over daily refill value
        require(_consumptionRights[addressToRefill].lastRefillTimestamp != 0, "Address unknowned by consumption rights system");
        require(_consumptionRights[addressToRefill].rights < _DAILY_CONSUMPTION_RIGHTS,
            "Address has more consumption rights than the daily refill value");

        _consumptionRights[addressToRefill].rights = _DAILY_CONSUMPTION_RIGHTS;
        emit ConsumptionRightsChanged(addressToRefill, _consumptionRights[addressToRefill].rights,
                _consumptionRights[addressToRefill].lastRefillTimestamp, now);
    }

    // Admin function to trigger refill rights for all known addresses (ignores timestamp control and does not reset it)
    // Cannot refill over the _DAILY_CONSUMPTION_RIGHTS limit
    function refillConsumptionRightsForAll() public _ownerOrAdminOnly {
        for (uint i = 0; i<_allKnownAddresses.length; i++) {
            if (_consumptionRights[_allKnownAddresses[i]].rights < _DAILY_CONSUMPTION_RIGHTS ) {
                _consumptionRights[_allKnownAddresses[i]].rights = _DAILY_CONSUMPTION_RIGHTS;
                emit ConsumptionRightsChanged(_allKnownAddresses[i], _consumptionRights[_allKnownAddresses[i]].rights,
                        _consumptionRights[_allKnownAddresses[i]].lastRefillTimestamp, now);
            }
        }
    }

    // Admin function to add a given rights number for an address (does not reset refill timestamp)
    function addConsumptionRightsForAddress(address addressToRecharge, int256 numberOfRights) public _ownerOrAdminOnly {
        require(numberOfRights > 0, "Need a positive number of rights");

        // Creation of consumption rights record for address if not existing
        if (_consumptionRights[addressToRecharge].lastRefillTimestamp == 0) {
            _createConsumptionRightsForAddress(addressToRecharge);
        }

        _consumptionRights[addressToRecharge].rights = _consumptionRights[addressToRecharge].rights + numberOfRights;
        emit ConsumptionRightsChanged(addressToRecharge, _consumptionRights[addressToRecharge].rights,
                _consumptionRights[addressToRecharge].lastRefillTimestamp, now);
    }

    // Admin function to add a given rights number for all known addresses (does not reset refill timestamp)
    function addConsumptionRightsForAll(int256 numberOfRights) public _ownerOrAdminOnly {
        require(numberOfRights > 0, "Need a positive number of rights");
        for (uint i = 0; i<_allKnownAddresses.length; i++) {
            _consumptionRights[_allKnownAddresses[i]].rights = _consumptionRights[_allKnownAddresses[i]].rights + numberOfRights;
            emit ConsumptionRightsChanged(_allKnownAddresses[i], _consumptionRights[_allKnownAddresses[i]].rights,
                    _consumptionRights[_allKnownAddresses[i]].lastRefillTimestamp, now);
        }
    }

    // Admin function to return all known addresses
    function getAllKnownAddresses() public view _ownerOrAdminOnly returns(address[] memory) {
        return _allKnownAddresses;
    }

    // Helper function to transform a PinTokenID to a string
    function _numericTokenIdToString (uint256 numericTokenId) internal pure returns (string memory) {
            if (numericTokenId == 0) {
                return "0";
            }
            uint i = numericTokenId;
            uint j = numericTokenId;
            uint len;
            while (j != 0) {
                len++;
                j /= 10;
            }
            bytes memory stringTokenId = new bytes(len);
            uint k = len - 1;
            while (i != 0) {
                stringTokenId[k--] = byte(uint8(48 + i % 10));
                i /= 10;
            }
            return string(stringTokenId);
    }

}
