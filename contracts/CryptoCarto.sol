pragma solidity ^0.5.6;

import "./ERC721/ERC721.sol";
import "./ERC721/ERC721Enumerable.sol";

contract CryptoCarto is ERC721, ERC721Enumerable {

    mapping (uint256 => PinToken) private _pinTokenList;

    struct PinToken {
        uint256 tokenId;    // UID of token
        int256 latitude;    // Latitude with 8 decimals (-90,000,000 to +90,000,000)
        int256 longitude;   // Longitude with 8 decimals (-180,000,000 to +180,000,000)
        string message;     // Message to display at this position
        uint256 timestamp;  // Timestamp
    }

    function postMessage(string memory message, int256 latitude, int256 longitude) public {
        uint256 tokenId = totalSupply() + 1;

        _mint(msg.sender, tokenId);

        PinToken memory newPinToken = PinToken({
            tokenId : tokenId,
            latitude : latitude,
            longitude : longitude,
            message : message,
            timestamp : now
        });

        _pinTokenList[tokenId] = newPinToken;
    }

    function getPinToken (uint tokenId) public view
    returns(uint256, int256, int256, string memory, uint256) {
        require(_pinTokenList[tokenId].tokenId != 0, "PinToken doesnt exist");
        return (
            _pinTokenList[tokenId].tokenId,
            _pinTokenList[tokenId].latitude,
            _pinTokenList[tokenId].longitude,
            _pinTokenList[tokenId].message,
            _pinTokenList[tokenId].timestamp);
    }
}
