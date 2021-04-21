// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../../interfaces/IRouter.sol";
import "../../interfaces/IERC20_Ex.sol";
import "../../lib/RequestIdBase.sol";

/*
 * Mostly junk implementation for testing Router interaction
 * Bypasses most of the safety checks implemented in the Consumer
 * lib contract.
 */
contract MockBadConsumer is RequestIdBase {

    uint256 public price = 0;
    uint256 public nonce = 0;
    IRouter private router;
    IERC20_Ex private token;

    event ReceivedData(
        bytes32 requestId,
        uint256 price
    );

    constructor(address _router, address _token) {
        router = IRouter(_router);
        token = IERC20_Ex(_token);
    }

    // mimic a contract directly interecting with router and not implementing the Consumer library
    function requestData(address payable _dataProvider, bytes32 _data)
    public returns (bool success) {
        nonce += 1;

        return router.initialiseRequest(
            _dataProvider,
            100,
            _data
        );
    }

    // mimic a contract directly interecting with router and not implementing the Consumer library
    // allow sending arbitrary params for testing
    function requestDataWithAllParams(
        address _dataProvider,
        uint64 _fee,
        bytes32 _data
    )
    public returns (bool success) {
        return router.initialiseRequest(
            _dataProvider,
            _fee,
            _data
        );
    }

    function requestDataWithAllParamsAndRequestId(
        address payable _dataProvider,
        uint64 _fee,
        bytes32 _data
        )
    public returns (bool success) {
        return router.initialiseRequest(
            _dataProvider,
            _fee,
            _data
        );
    }

    function increaseRouterAllowance(uint256 _routerAllowance) public {
        require(token.increaseAllowance(address(router), _routerAllowance), "BadConsumer: failed to increase Router token allowance");
    }

    function rawReceiveData(
        uint256 _price,
        bytes32 _requestId
    )
    public returns (bool success) {
        price = _price;
        emit ReceivedData(_requestId, _price);
        return true;
    }

}
