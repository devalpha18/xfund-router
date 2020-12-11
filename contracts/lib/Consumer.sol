// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./ConsumerLib.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @dev Data Consumer smart contract
 *
 * This contract can be implemented by any smart contract wishing to include
 * off-chain data or data from a different network within it.
 *
 * The consumer initiates a data request by forwarding the request to the Router
 * smart contract, from where the data provider(s) pick up and process the
 * data request, and forward it back to the specified callback function.
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

    receive() external payable {
        emit PaymentRecieved(msg.sender, msg.value);
    }

    /**
     * @dev withdrawAllTokens allows the token holder (contract owner) to withdraw all
     * Tokens held by this contract back to themselves.
     */
    function withdrawAllTokens() public {
        require(consumerState.withdrawAllTokens());
    }

    /**
     * @dev withdrawTokenAmount allows the token holder (contract owner) to withdraw
     * the specified amount of Tokens held by this contract back to themselves.
     *
     * @param _amount the amount of tokens the owner would like to withdraw
     */
    function withdrawTokenAmount(uint256 _amount) public {
        require(consumerState.withdrawTokenAmount(_amount));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`),
     * and withdraws any tokens currentlry held by the contract.
     * Can only be called by the current owner.
     */
    function transferOwnership(address payable newOwner) public {
        require(consumerState.transferOwnership(newOwner));
    }

    /**
     * @dev increaseRouterAllowance allows the token holder (contract owner) to
     * increase the token allowance for the Router, in order for the Router to
     * pay fees for data requests
     *
     * @param _routerAllowance the amount of tokens the owner would like to increase allocation by
     */
    function increaseRouterAllowance(uint256 _routerAllowance) public {
        require(consumerState.increaseRouterAllowance(_routerAllowance));
    }

    /**
     * @dev decreaseRouterAllowance allows the token holder (contract owner) to
     * reduce the token allowance for the Router
     *
     * @param _routerAllowance the amount of tokens the owner would like to decrease allocation by
     */
    function decreaseRouterAllowance(uint256 _routerAllowance) public {
        require(consumerState.decreaseRouterAllowance(_routerAllowance));
    }

    /**
     * @dev addDataProvider add a new authorised data provider to this contract, and
     * authorise it to provide data via the Router
     *
     * @param _dataProvider the address of the data provider
     * @param _fee the data provider's fee
     */
    function addDataProvider(address _dataProvider, uint256 _fee) public {
        require(consumerState.addDataProvider(_dataProvider, _fee));
    }

    /**
     * @dev removeDataProvider remove a data provider and its authorisation to provide data
     * for this smart contract from the Router
     *
     * @param _dataProvider the address of the data provider
     */
    function removeDataProvider(address _dataProvider) public {
        require(consumerState.removeDataProvider(_dataProvider));
    }

    /**
     * @dev setDataProviderFee set the fee for a data provider
     *
     * @param _dataProvider the address of the data provider
     * @param _fee the data provider's fee
     */
    function setDataProviderFee(address _dataProvider, uint256 _fee) public {
        require(consumerState.setDataProviderFee(_dataProvider, _fee));
    }

    /**
    * @dev setRequestVar set the specified variable. Request variables are used
    * when initialising a request, and are common settings for requests.
    *
    * The variable to be set can be one of:
    * 0x01 - gas price limit in gwei the consumer is willing to pay for data processing
    * 0x02 - max ETH that can be sent in a gas top up Tx
    * 0x03 - request timeout in seconds
    *
    * @param _var bytes32 the variable being set.
    * @param _value uint256 the new value
    */
    function setRequestVar(uint8 _var, uint256 _value) public {
        require(consumerState.setRequestVar(_var, _value));
    }

    /**
     * @dev setRouter set the address of the Router smart contract
     *
     * @param _router on chain address of the router smart contract
     */
    function setRouter(address _router) public {
        require(consumerState.setRouter(_router));
    }

    function topUpGas(address _dataProvider)
    public
    payable
    onlyOwner() {
        uint256 amount = msg.value;
        require(consumerState.dataProviders[_dataProvider].isAuthorised, "Consumer: _dataProvider is not authorised");
        require(address(msg.sender).balance >= amount, "Consumer: sender has insufficient balance");
        require(amount > 0, "Consumer: amount cannot be zero");
        require(amount <= consumerState.requestVars[2], "Consumer: amount cannot exceed own gasTopUpLimit");
        require(consumerState.router.topUpGas{value:amount}(_dataProvider), "Consumer: router.topUpGas failed");
    }

    function withdrawTopUpGas(address _dataProvider)
    public
    onlyOwner() {
        uint256 amount = consumerState.router.withDrawGasTopUpForProvider(_dataProvider);
        require(amount > 0, "Consumer: nothing to withdraw");
        Address.sendValue(consumerState.OWNER, amount);
    }

    /**
     * @dev submitDataRequest submit a new data request to the Router. The router will
     * verify the data request, and route it to the data provider
     *
     * @param _dataProvider the address of the data provider to send the request to
     * @param _data type of data being requested. E.g. PRICE.BTC.USD.AVG requests average price for BTC/USD pair
     * @param _gasPrice the gas price the consumer would like the provider to use for sending data back
     * @param _callbackFunctionSignature the callback function the provider should call to send data back
     * @return requestId - the bytes32 request id
     */
    function submitDataRequest(
        address payable _dataProvider,
        string memory _data,
        uint256 _gasPrice,
        bytes4 _callbackFunctionSignature
    ) public
    returns (bytes32 requestId) {
        return consumerState.submitDataRequest(_dataProvider, _data, _gasPrice, _callbackFunctionSignature);
    }

   /**
    * @dev cancelRequest submit cancellation to the router for the specified request
    *
    * @param _requestId the id of the request being cancelled
    */
    function cancelRequest(bytes32 _requestId) public {
        require(consumerState.cancelRequest(_requestId));
    }

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
     * @dev getContractTokenBalance quick proxy function to the Token smart contract to
     * get the token balance of this smart contract
     *
     * @return uint256 token balance
     */
    function getContractTokenBalance() external view returns (uint256) {
        return consumerState.token.balanceOf(address(this));
    }

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
     * @dev getRequestNonce returns the current requestNonce
     *
     * @return uint256
     */
    function getRequestNonce() external view returns (uint256) {
        return consumerState.requestNonce;
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
     * 1 - gas price limit in gwei the consumer is willing to pay for data processing
     * 2 - max ETH that can be sent in a gas top up Tx
     * 3 - request timeout in seconds
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

    modifier isValidFulfillment(bytes32 _requestId, uint256 _price, bytes memory _signature) {
        require(msg.sender == address(consumerState.router), "Consumer: data did not originate from Router");
        require(consumerState.dataRequests[_requestId], "Consumer: _requestId does not exist");
        bytes32 message = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(_requestId, _price, address(this))));
        address provider = ECDSA.recover(message, _signature);
        require(consumerState.dataProviders[provider].isAuthorised, "Consumer: provider is not authorised");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == consumerState.OWNER, "Consumer: only owner can do this");
        _;
    }
}
