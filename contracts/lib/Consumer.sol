// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./ConsumerLib.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title Data Consumer smart contract
 *
 * @dev This contract can be imported by any smart contract wishing to include
 * off-chain data or data from a different network within it.
 *
 * The consumer initiates a data request by forwarding the request to the Router
 * smart contract, from where the data provider(s) pick up and process the
 * data request, and forward it back to the specified callback function.
 *
 * Most of the functions in this contract are proxy functions to the ConsumerLib
 * smart contract
 */
contract Consumer {
    using SafeMath for uint256;
    using Address for address;
    using ConsumerLib for ConsumerLib.State;

    /*
     * STATE VARIABLES
     */

    ConsumerLib.State private consumerState;

    /*
     * EVENTS
     */

    /**
     * @dev PaymentRecieved - emitted when ETH is sent to this contract address, either via the
     *      withdrawTopUpGas function (the Router sends ETH stored for gas refunds), or accidentally
     * @param sender address of sender
     * @param amount amount sent (wei)
     */
    event PaymentRecieved(address sender, uint256 amount);

    /*
     * WRITE FUNCTIONS
     */

    /**
     * @dev Contract constructor. Accepts the address for the router smart contract,
     *      and a token allowance for the Router to spend on the consumer's behalf (to pay fees).
     *
     *      The Consumer contract should have enough tokens allocated to it to pay fees
     *      and the Router should be able to use the Tokens to forward fees.
     *
     * @param _router address of the deployed Router smart contract
     */
    constructor(address _router) public {
        consumerState.init(_router);
    }

    /**
     * @dev fallback payable function, which emits an event if ETH is received either via
     *      the withdrawTopUpGas function, or accidentally.
     */
    receive() external payable {
        emit PaymentRecieved(msg.sender, msg.value);
    }

    /**
     * @dev withdrawAllTokens allows the token holder (contract owner) to withdraw all
     *      Tokens held by this contract back to themselves.
     *      Can only be called by the current owner.
     *      Note: Contract ownership is checked in the underlying ConsumerLib function
     */
    function withdrawAllTokens() external {
        require(consumerState.withdrawAllTokens());
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`),
     *      and withdraws any tokens currently held by the contract. Can only be run if the
     *      current owner has no ETH held by the Router.
     *      Can only be called by the current owner.
     *      Note: Contract ownership is checked in the underlying ConsumerLib function
     * @param _newOwner address of the new contract owner
     */
    function transferOwnership(address payable _newOwner) external {
        require(consumerState.transferOwnership(_newOwner));
    }

    /**
     * @dev setRouterAllowance allows the token holder (contract owner) to
     *      increase/decrease the token allowance for the Router, in order for the Router to
     *      pay fees for data requests
     *      Can only be called by the current owner.
     *      Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _routerAllowance the amount of tokens the owner would like to increase/decrease allocation by
     * @param _increase bool true to increase, false to decrease
     */
    function setRouterAllowance(uint256 _routerAllowance, bool _increase) external {
        require(consumerState.setRouterAllowance(_routerAllowance, _increase));
    }

    /**
     * @dev addDataProvider add a new authorised data provider to this contract, and
     *      authorise it to provide data via the Router
     *      Can only be called by the current owner.
     *      Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _dataProvider the address of the data provider
     * @param _fee the data provider's fee
     */
    function addDataProvider(address _dataProvider, uint256 _fee) external {
        require(consumerState.addDataProvider(_dataProvider, _fee));
    }

    /**
     * @dev removeDataProvider remove a data provider and its authorisation to provide data
     *      for this smart contract from the Router
     *      Can only be called by the current owner.
     *      Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _dataProvider the address of the data provider
     */
    function removeDataProvider(address _dataProvider) external {
        require(consumerState.removeDataProvider(_dataProvider));
    }

    /**
     * @dev setRequestVar set the specified variable. Request variables are used
     *      when initialising a request, and are common settings for requests.
     *
     *      The variable to be set can be one of:
     *      1 - gas price limit in gwei the consumer is willing to pay for data processing
     *      2 - max ETH that can be sent in a gas top up Tx
     *      3 - request timeout in seconds
     *
     *      Can only be called by the current owner.
     *      Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _var bytes32 the variable being set.
     * @param _value uint256 the new value
     */
    function setRequestVar(uint8 _var, uint256 _value) external {
        require(consumerState.setRequestVar(_var, _value));
    }

    /**
     * @dev setRouter set the address of the Router smart contract
     *      Can only be called by the current owner.
     *      Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _router on chain address of the router smart contract
     */
    function setRouter(address _router) external {
        require(consumerState.setRouter(_router));
    }

    /**
     * @dev topUpGas send ETH to the Router for refunding gas costs to data providers
     *      for fulfilling data requests. The ETH sent will only be used for the data
     *      provider specified, and can be withdrawn at any time via the withdrawTopUpGas
     *      function.
     *
     *      ETH sent is forwarded to the Router smart contract, and held there. It is "assigned"
     *      to the specified data provider's address.
     *
     *      NOTE: this is a payable function, and a value must be sent when calling it.
     *      The value sent cannot exceed either this contract's own gasTopUpLimitm or the
     *      Router's topup limit. This is a safeguarde to prevent any accidental large amounts
     *      being sent.
     *      Can only be called by the current owner.
     *      Note: since Library contracts cannot have payable functions, the whole function
     *      is defined here, along with contract ownership checks.
     *
     * @param _dataProvider address of data provider for whom gas will be refunded
     */
    function topUpGas(address _dataProvider)
    external
    payable {
        require(msg.sender == consumerState.OWNER, "Consumer: only owner can do this");
        uint256 amount = msg.value;
        require(consumerState.dataProviders[_dataProvider].isAuthorised, "Consumer: _dataProvider is not authorised");
        require(address(msg.sender).balance >= amount, "Consumer: sender has insufficient balance");
        require(amount > 0, "Consumer: amount cannot be zero");
        require(amount <= consumerState.requestVars[2], "Consumer: amount cannot exceed own gasTopUpLimit");
        require(consumerState.router.topUpGas{value:amount}(_dataProvider), "Consumer: router.topUpGas failed");
    }

    /**
     * @dev withdrawTopUpGas allows the Consumer contract's owner to withdraw any ETH
     *      held by the Router for the specified data provider. All ETH held will be withdrawn
     *      from the Router and forwarded to the Consumer contract owner's wallet.this
     *
     *      NOTE: This function calls the ConsumerLib's underlying withdrawTopUpGas function
     *      Can only be called by the current owner.
     *      Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _dataProvider address of associated data provider for whom ETH will be withdrawn
     */
    function withdrawTopUpGas(address _dataProvider)
    public {
        require(consumerState.withdrawTopUpGas(_dataProvider));
    }

    /**
     * @dev withdrawEth allows the Consumer contract's owner to withdraw any ETH
     *      that has been sent to the Contract, either accidentally or via the
     *      withdrawTopUpGas function. In the case of the withdrawTopUpGas function, this
     *      is automatically called as part of that function. ETH is sent to the
     *      Consumer contract's current owner's wallet.
     *      Can only be called by the current owner.
     *      Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     *      NOTE: This function calls the ConsumerLib's underlying withdrawEth function
     *
     * @param _amount amount (in wei) of ETH to be withdrawn
     */
    function withdrawEth(uint256 _amount)
    public {
        require(consumerState.withdrawEth(_amount));
    }

    /**
     * @dev submitDataRequest submit a new data request to the Router. The router will
     *      verify the data request, and route it to the data provider
     *      Can only be called by the current owner.
     *      Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _dataProvider the address of the data provider to send the request to
     * @param _data type of data being requested. E.g. PRICE.BTC.USD.AVG requests average price for BTC/USD pair
     * @param _gasPrice the gas price the consumer would like the provider to use for sending data back
     * @param _callbackFunctionSignature the callback function the provider should call to send data back
     * @return requestId - the bytes32 request id
     */
    function submitDataRequest(
        address payable _dataProvider,
        bytes32 _data,
        uint256 _gasPrice,
        bytes4 _callbackFunctionSignature
    ) public
    returns (bytes32 requestId) {
        return consumerState.submitDataRequest(_dataProvider, _data, _gasPrice, _callbackFunctionSignature);
    }

   /**
     * @dev cancelRequest submit cancellation to the router for the specified request
     *      Can only be called by the current owner.
     *      Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _requestId the id of the request being cancelled
     */
    function cancelRequest(bytes32 _requestId) external {
        require(consumerState.cancelRequest(_requestId));
    }

    /**
    * @dev deleteRequest delete a request from the contract. This function should be called
    *      by the Consumer's contract once a request has been fulfilled, in order to clean up
    *      any unused request IDs from storage. The _price and _signature params are used to validate
    *      the params prior to deleting the request, as protection.
    *
    * @param _price the data being sent in the fulfilment
    * @param _requestId the id of the request being cancelled
    * @param _signature the signature as sent by the provider
    */
    function deleteRequest(uint256 _price,
        bytes32 _requestId,
        bytes memory _signature)
    public
    isValidFulfillment(_requestId, _price, _signature) {
        delete consumerState.dataRequests[_requestId];
    }

    /*
     * READ FUNCTIONS
     */

    /**
     * @dev getRouterAddress returns the address of the Router smart contract being used
     *
     * @return address
     */
    function getRouterAddress() external view returns (address) {
        return address(consumerState.router);
    }

    /**
     * @dev getDataProviderFee returns the fee for the given provider
     *
     * @return uint256
     */
    function getDataProviderFee(address _dataProvider) external view returns (uint256) {
        return consumerState.dataProviders[_dataProvider].fee;
    }

    /**
     * @dev owner returns the address of the Consumer contract's owner
     *
     * @return address
     */
    function owner() external view returns (address) {
        return consumerState.OWNER;
    }

    /**
     * @dev getRequestVar returns requested variable
     *
     *      The variable to be set can be one of:
     *      1 - gas price limit in gwei the consumer is willing to pay for data processing
     *      2 - max ETH that can be sent in a gas top up Tx
     *      3 - request timeout in seconds
     *
     * @param _var uint8 var to get
     * @return uint256
     */
    function getRequestVar(uint8 _var) external view returns (uint256) {
        return consumerState.requestVars[_var];
    }

    /*
     * MODIFIERS
     */

    /**
     * @dev isValidFulfillment should be used in the Consumer's contract during data request fulfilment,
     *      to ensure that the data being sent is valid, and from the provider specified in the data
     *      request. The modifier will decode the signature sent by the provider, to ensure that it
     *      is valid.
     *
     * @param _price the data being sent in the fulfilment
     * @param _requestId the id of the request being cancelled
     * @param _signature the signature as sent by the provider
     */
    modifier isValidFulfillment(bytes32 _requestId, uint256 _price, bytes memory _signature) {
        require(msg.sender == address(consumerState.router), "Consumer: data did not originate from Router");
        require(consumerState.dataRequests[_requestId], "Consumer: _requestId does not exist");
        bytes32 message = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(_requestId, _price, address(this))));
        address provider = ECDSA.recover(message, _signature);
        require(consumerState.dataProviders[provider].isAuthorised, "Consumer: provider is not authorised");
        _;
    }
}
