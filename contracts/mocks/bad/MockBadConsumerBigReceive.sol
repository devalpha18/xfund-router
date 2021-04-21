// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

import "../../lib/ConsumerBase.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract MockBadConsumerBigReceive is ConsumerBase {
    using SafeMath for uint256;

    uint256 public price;
    uint256 public price2;
    uint256 public price3;
    uint256 arbitraryCounter;

    // Can be called when data provider has sent data
    event GotSomeData(address router, bytes32 requestId, uint256 price);
    event BiggerEvent(address indexed router, bytes32 indexed requestId, uint256 price, bytes32 sigSha, bytes32 someSha);
    event DoneDeletified(bytes32 indexed requestId);
    event Counted(uint256 newCounterVal);

    constructor(address _router, address _xfund)
    ConsumerBase(_router, _xfund) {
        price = 0;
        arbitraryCounter = 0;
    }

    function getData(address _dataProvider, uint256 _fee, bytes32 _data) external {
        _requestData(_dataProvider, _fee, _data);
    }

    function setPrice(uint256 _price) external {
        price = _price;
    }

    function receiveData(
        uint256 _price,
        bytes32 _requestId
    )
    internal override {
        price = _price;
        price2 = _price.mul(2);
        price3 = _price.div(2);
        emit GotSomeData(msg.sender, _requestId, _price);

        bytes32 someSha = keccak256(
            abi.encodePacked(
                price,
                price2,
                price3,
                _requestId
            )
        );

        bytes32 pointlessSigSha = keccak256(abi.encodePacked(_requestId, price));

        emit BiggerEvent(msg.sender, _requestId, _price, pointlessSigSha, someSha);

        for(uint i = 0; i < 100; i++) {
            arbitraryCounter = arbitraryCounter + 1;
        }

        emit Counted(arbitraryCounter);

        emit DoneDeletified(_requestId);
    }
}
