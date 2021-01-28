// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../../interfaces/IRouter.sol";
import "../../interfaces/IERC20_Ex.sol";

/*
 * Mostly junk implementation for testing Router interaction
 * Bypasses most of the safety checks implemented in the Consumer
 * lib contract.
 */
contract MockBadConsumer {

    uint256 public price = 0;
    uint256 public nonce = 0;
    IRouter private router;
    IERC20_Ex private token;

    event ReceivedData(
        bytes32 requestId,
        uint256 price
    );

    // Mirrored Router events for web3 client decoding & testing
    // DataRequested event. Emitted when a data request has been initialised
    event DataRequested(
        address indexed dataConsumer,
        address indexed dataProvider,
        uint64 fee,
        bytes32 data,
        bytes32 indexed requestId,
        uint64 gasPrice,
        uint64 expires
    );

    constructor(address _router) public {
        router = IRouter(_router);
        token = IERC20_Ex(router.getTokenAddress());
    }

    // mimic a contract directly interecting with router and not implementing the Consumer library
    function requestData(address payable _dataProvider, bytes32 _data)
    public returns (bool success) {
        nonce += 1;
        bytes32 requestId = keccak256(
            abi.encodePacked(
                address(this),
                _dataProvider,
                address(router),
                nonce
            )
        );

        return router.initialiseRequest(
            _dataProvider,
            100,
            nonce,
                uint64(20000000000),
                uint64(now + 300),
            requestId,
            _data
        );
    }

    // mimic a contract directly interecting with router and not implementing the Consumer library
    // allow sending arbitrary params for testing
    function requestDataWithAllParams(
        address payable _dataProvider,
        uint64 _fee,
        uint256 _nonce,
        bytes32 _data,
        uint64 _gasPriceGwei,
        uint64 expires
    )
    public returns (bool success) {
        bytes32 requestId = keccak256(
            abi.encodePacked(
                address(this),
                _dataProvider,
                address(router),
                _nonce
            )
        );

        return router.initialiseRequest(
            _dataProvider,
            _fee,
            _nonce,
            _gasPriceGwei,
            expires,
            requestId,
            _data
        );
    }

    function requestDataWithAllParamsAndRequestId(
        address payable _dataProvider,
        uint64 _fee,
        uint256 _nonce,
        bytes32 _data,
        uint64 _gasPriceGwei,
        uint64 expires,
        bytes32 _requestId
        )
    public returns (bool success) {
        return router.initialiseRequest(
            _dataProvider,
            _fee,
            _nonce,
            _gasPriceGwei,
            expires,
            _requestId,
            _data
        );
    }

    function cancelDataRequest(bytes32 _requestId) public returns (bool success) {
        return router.cancelRequest(_requestId);
    }

    function addDataProviderToRouter(address _dataProvider) public {
        require(router.grantProviderPermission(_dataProvider), "BadConsumer: failed to grant dataProvider on Router");
    }

    function removeDataProviderFromRouter(address _dataProvider) public {
        require(router.revokeProviderPermission(_dataProvider), "BadConsumer: failed to revoke dataProvider on Router");
    }

    function increaseRouterAllowance(uint256 _routerAllowance) public {
        require(token.increaseAllowance(address(router), _routerAllowance), "BadConsumer: failed to increase Router token allowance");
    }

    function topUpGas(address _dataProvider)
    public
    payable returns (bool success) {
        return router.topUpGas{value:msg.value}(_dataProvider);
    }

    function withDrawGasTopUpForProvider(address _dataProvider)
    public returns (uint256 amountWithdrawn) {
        return router.withDrawGasTopUpForProvider(_dataProvider);
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
