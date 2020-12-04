// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "./lib/Request.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @dev Data Request routing smart contract.
 *
 * Routes requests for data from Consumers to authorised data providers.
 * Data providers listen for requests and process data, sending it back to the
 * Consumer's smart contract.
 *
 * An ERC-20 Token fee is charged by the provider, and paid for by the consumer
 * The consumer is also responsible for reimbursing any Tx gas costs incurred
 * by the data provider for submitting the data to their smart contract (within
 * a reasonable limit)
 *
 * This contract uses {AccessControl} to lock permissioned functions using the
 * different roles.
 */
contract Router is AccessControl, Request {
    using SafeMath for uint256;
    using Address for address;

    IERC20 private token; // Contract address of ERC-20 Token being used to pay for data
    bytes32 private salt;
    uint256 private gasTopUpLimit; // max ETH that can be sent in a gas top up Tx

    // Eth held for provider gas payments
    uint256 private totalGasDeposits;
    mapping(address => uint256) private gasDepositsForConsumer;
    mapping(address => mapping(address => uint256)) public gasDepositsForConsumerProviders;

    // Tokens held for payment
    uint256 private totalTokensHeld;
    // Mapping for [dataConsumers] to [dataProviders] to hold tokens held for data payments
    mapping(address => mapping(address => uint256)) private tokensHeldForPayment;

    // Mapping for [dataConsumers] to [dataProviders].
    // A dataProvider is authorised to provide data for the dataConsumer
    mapping(address => mapping(address => bool)) public requesterAuthorisedProviders;

    // Mapping to hold open data requests
    mapping(bytes32 => DataRequest) public dataRequests;

    // track fees held by this contract
    uint256 public totalFees = 0;
    mapping(address => mapping(address => uint256)) public feesHeld;

    // DataRequested event. Emitted when a data request has been initialised
    event DataRequested(
        address indexed dataConsumer,
        address indexed dataProvider,
        uint256 fee,
        string data,
        bytes32 indexed requestId,
        uint256 gasPrice,
        uint256 expires,
        bytes4 callbackFunctionSignature
    );

    // GrantProviderPermission event. Emitted when a data consumer grants a data provider to provide data
    event GrantProviderPermission(address indexed dataConsumer, address indexed dataProvider);

    // RevokeProviderPermission event. Emitted when a data consumer revokes access for a data provider to provide data
    event RevokeProviderPermission(address indexed dataConsumer, address indexed dataProvider);

    // RequestFulfilled event. Emitted when a data provider has sent the data requested
    event RequestFulfilled(
        address indexed dataConsumer,
        address indexed dataProvider,
        bytes32 indexed requestId,
        bytes4 callbackFunctionSignature,
        uint256 requestedData,
        uint256 gasUsedToCall
    );

    // RequestCancelled event. Emitted when a data consumer cancels a request
    event RequestCancelled(
        address indexed dataConsumer,
        address indexed dataProvider,
        bytes32 indexed requestId,
        uint256 refund
    );

    // SaltSet used during deployment
    event SaltSet(bytes32 salt);

    // TokenSet used during deployment
    event TokenSet(address tokenAddress);

    event SetGasTopUpLimit(address indexed sender, uint256 oldLimit, uint256 newLimit);

    event GasToppedUp(address indexed dataConsumer, address indexed dataProvider, uint256 amount);
    event GasWithdrawnByConsumer(address indexed dataConsumer, address indexed dataProvider, uint256 amount);
    event GasRefundedToProvider(address indexed dataConsumer, address indexed dataProvider, uint256 amount);

    // Mirrored ERC20 events for web3 client decoding
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Contract constructor. Accepts the address for a Token smart contract,
     * and unique salt.
     * @param _token address must be for an ERC-20 token (e.g. xFUND)
     * @param _salt unique salt for this contract
     */
    constructor(address _token, bytes32 _salt) public {
        require(_token != address(0), "Router: token cannot be zero address");
        require(_token.isContract(), "Router: token address must be a contract");
        require(_salt[0] != 0 && _salt != 0x0, "Router: must include salt");
        token = IERC20(_token);
        salt = _salt;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        totalTokensHeld = 0;
        gasTopUpLimit = 1 ether;
        emit TokenSet(_token);
        emit SaltSet(_salt);
    }

    /**
     * @dev setGasTopUpLimit set the max amount of ETH that can be sent
     * in a topUpGas Tx
     *
     * @param _gasTopUpLimit amount in wei
     * @return success
     */
    function setGasTopUpLimit(uint256 _gasTopUpLimit) public onlyAdmin() returns (bool success) {
        require(_gasTopUpLimit > 0, "Router: _gasTopUpLimit must be > 0");
        uint256 oldGasTopUpLimit = gasTopUpLimit;
        gasTopUpLimit = _gasTopUpLimit;
        emit SetGasTopUpLimit(msg.sender, oldGasTopUpLimit, _gasTopUpLimit);
        return true;
    }

    /**
     * @dev topUpGas data consumer contract calls this function to top up gas
     * Gas is the ETH held by this contract which is used to refund Tx costs
     * to the data provider for fulfilling a request.
     * To prevent silly amounts of ETH being sent, a sensible limit is imposed.
     * Can only top up for authorised providers
     *
     * @param _dataProvider address of data provider
     * @return success
     */
    function topUpGas(address _dataProvider) public payable returns (bool success) {
        uint256 amount = msg.value;
        // msg.sender is the address of the Consumer's smart contract
        address dataConsumer = msg.sender;
        require(address(dataConsumer).isContract(), "Router: only a contract can top up gas");
        require(_dataProvider != address(0), "Router: _dataProvider cannot be zero address");
        require(requesterAuthorisedProviders[dataConsumer][_dataProvider], "Router: dataProvider not authorised for this dataConsumer");
        require(amount > 0, "Router: cannot top up zero");
        require(amount <= gasTopUpLimit, "Router: cannot top up more than gasTopUpLimit");

        // total held by Router contract
        totalGasDeposits = totalGasDeposits.add(amount);

        // Total held for dataConsumer contract
        gasDepositsForConsumer[dataConsumer] = gasDepositsForConsumer[dataConsumer].add(amount);

        // Total held for dataConsumer contract/provider pair
        gasDepositsForConsumerProviders[dataConsumer][_dataProvider] = gasDepositsForConsumerProviders[dataConsumer][_dataProvider].add(amount);

        emit GasToppedUp(dataConsumer, _dataProvider, amount);

        return true;
    }
    // Todo - withdrawAllGas
    // Todo - withdrawGasAmount
    // Todo - fallback function to reject accidental payments

    /**
     * @dev initialiseRequest - called by Consumer contract to initialise a data request
     * @param _dataProvider address of the data provider. Must be authorised for this consumer
     * @param _fee amount of Tokens to pay for data
     * @param _requestNonce incremented nonce for Consumer to help prevent request replay
     * @param _data type of data being requested. E.g. PRICE.BTC.USD.AVG requests average price for BTC/USD pair
     * @param _gasPrice gas price Consumer is willing to pay for data return. Converted to gwei (10 ** 9) in this method
     * @param _expires unix epoch for fulfillment expiration, after which cancelRequest can be called for refund
     * @param _requestId the generated ID for this request - used to double check request is coming from the Consumer
     * @param _callbackFunctionSignature signature of function to call in the Consumer's contract to send the data
     * @return success if the execution was successful. Status is checked in the Consumer contract
     */
    function initialiseRequest(
        address _dataProvider,
        uint256 _fee,
        uint256 _requestNonce,
        string memory _data,
        uint256 _gasPrice,
        uint256 _expires,
        bytes32 _requestId,
        bytes4 _callbackFunctionSignature
    ) public returns (bool success) {
        // msg.sender is the address of the Consumer's smart contract
        require(address(msg.sender).isContract(), "Router: only a contract can initialise a request");
        require(requesterAuthorisedProviders[msg.sender][_dataProvider], "Router: dataProvider not authorised for this dataConsumer");
        require(_expires > now, "Router: expiration must be > now");

        // recreate request ID from params sent
        bytes32 reqId = generateRequestId(
            msg.sender,
            _requestNonce,
            _dataProvider,
            _data,
            _callbackFunctionSignature,
            _gasPrice,
            salt
        );

        require(reqId == _requestId, "Router: reqId != _requestId");
        require(!dataRequests[reqId].isSet, "Router: request id already initialised");

        // ToDo - transfer fee into this Router contract as a holding place. Once request is fulfilled,
        //        forward to the provider. Also allows for request cancellations and refunds.

        // msg.sender is the address of the Consumer smart contract calling this function.
        // It must have enough Tokens to pay for the dataProvider's fee
        // Fee is initially transferred into the balane of this Router contract and held
        // until either the request is fulfilled, or the Consumer cancels the request
        // Will actually return underlying ERC20 error "ERC20: transfer amount exceeds balance"
        totalTokensHeld = totalTokensHeld.add(_fee);
        tokensHeldForPayment[msg.sender][_dataProvider] = tokensHeldForPayment[msg.sender][_dataProvider].add(_fee);
        require(token.transferFrom(msg.sender, address(this), _fee), "Router: token.transferFrom failed");

        dataRequests[reqId] = DataRequest(
          {
            dataConsumer: msg.sender,
            dataProvider: _dataProvider,
            callbackFunction: _callbackFunctionSignature,
            expires: _expires,
            fee: _fee,
            gasPrice: _gasPrice,
            isSet: true
          }
        );

        // Transfer successful - emit the DataRequested event
        emit DataRequested(
            msg.sender,
            _dataProvider,
            _fee,
            _data,
            _requestId,
            _gasPrice,
            _expires,
            _callbackFunctionSignature
        );
        return true;
    }

    /**
     * @dev fulfillRequest - called by data provider to forward data to the Consumer
     * @param _requestId the request the provider is sending data for
     * @param _requestedData the data to send
     * @param _signature data provider's signature of the _requestId, _requestedData and Consumer's address
     *                   this will used to validate the data's origin in the Consumer's contract
     * @return success if the execution was successful.
     */
    function fulfillRequest(bytes32 _requestId, uint256 _requestedData, bytes memory _signature) public returns (bool){
        require(_signature.length > 0, "Router: must include signature");
        require(dataRequests[_requestId].isSet, "Router: request id does not exist");

        uint256 gasPrice = dataRequests[_requestId].gasPrice;
        require(tx.gasprice <= gasPrice, "Router: tx.gasprice cannot exceed gas price consumer is willing to pay");

        address dataConsumer = dataRequests[_requestId].dataConsumer;
        address dataProvider = dataRequests[_requestId].dataProvider;
        bytes4 callbackFunction = dataRequests[_requestId].callbackFunction;
        uint256 fee = dataRequests[_requestId].fee;

        require(msg.sender == dataProvider, "Router: msg.sender != requested dataProvider");
        // msg.sender is the address of the data provider
        require(requesterAuthorisedProviders[dataConsumer][msg.sender], "Router: dataProvider not authorised for this dataConsumer");

        // dataConsumer will see msg.sender as the Router's contract address
        uint256 gasLeftBefore = gasleft();
        // using functionCall from OZ's Address library
        dataConsumer.functionCall(abi.encodeWithSelector(callbackFunction, _requestedData, _requestId, _signature));

        uint256 gasLeftAfter = gasleft();
        uint256 gasUsedToCall = gasLeftBefore - gasLeftAfter;

        emit RequestFulfilled(
            dataConsumer,
            msg.sender,
            _requestId,
            callbackFunction,
            _requestedData,
            gasUsedToCall
        );

        // ToDo - claim gas refund

        // Pay dataProvider (msg.sender)
        totalTokensHeld = totalTokensHeld.sub(fee, "Router: fee amount exceeds router totalTokensHeld");
        tokensHeldForPayment[dataConsumer][msg.sender] = tokensHeldForPayment[dataConsumer][msg.sender].sub(fee, "Router: fee amount exceeds router tokensHeldForPayment for pair");
        require(token.transfer(msg.sender, fee), "Router: token.transfer failed");

        delete dataRequests[_requestId];

        return true;
    }

    /**
     * @dev cancelRequest - called by data Consumer to cancel a request
     * @param _requestId the request the consumer wishes to cancel
     * @return success if the execution was successful. Status is checked in the Consumer contract
     */
    function cancelRequest(bytes32 _requestId) public returns (bool) {
        require(address(msg.sender).isContract(), "Router: only a contract can cancel a request");
        require(dataRequests[_requestId].isSet, "Router: request id does not exist");

        address dataConsumer = dataRequests[_requestId].dataConsumer;
        address dataProvider = dataRequests[_requestId].dataProvider;
        uint256 refund = dataRequests[_requestId].fee;
        uint256 expires = dataRequests[_requestId].expires;

        // msg.sender is the contract address of the consumer
        require(msg.sender == dataConsumer, "Router: msg.sender != dataConsumer");
        require(now >= expires, "Router: request has not yet expired");

        emit RequestCancelled(
            msg.sender,
            dataProvider,
            _requestId,
            refund
        );

        // ToDo - claim gas refund

        // Refund Tokens to dataConsumer (msg.sender)
        totalTokensHeld = totalTokensHeld.sub(refund, "Router: refund amount exceeds router totalTokensHeld");
        tokensHeldForPayment[msg.sender][dataProvider] = tokensHeldForPayment[msg.sender][dataProvider].sub(refund, "Router: refund amount exceeds router tokensHeldForPayment for pair");
        require(token.transfer(msg.sender, refund), "Router: token.transfer failed");

        delete dataRequests[_requestId];

        return true;
    }

    /**
     * @dev grantProviderPermission - called by Consumer to grant permission to a data provider to send data
     * @param _dataProvider address of the data provider to grant access
     * @return success if the execution was successful. Status is checked in the Consumer contract
     */
    function grantProviderPermission(address _dataProvider) public returns (bool) {
        // msg.sender is the address of the Consumer's smart contract
        require(address(msg.sender).isContract(), "Router: only a contract can grant a provider permission");
        requesterAuthorisedProviders[msg.sender][_dataProvider] = true;
        emit GrantProviderPermission(msg.sender, _dataProvider);
        return true;
    }

    /**
     * @dev revokeProviderPermission - called by Consumer to revoke permission for a data provider to send data
     * @param _dataProvider address of the data provider to revoke access
     * @return success if the execution was successful. Status is checked in the Consumer contract
     */
    function revokeProviderPermission(address _dataProvider) public returns (bool) {
        // msg.sender is the address of the Consumer's smart contract
        require(address(msg.sender).isContract(), "Router: only a contract can revoke a provider permission");
        requesterAuthorisedProviders[msg.sender][_dataProvider] = false;
        emit RevokeProviderPermission(msg.sender, _dataProvider);
        return true;
    }

    /**
     * @dev providerIsAuthorised - check if provider is authorised for consumer
     * @param _dataConsumer address of the data provider
     * @param _dataProvider address of the data provider
     * @return success if the execution was successful. Status is checked in the Consumer contract
     */
    function providerIsAuthorised(address _dataConsumer, address _dataProvider) external view returns (bool) {
        return requesterAuthorisedProviders[_dataConsumer][_dataProvider];
    }

    /**
     * @dev getTokenAddress - get the contract address of the Token being used for paying fees
     * @return address of the token smart contract
     */
    function getTokenAddress() external view returns (address) {
        return address(token);
    }

    /**
     * @dev getSalt - get the salt used for generating request IDs
     * @return bytes32 salt
     */
    function getSalt() external view returns (bytes32) {
        return salt;
    }

    /**
     * @dev getTotalTokensHeld - get total tokens currently held by this contract
     * @return uint256 totalTokensHeld
     */
    function getTotalTokensHeld() external view returns (uint256) {
        return totalTokensHeld;
    }

    /**
     * @dev getTokensHeldFor - get tokens currently held by this contract
     * for a consumer/provider pair
     * @param _dataConsumer address of data consumer
     * @param _dataProvider address of data provider
     * @return uint256 totalTokensHeld
     */
    function getTokensHeldFor(address _dataConsumer, address _dataProvider) external view returns (uint256) {
        return tokensHeldForPayment[_dataConsumer][_dataProvider];
    }

    /**
     * @dev getDataRequestConsumer - get the dataConsumer for a request
     * @param _requestId bytes32 request id
     * @return address data consumer contract address
     */
    function getDataRequestConsumer(bytes32 _requestId) external view returns (address) {
        return dataRequests[_requestId].dataConsumer;
    }

    /**
     * @dev getDataRequestProvider - get the dataConsumer for a request
     * @param _requestId bytes32 request id
     * @return address data provider address
     */
    function getDataRequestProvider(bytes32 _requestId) external view returns (address) {
        return dataRequests[_requestId].dataProvider;
    }

    /**
     * @dev getDataRequestExpires - get the expire timestamp for a request
     * @param _requestId bytes32 request id
     * @return uint256 expire timestamp
     */
    function getDataRequestExpires(bytes32 _requestId) external view returns (uint256) {
        return dataRequests[_requestId].expires;
    }

    /**
     * @dev getDataRequestGasPrice - get the max gas price consumer will pay for a request
     * @param _requestId bytes32 request id
     * @return uint256 expire timestamp
     */
    function getDataRequestGasPrice(bytes32 _requestId) external view returns (uint256) {
        return dataRequests[_requestId].gasPrice;
    }

    /**
     * @dev getDataRequestCallback - get the callback function signature for a request
     * @param _requestId bytes32 request id
     * @return bytes4 callback function signature
     */
    function getDataRequestCallback(bytes32 _requestId) external view returns (bytes4) {
        return dataRequests[_requestId].callbackFunction;
    }

    /**
     * @dev getGasTopUpLimit - get the gas top up limit
     * @return uint256 amount in wei
     */
    function getGasTopUpLimit() external view returns (uint256) {
        return gasTopUpLimit;
    }

    /**
     * @dev requestExists - check a request ID exists
     * @param _requestId bytes32 request id
     * @return bool
     */
    function requestExists(bytes32 _requestId) external view returns (bool) {
        return dataRequests[_requestId].isSet;
    }

    /**
     * @dev getTotalGasDeposits - get total gas deposited in Router
     * @return uint256
     */
    function getTotalGasDeposits() external view returns (uint256) {
        return totalGasDeposits;
    }

    /**
     * @dev getGasDepositsForConsumer - get total gas deposited in Router
     * by a data consumer
     * @param _dataConsumer address of data consumer
     * @return uint256
     */
    function getGasDepositsForConsumer(address _dataConsumer) external view returns (uint256) {
        return gasDepositsForConsumer[_dataConsumer];
    }

    /**
     * @dev getGasDepositsForConsumerProviders - get total gas deposited in Router
     * by a data consumer for a given data provider
     * @param _dataConsumer address of data consumer
     * @param _dataProvider address of data provider
     * @return uint256
     */
    function getGasDepositsForConsumerProviders(address _dataConsumer, address _dataProvider) external view returns (uint256) {
        return gasDepositsForConsumerProviders[_dataConsumer][_dataProvider];
    }

modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Router: only admin can do this");
        _;
    }
}
