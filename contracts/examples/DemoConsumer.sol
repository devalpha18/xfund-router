// SPDX-License-Identifier: MIT

pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

// must import this in order for it to connect to the system and network.
import "../lib/ConsumerBase.sol";

/**
 * @title Data Consumer Demo
 *
 * @dev Note the "is ConsumerBase", to extend
 * https://github.com/unification-com/xfund-router/blob/main/contracts/lib/ConsumerBase.sol
 * ConsumerBase.sol interacts with the deployed Router.sol smart contract
 * which will route data requests and fee payment to the selected provider
 * and handle data fulfilment.
 *
 * The selected provider will listen to the Router for requests, then send the data
 * back to the Router, which will in turn forward the data to your smart contract
 * after verifying the source of the data.
 */
contract DemoConsumer is ConsumerBase, Ownable {

    // This variable will effectively be modified by the data provider.
    // Must be a uint256
    uint256 public price;

    // provider to use for data requests. Must be registered on Router
    address public provider;

    // default fee to use for data requests
    uint256 public fee;

    // Will be called when data provider has sent data to the recieveData function
    event PriceDiff(bytes32 requestId, uint256 oldPrice, uint256 newPrice, int256 diff);

    /**
     * @dev constructor must pass the address of the Router and xFUND smart
     * contracts to the constructor of your contract! Without it, this contract
     * cannot interact with the system, nor request/receive any data.
     * The constructor calls the parent ConsumerBase constructor to set these.
     *
     * @param _router address of the Router smart contract
     * @param _xfund address of the xFUND smart contract
     * @param _provider address of the default provider
     * @param _fee uint256 default fee
     */
    constructor(address _router, address _xfund, address _provider, uint256 _fee)
    ConsumerBase(_router, _xfund) {
        price = 0;
        provider = _provider;
        fee = _fee;
    }

    /**
     * @dev setProvider change default provider. Uses OpenZeppelin's
     * onlyOwner modifier to secure the function.
     *
     * @param _provider address of the default provider
     */
    function setProvider(address _provider) external onlyOwner {
        provider = _provider;
    }

    /**
     * @dev setFee change default fee. Uses OpenZeppelin's
     * onlyOwner modifier to secure the function.
     *
     * @param _fee uint256 default fee
     */
    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
    }

    /**
     * @dev getData the actual function to request data.
     *
     * NOTE: Calls ConsumerBase.sol's requestData function.
     *
     * Uses OpenZeppelin's onlyOwner modifier to secure the function.
     * The data format can be found at
     * https://docs.finchains.io/guide/ooo_api.html
     * Endpoints should be Hex encoded using, for example
     * the web3.utils.asciiToHex function.
     *
     * @param _data bytes32 data being requested.
     */
    function getData(bytes32 _data) external onlyOwner returns (bytes32) {
        return _requestData(provider, fee, _data);
    }

    /**
     * @dev increaseRouterAllowance allows the Router to spend xFUND on behalf of this
     * smart contract.
     *
     * NOTE: Calls the internal _increaseRouterAllowance function in ConsumerBase.sol.
     *
     * Required so that xFUND fees can be paid. Uses OpenZeppelin's onlyOwner modifier
     * to secure the function.
     *
     * @param _amount uint256 amount to increase
     */
    function increaseRouterAllowance(uint256 _amount) external onlyOwner {
        require(_increaseRouterAllowance(_amount));
    }

    /**
     * @dev setRouter allows updating the Router contract address
     *
     * NOTE: Calls the internal setRouter function in ConsumerBase.sol.
     *
     * Can be used if network upgrades require new Router deployments.
     * Uses OpenZeppelin's onlyOwner modifier to secure the function.
     *
     * @param _router address new Router address
     */
    function setRouter(address _router) external onlyOwner {
        require(_setRouter(_router));
    }

    /**
     * @dev increaseRouterAllowance allows contract owner to withdraw
     * any xFUND held in this contract.
     * Uses OpenZeppelin's onlyOwner modifier to secure the function.
     *
     * @param _to address recipient
     * @param _value uint256 amount to withdraw
     */
    function withdrawxFund(address _to, uint256 _value) external onlyOwner {
        require(xFUND.transfer(_to, _value), "Not enough xFUND");
    }

    /**
     * @dev recieveData - example end user function to receive data. This will be called
     * by the data provider, via the Router's fulfillRequest, and through the ConsumerBase's
     * rawReceiveData function.
     *
     * Note: validation of the data and data provider sending the data is handled
     * by the Router smart contract prior to it forwarding the data to your contract, allowing
     * devs to focus on pure functionality. ConsumerBase.sol's rawReceiveData
     * function can only be called by the Router smart contract.
     *
     * @param _price uint256 result being sent
     * @param _requestId bytes32 request ID of the request being fulfilled
     */
    function receiveData(
        uint256 _price,
        bytes32 _requestId
    )
    internal override {
        // optionally, do something and emit an event to the logs
        int256 diff = int256(_price) - int256(price);
        emit PriceDiff(_requestId, price, _price, diff);

        // set the new price as sent by the provider
        price = _price;
    }
}
