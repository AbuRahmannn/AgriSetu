// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Traceability {
    struct Entry {
        uint id;
        string productId;
        string farmer;
        string location;
        string timestamp;
        string status;
    }
    mapping(uint => Entry) public entries;
    uint public count = 0;
    event NewEntry(uint id, string productId, string farmer, string location, string timestamp, string status);

    function addEntry(string memory productId, string memory farmer, string memory location, string memory timestamp, string memory status) public {
        count += 1;
        entries[count] = Entry(count, productId, farmer, location, timestamp, status);
        emit NewEntry(count, productId, farmer, location, timestamp, status);
    }

    function getEntry(uint id) public view returns (Entry memory) {
        return entries[id];
    }
}
