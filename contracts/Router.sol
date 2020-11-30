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
contract Router is AccessControl {
    using SafeMath for uint256;
    using Address for address;

    IERC20 private token; // Contract address of ERC-20 Token being used to pay for data
    bytes32 private salt;
    bytes32 private constant ROLE_EDITOR = keccak256("EDITOR");

    // Mapping for [dataConsumers] to [dataProviders].
    // A dataProvider is authorised to provide data for the dataConsumer
    mapping(address => mapping(address => bool)) public requesterAuthorisedProviders;

    // Mapping to hold open data requests
    mapping(bytes32 => Request.DataRequest) public dataRequests;

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
        bytes4 callbackFunctionSignature
    );

    // GrantProviderAuthorisation event. Emitted when a data consumer grants a data provider to provide data
    event GrantProviderAuthorisation(address indexed dataConsumer, address indexed dataProvider);

    // RevokeProviderAuthorisation event. Emitted when a data consumer revokes access for a data provider to provide data
    event RevokeProviderAuthorisation(address indexed dataConsumer, address indexed dataProvider);

    // RequestFulfilled event. Emitted when a data provider has sent the data requested
    event RequestFulfilled(
        address indexed dataConsumer,
        address indexed dataProvider,
        bytes32 indexed requestId,
        bytes4 callbackFunctionSignature,
        uint256 requestedData,
        uint256 gasUsedToCall
    );

    // SaltSet used during deployment
    event SaltSet(bytes32 salt);

    // TokenSet used during deployment
    event TokenSet(address tokenAddress);

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
        _setupRole(ROLE_EDITOR, msg.sender);
        emit TokenSet(_token);
        emit SaltSet(_salt);
    }

    /**
     * @dev initialiseRequest - called by Consumer contract to initialise a data request
     * @param _dataProvider address of the data provider. Must be authorised for this consumer
     * @param _fee amount of Tokens to pay for data
     * @param _requestNonce incremented nonce for Consumer to help prevent request replay
     * @param _data type of data being requested. E.g. PRICE.BTC.USD.AVG requests average price for BTC/USD pair
     * @param _gasPrice gas price Consumer is willing to pay for data return. Converted to gwei (10 ** 9) in this method
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
        bytes32 _requestId,
        bytes4 _callbackFunctionSignature
    ) public returns (bool success) {
        // msg.sender is the address of the Consumer's smart contract
        require(requesterAuthorisedProviders[msg.sender][_dataProvider], "Router: dataProvider not authorised for this dataConsumer");

        bytes32 reqId = keccak256(
            abi.encodePacked(
                msg.sender, // msg.sender is the address of the Consumer contract, NOT the Consumer contract owner/Token holder
                _requestNonce,
                _dataProvider,
                _data,
                _callbackFunctionSignature,
                _gasPrice,
                salt
            )
        );
        require(reqId == _requestId, "Router: reqId != _requestId");
        require(!dataRequests[reqId].isSet, "Router: request id already initialised");

        // ToDo - transfer fee into this Router contract as a holding place. Once request is fulfilled,
        //        forward to the provider. Also allows for request cancellations and refunds.

        // msg.sender is the address of the Consumer smart contract calling this function.
        // It must have enough Tokens to pay for the dataProvider's fee
        require(token.transferFrom(msg.sender, _dataProvider, _fee), "Router: token.transferFrom failed");

        dataRequests[reqId] = Request.DataRequest(
          {
            dataConsumer: msg.sender,
            dataProvider: _dataProvider,
            callbackFunction: _callbackFunctionSignature,
            isSet: true
          }
        );

        // Transfer successful - emit the DataRequested event
        emit DataRequested(msg.sender, _dataProvider, _fee, _data, _requestId, _gasPrice, _callbackFunctionSignature);
        return true;
    }

    /**
     * @dev fulfillRequest - called by data provider to forward data to the Consumer
     * @param _requestId the request the provider is snding data for
     * @param _requestedData the data to send
     * @param _signature data provider's signature of the _requestId, _requestedData and Consumer's address
     *                   this will used to validate the data's origin in the Consumer's contract
     * @return success if the execution was successful. Status is checked in the Consumer contract
     */
    function fulfillRequest(bytes32 _requestId, uint256 _requestedData, bytes memory _signature) public returns (bool){
        require(dataRequests[_requestId].isSet, "Router: request id does not exist");

        address dataConsumer = dataRequests[_requestId].dataConsumer;
        address dataProvider = dataRequests[_requestId].dataProvider;
        bytes4 callbackFunction = dataRequests[_requestId].callbackFunction;

        require(dataConsumer.isContract(), "Router: dataConsumer is not a smart contract");

        require(msg.sender == dataProvider, "Router: msg.sender != request dataProvider");
        // msg.sender is the address of the data provider
        require(requesterAuthorisedProviders[dataConsumer][msg.sender], "Router: dataProvider not authorised for this dataConsumer");

        require(msg.sender == dataProvider, "Router: msg.sender does not match dataProvider for request id");

        // dataConsumer will see msg.sender as the Router's contract address
        uint256 gasLeftBefore = gasleft();
        // using OZ's Address library
        dataConsumer.functionCall(abi.encodeWithSelector(callbackFunction, _requestedData, _requestId, _signature));

        uint256 gasLeftAfter = gasleft();
        uint256 gasUsedToCall = gasLeftBefore - gasLeftAfter;

        emit RequestFulfilled(dataRequests[_requestId].dataConsumer, msg.sender, _requestId, callbackFunction, _requestedData, gasUsedToCall);

        // ToDo - claim gas refund

        delete dataRequests[_requestId];

        return true;
    }

    // ToDo
    function cancelRequest(bytes32 _requestId) public returns (bool) {
        return true;
    }

    /**
     * @dev grantProviderPermission - called by Consumer to grant permission to a data provider to send data
     * @param _dataProvider address of the data provider to grant access
     * @return success if the execution was successful. Status is checked in the Consumer contract
     */
    function grantProviderPermission(address _dataProvider) public returns (bool) {
        // msg.sender is the address of the Consumer's smart contract
        requesterAuthorisedProviders[msg.sender][_dataProvider] = true;
        emit GrantProviderAuthorisation(msg.sender, _dataProvider);
        return true;
    }

    /**
     * @dev revokeProviderPermission - called by Consumer to revoke permission for a data provider to send data
     * @param _dataProvider address of the data provider to revoke access
     * @return success if the execution was successful. Status is checked in the Consumer contract
     */
    function revokeProviderPermission(address _dataProvider) public returns (bool) {
        // msg.sender is the address of the Consumer's smart contract
        requesterAuthorisedProviders[msg.sender][_dataProvider] = false;
        emit RevokeProviderAuthorisation(msg.sender, _dataProvider);
        return true;
    }

    /**
     * @dev getTokenAddress - get the contract address of the Token being used for paying fees
     * @return address of the token smart contract
     */
    function getTokenAddress() public view returns (address) {
        return address(token);
    }

    /**
     * @dev getSalt - get the salt used for generating request IDs
     * @return salt
     */
    function getSalt() public view returns (bytes32) {
        return salt;
    }

    modifier isEditor() {
        require(hasRole(ROLE_EDITOR, msg.sender), "Router: only an editor can do this");
        _;
    }

    modifier isAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Router: only admin can do this");
        _;
    }

    modifier isAdminOrEditor() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(ROLE_EDITOR, msg.sender), "Router: only admin can do this");
        _;
    }
}
