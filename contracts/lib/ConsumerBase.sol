// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./ConsumerLib.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";

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
abstract contract ConsumerBase {
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
     * withdrawTopUpGas function (the Router sends ETH stored for gas refunds), or accidentally
     *
     * @param sender address of sender
     * @param amount amount sent (wei)
     */
    event PaymentRecieved(address sender, uint256 amount);

    /*
     * WRITE FUNCTIONS
     */

    /**
     * @dev Contract constructor. Accepts the address for the router smart contract,
     * and a token allowance for the Router to spend on the consumer's behalf (to pay fees).
     *
     * The Consumer contract should have enough tokens allocated to it to pay fees
     * and the Router should be able to use the Tokens to forward fees.
     *
     * @param _router address of the deployed Router smart contract
     */
    constructor(address _router) public {
        consumerState.init(_router);
    }

    /**
     * @dev fallback payable function, which emits an event if ETH is received either via
     * the withdrawTopUpGas function, or accidentally.
     */
    receive() external payable {
        emit PaymentRecieved(msg.sender, msg.value);
    }

    /**
     * @dev withdrawAllTokens allows the token holder (contract owner) to withdraw all
     * Tokens held by this contract back to themselves.
     *
     * Can only be called by the current owner.
     *
     * Note: Contract ownership is checked in the underlying ConsumerLib function
     */
    function withdrawAllTokens() external {
        require(consumerState.withdrawAllTokens());
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`),
     * and withdraws any tokens currently held by the contract. Can only be run if the
     * current owner has no ETH held by the Router.
     *
     * Can only be called by the current owner.
     *
     * Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _newOwner address of the new contract owner
     */
    function transferOwnership(address payable _newOwner) external {
        require(consumerState.transferOwnership(_newOwner));
    }

    /**
     * @dev setRouterAllowance allows the token holder (contract owner) to
     * increase/decrease the token allowance for the Router, in order for the Router to
     * pay fees for data requests
     *
     * Can only be called by the current owner.
     *
     * Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _routerAllowance the amount of tokens the owner would like to increase/decrease allocation by
     * @param _increase bool true to increase, false to decrease
     */
    function setRouterAllowance(uint256 _routerAllowance, bool _increase) external {
        require(consumerState.setRouterAllowance(_routerAllowance, _increase));
    }

    /**
     * @dev addRemoveDataProvider add a new authorised data provider to this contract, and
     * authorise it to provide data via the Router, set new fees, or remove
     * a currently authorised provider. Fees are set here to reduce gas costs when
     * requesting data, and to remove the need to specify the fee with every request
     *
     * Can only be called by the current owner.
     *
     * Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _dataProvider the address of the data provider
     * @param _fee the data provider's fee
     * @param _remove bool set to true to de-authorise
     */
    function addRemoveDataProvider(address _dataProvider, uint64 _fee, bool _remove) external {
        require(consumerState.addRemoveDataProvider(_dataProvider, _fee, _remove));
    }

    /**
     * @dev setRequestVar set the specified variable. Request variables are used
     * when initialising a request, and are common settings for requests.
     *
     * The variable to be set can be one of:
     * 1 - max gas price limit in gwei the consumer is willing to pay for data processing
     * 2 - max ETH that can be sent in a gas top up Tx
     * 3 - request timeout in seconds
     *
     * Can only be called by the current owner.
     *
     * Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _var bytes32 the variable being set.
     * @param _value uint256 the new value
     */
    function setRequestVar(uint8 _var, uint256 _value) external {
        require(consumerState.setRequestVar(_var, _value));
    }

    /**
     * @dev setRouter set the address of the Router smart contract
     *
     * Can only be called by the current owner.
     *
     * Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _router on chain address of the router smart contract
     */
    function setRouter(address _router) external {
        require(consumerState.setRouter(_router));
    }

    /**
     * @dev topUpGas send ETH to the Router for refunding gas costs to data providers
     * for fulfilling data requests. The ETH sent will only be used for the data
     * provider specified, and can be withdrawn at any time via the withdrawTopUpGas
     * function. ConsumerLib handles any input validation.
     *
     * ETH sent is forwarded to the Router smart contract, and held there. It is "assigned"
     * to the specified data provider's address.
     *
     * NOTE: this is a payable function, and a value must be sent when calling it.
     *
     * The value sent cannot exceed either this contract's own gasTopUpLimitm or the
     * Router's topup limit. This is a safeguarde to prevent any accidental large amounts
     * being sent.
     *
     * Can only be called by the current owner.
     *
     * Note: since Library contracts cannot have payable functions, the whole function
     * is defined here, along with contract ownership checks.
     *
     * @param _dataProvider address of data provider for whom gas will be refunded
     */
    function topUpGas(address _dataProvider)
    external
    payable {
        uint256 amount = msg.value;
        require(consumerState.validateTopUpGas(_dataProvider, amount));
        require(consumerState.router.topUpGas{value:amount}(_dataProvider));
    }

    /**
     * @dev withdrawTopUpGas allows the Consumer contract's owner to withdraw any ETH
     * held by the Router for the specified data provider. All ETH held will be withdrawn
     * from the Router and forwarded to the Consumer contract owner's wallet.this
     *
     * NOTE: This function calls the ConsumerLib's underlying withdrawTopUpGas function
     *
     * Can only be called by the current owner.
     *
     * Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _dataProvider address of associated data provider for whom ETH will be withdrawn
     */
    function withdrawTopUpGas(address _dataProvider)
    public {
        require(consumerState.withdrawTopUpGas(_dataProvider));
    }

    /**
     * @dev withdrawEth allows the Consumer contract's owner to withdraw any ETH
     * that has been sent to the Contract, either accidentally or via the
     * withdrawTopUpGas function. In the case of the withdrawTopUpGas function, this
     * is automatically called as part of that function. ETH is sent to the
     * Consumer contract's current owner's wallet.
     *
     * Can only be called by the current owner.
     *
     * Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * NOTE: This function calls the ConsumerLib's underlying withdrawEth function
     *
     * @param _amount amount (in wei) of ETH to be withdrawn
     */
    function withdrawEth(uint256 _amount)
    public {
        require(consumerState.withdrawEth(_amount));
    }

    /**
     * @dev requestData - initialises a data request.
     * Kicks off the ConsumerLib.sol lib's submitDataRequest function which
     * forwards the request to the deployed Router smart contract.
     *
     * Note: the ConsumerLib.sol lib's submitDataRequest function has the onlyOwner()
     * and isProvider(_dataProvider) modifiers. These ensure only this contract owner
     * can initialise a request, and that the provider is authorised respectively.
     * The router will also verify the data request, and route it to the data provider
     *
     * Can only be called by the current owner.
     *
     * Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _dataProvider payable address of the data provider
     * @param _data bytes32 value of data being requested, e.g. PRICE.BTC.USD.AVG requests
     * average price for BTC/USD pair
     * @param _gasPrice uint256 max gas price consumer is willing to pay, in gwei. The
     * (10 ** 9) conversion to wei is done automatically within the ConsumerLib.sol
     * submitDataRequest function before forwarding it to the Router.
     * @return requestId bytes32 request ID which can be used to track or cancel the request
     */
    function requestData(
        address payable _dataProvider,
        bytes32 _data,
        uint64 _gasPrice)
    public returns (bytes32 requestId) {
        // call the underlying ConsumerLib.sol lib's submitDataRequest function
        return consumerState.submitDataRequest(_dataProvider, _data, _gasPrice);
    }

    /**
     * @dev rawReceiveData - Called by the Router's fulfillRequest function
     * in order to fulfil a data request. Data providers call the Router's fulfillRequest function
     * The request  is validated to ensure it has indeed
     * been sent by the authorised data provider, via the Router.
     *
     * Once rawReceiveData has validated the origin of the data fulfillment, it calls the user
     * defined receiveData function to finalise the flfilment. Contract developers will need to
     * override the abstract receiveData function defined below.
     *
     * Finally, rawReceiveData will delete the Request ID to clean up storage.
     *
     * @param _price uint256 result being sent
     * @param _requestId bytes32 request ID of the request being fulfilled
     * @param _signature bytes signature of the data and request info. Signed by provider to ensure only the provider
     * has sent the data
     */
    function rawReceiveData(
        uint256 _price,
        bytes32 _requestId,
        bytes memory _signature) external
    {
        // validate
        require(msg.sender == address(consumerState.router), "Consumer: data did not originate from Router");
        require(consumerState.dataRequests[_requestId], "Consumer: _requestId does not exist");
        bytes32 message = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(_requestId, _price, address(this))));
        address provider = ECDSA.recover(message, _signature);
        require(consumerState.dataProviders[provider].isAuthorised, "Consumer: provider is not authorised");

        // call override function in end-user's contract
        receiveData(_price, _requestId);
        // delete the fulfilled request
        delete consumerState.dataRequests[_requestId];
    }

    /*
    * @dev receiveData - should be overridden by contract developers to process the
    * data fulfilment in their own contract.
    *
    * @param _price uint256 result being sent
    * @param _requestId bytes32 request ID of the request being fulfilled
    */
    function receiveData(
        uint256 _price,
        bytes32 _requestId
    ) internal virtual;

   /**
     * @dev cancelRequest submit cancellation to the router for the specified request
     *
     * Can only be called by the current owner.
     *
     * Note: Contract ownership is checked in the underlying ConsumerLib function
     *
     * @param _requestId the id of the request being cancelled
     */
    function cancelRequest(bytes32 _requestId) external {
        require(consumerState.cancelRequest(_requestId));
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
     * @dev getDataProviderFee returns the fee currently set for the given provider
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
     * The variable to be set can be one of:
     * 1 - max gas price limit in gwei the consumer is willing to pay for data processing
     * 2 - max ETH that can be sent in a gas top up Tx
     * 3 - request timeout in seconds
     *
     * @param _var uint8 var to get
     * @return uint256
     */
    function getRequestVar(uint8 _var) external view returns (uint256) {
        return consumerState.requestVars[_var];
    }
}
