// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../interfaces/IRouter.sol";
import "../interfaces/IERC20_Ex.sol";
import "./Request.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
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
 *
 * This contract uses {AccessControl} to lock permissioned functions using the
 * different roles.
 */
contract Consumer is AccessControl, Request {
    using SafeMath for uint256;
    using Address for address;

    /*
     * CONSTANTS
     */
    bytes32 public constant ROLE_DATA_PROVIDER = keccak256("DATA_PROVIDER");

    /*
     * STATE VARIABLES
     */
    IRouter private router; // the deployed address of Router smart contract
    IERC20_Ex private token; // deployed address of the Token smart contract
    address private OWNER; // wallet address of the Token holder who will pay fees
    uint256 private requestNonce; // incremented nonce to help prevent request replays
    uint256 private gasPriceLimit; // gas price limit in gwei the consumer is willing to pay for data processing
    uint256 private gasTopUpLimit; // max ETH that can be sent in a gas top up Tx
    uint256 private requestTimeout; // request timeout in seconds

    // Mapping to hold open data requests
    mapping(bytes32 => bool) dataRequests;

    // Mapping for data provider fees
    mapping(address => uint256) dataProviderFees;

    /*
     * EVENTS
     */
    event DataRequestSubmitted(
        address sender,
        address indexed dataConsumer,
        address indexed dataProvider,
        uint256 fee,
        string endpoint,
        uint256 expires,
        uint256 gasPrice,
        bytes32 indexed requestId,
        bytes4 callbackFunctionSignature
    );

    event RouterSet(address indexed sender, address indexed oldRouter, address indexed newRouter);
    event OwnershipTransferred(address indexed sender, address indexed previousOwner, address indexed newOwner);
    event WithdrawTokensFromContract(address indexed sender, address indexed from, address indexed to, uint256 amount);
    event IncreasedRouterAllowance(address indexed sender, address indexed router, address indexed contractAddress, uint256 amount);
    event DecreasedRouterAllowance(address indexed sender, address indexed router, address indexed contractAddress, uint256 amount);
    event AddedDataProvider(address indexed sender, address indexed provider, uint256 fee);
    event RemovedDataProvider(address indexed sender, address indexed provider);
    event SetDataProviderFee(address indexed sender, address indexed provider, uint256 oldFee, uint256 newFee);
    event SetGasPriceLimit(address indexed sender, uint256 oldLimit, uint256 newLimit);
    event SetRequestTimout(address indexed sender, uint256 oldTimeout, uint256 newTimeout);
    event SetGasTopUpLimit(address indexed sender, uint256 oldLimit, uint256 newLimit);

    event RequestCancellationSubmitted(address sender, bytes32 requestId);

    /*
     * MIRRORED EVENTS - FOR CLIENT LOG DECODING
     */

    // Mirrored ERC20 events for web3 client decoding
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // Mirrored Router events for web3 client decoding
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
        require(_router != address(0), "Consumer: router cannot be the zero address");
        require(_router.isContract(), "Consumer: router address must be a contract");

        // set up roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // set up router and token
        router = IRouter(_router);
        token = IERC20_Ex(router.getTokenAddress());

        // set token & contract owner
        OWNER = msg.sender;
        requestNonce = 0;
        gasPriceLimit = 200;
        requestTimeout = 300;
        gasTopUpLimit = 0.5 ether;
        emit RouterSet(msg.sender, address(0), _router);
        emit OwnershipTransferred( msg.sender, address(0), msg.sender);
    }

    /**
     * @dev withdrawAllTokens allows the token holder (contract owner) to withdraw all
     * Tokens held by this contract back to themselves.
     *
     * @return success
     */
    function withdrawAllTokens() public onlyOwner() returns (bool success) {
        uint256 amount = token.balanceOf(address(this));
        if(amount > 0) {
            require(token.transfer(OWNER, amount), "Consumer: token withdraw failed");
            emit WithdrawTokensFromContract(msg.sender, address(this), OWNER, amount);
        }
        return true;
    }

    /**
     * @dev withdrawTokenAmount allows the token holder (contract owner) to withdraw
     * the specified amount of Tokens held by this contract back to themselves.
     *
     * @param _amount the amount of tokens the owner would like to withdraw
     * @return success
     */
    function withdrawTokenAmount(uint256 _amount) public onlyOwner() returns (bool success) {
        uint256 contractBalance = token.balanceOf(address(this));
        require(contractBalance > 0, "Consumer: contract has zero token balance");
        require(token.transfer(OWNER, _amount), "Consumer: token withdraw failed");
        emit WithdrawTokensFromContract(msg.sender, address(this), OWNER, _amount);
        return true;
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`),
     * and withdraws any tokens currentlry held by the contract.
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public onlyOwner() {
        require(newOwner != address(0), "Consumer: new owner is the zero address");
        grantRole(DEFAULT_ADMIN_ROLE, newOwner);
        renounceRole(DEFAULT_ADMIN_ROLE, OWNER);
        require(withdrawAllTokens(), "Consumer: failed to transfer ownership");
        emit OwnershipTransferred(msg.sender, OWNER, newOwner);
        OWNER = newOwner;
    }

    /**
     * @dev increaseRouterAllowance allows the token holder (contract owner) to
     * increase the token allowance for the Router, in order for the Router to
     * pay fees for data requests
     *
     * @param _routerAllowance the amount of tokens the owner would like to increase allocation by
     * @return success
     */
    function increaseRouterAllowance(uint256 _routerAllowance) public onlyOwner() returns (bool success) {
        require(token.increaseAllowance(address(router), _routerAllowance), "Consumer: failed to increase Router token allowance");
        emit IncreasedRouterAllowance(msg.sender, address(router), address(this), _routerAllowance);
        return true;
    }

    /**
     * @dev decreaseRouterAllowance allows the token holder (contract owner) to
     * reduce the token allowance for the Router
     *
     * @param _routerAllowance the amount of tokens the owner would like to decrease allocation by
     * @return success
     */
    function decreaseRouterAllowance(uint256 _routerAllowance) public onlyOwner() returns (bool success) {
        require(token.decreaseAllowance(address(router), _routerAllowance), "Consumer: failed to increase Router token allowance");
        emit DecreasedRouterAllowance(msg.sender, address(router), address(this), _routerAllowance);
        return true;
    }

    /**
     * @dev addDataProvider add a new authorised data provider to this contract, and
     * authorise it to provide data via the Router
     *
     * @param _dataProvider the address of the data provider
     * @param _fee the data provider's fee
     * @return success
     */
    function addDataProvider(address _dataProvider, uint256 _fee) public onlyOwner() returns (bool success) {
        require(_dataProvider != address(0), "Consumer: dataProvider cannot be the zero address");
        require(_fee > 0, "Consumer: fee must be > 0");
        grantRole(ROLE_DATA_PROVIDER, _dataProvider);
        // msg.sender to Rouer will be the address of this contract
        require(router.grantProviderPermission(_dataProvider), "Consumer: failed to grant dataProvider on Router");
        dataProviderFees[_dataProvider] = _fee;
        emit AddedDataProvider(msg.sender, _dataProvider, _fee);
        return true;
    }

    /**
     * @dev removeDataProvider remove a data provider and its authorisation to provide data
     * for this smart contract from the Router
     *
     * @param _dataProvider the address of the data provider
     * @return success
     */
    function removeDataProvider(address _dataProvider)
    public
    onlyOwner()
    isProvider(_dataProvider)
    returns (bool success) {
        revokeRole(ROLE_DATA_PROVIDER, _dataProvider);
        // msg.sender to Rouer will be the address of this contract
        require(router.revokeProviderPermission(_dataProvider), "Consumer: failed to revoke dataProvider on Router");
        delete dataProviderFees[_dataProvider];
        emit RemovedDataProvider(msg.sender, _dataProvider);
        return true;
    }

    /**
     * @dev setDataProviderFee set the fee for a data provider
     *
     * @param _dataProvider the address of the data provider
     * @param _fee the data provider's fee
     * @return success
     */
    function setDataProviderFee(address _dataProvider, uint256 _fee)
    public
    onlyOwner()
    isProvider(_dataProvider)
    returns (bool success) {
        require(_fee > 0, "Consumer: fee must be > 0");
        uint256 oldFee = dataProviderFees[_dataProvider];
        SetDataProviderFee(msg.sender, _dataProvider, oldFee, _fee);
        dataProviderFees[_dataProvider] = _fee;
        return true;
    }

    /**
     * @dev setGasPriceLimit set the gas price limit the Consumer is willing to
     * pay for receiving data from a provider
     *
     * @param _gasPriceLimit the new gas price limit
     * @return success
     */
    function setGasPriceLimit(uint256 _gasPriceLimit) public onlyOwner() returns (bool success) {
        require(_gasPriceLimit > 0, "Consumer: gasPriceLimit must be > 0");
        uint256 oldLimit = gasPriceLimit;
        gasPriceLimit = _gasPriceLimit;
        emit SetGasPriceLimit(msg.sender, oldLimit, _gasPriceLimit);
        return true;
    }

    /**
     * @dev setRequestTimeout set the timeout for data requests, after which
     * the consumer can cancel a request and get a refund
     *
     * @param _newTimeout the new timeout in seconds
     * @return success
     */
    function setRequestTimeout(uint256 _newTimeout) public onlyOwner() returns (bool success) {
        require(_newTimeout > 0, "Consumer: newTimeout must be > 0");
        uint256 oldTimout = requestTimeout;
        requestTimeout = _newTimeout;
        emit SetRequestTimout(msg.sender, oldTimout, _newTimeout);
        return true;
    }

    /**
     * @dev setRouter set the address of the Router smart contract
     *
     * @param _router on chain address of the router smart contract
     * @return success
     */
    function setRouter(address _router) public onlyOwner() returns (bool success) {
        require(_router != address(0), "Consumer: router cannot be the zero address");
        require(_router.isContract(), "Consumer: router address must be a contract");
        address oldRouter = address(router);
        router = IRouter(_router);
        emit RouterSet(msg.sender, oldRouter, _router);
        return true;
    }

    /**
     * @dev setGasTopUpLimit set the max amount of ETH that can be sent
     * in a topUpGas Tx
     *
     * @param _gasTopUpLimit amount in wei
     * @return success
     */
    function setGasTopUpLimit(uint256 _gasTopUpLimit) public onlyOwner() returns (bool success) {
        require(_gasTopUpLimit > 0, "Consumer: _gasTopUpLimit must be > 0");
        require(_gasTopUpLimit <= router.getGasTopUpLimit(), "Consumer: _gasTopUpLimit must be <= Router gasTopUpLimit");
        uint256 oldGasTopUpLimit = gasTopUpLimit;
        gasTopUpLimit = _gasTopUpLimit;
        emit SetGasTopUpLimit(msg.sender, oldGasTopUpLimit, _gasTopUpLimit);
        return true;
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
        address _dataProvider,
        string memory _data,
        uint256 _gasPrice,
        bytes4 _callbackFunctionSignature
    ) public onlyOwner() isProvider(_dataProvider)
    returns (bytes32 requestId) {

        // check gas isn't stupidly high
        require(_gasPrice <= gasPriceLimit, "Consumer: gasPrice > gasPriceLimit");

        uint256 fee = dataProviderFees[_dataProvider];
        // check there are enough tokens, and that the router has a high enough allowance to pay fees
        require(token.balanceOf(address(this)) >= fee, "Consumer: this contract does not have enough tokens to pay fee");
        require(token.allowance(address(this), address(router)) >= fee, "Consumer: not enough Router allowance to pay fee");

        uint256 gasPriceGwei = _gasPrice * (10 ** 9); // convert gwei input to wei

        // generate the requestId
        bytes32 reqId = generateRequestId(
            address(this),
            requestNonce,
            _dataProvider,
            _data,
            _callbackFunctionSignature,
            gasPriceGwei,
            router.getSalt()
        );

        require(!dataRequests[reqId], "Consumer: request id already exists");

        dataRequests[reqId] = true;

        uint256 expires = now + requestTimeout;

        // note - router.initialiseRequest will see msg.sender as the address of this contract
        require(
            router.initialiseRequest(
                _dataProvider,
                fee,
                requestNonce,
                _data,
                gasPriceGwei,
                expires,
                reqId,
                _callbackFunctionSignature
            ), "Consumer: router.initialiseRequest failed");

        requestNonce += 1;

        // only emitted if the router request is successful. Data provider can cross reference and check
        emit DataRequestSubmitted(
            msg.sender,
            address(this), // request comes from the address of this contract
            _dataProvider,
            fee,
            _data,
            expires,
            gasPriceGwei,
            reqId,
            _callbackFunctionSignature
        );
        return reqId;
    }

    /**
    * @dev cancelRequest submit cancellation to the router for the specified request
   *
    * @param _requestId the id of the request being cancelled
    * @return success bool
    */
    function cancelRequest(bytes32 _requestId)
    public onlyOwner()
    returns (bool success) {
        require(dataRequests[_requestId], "Consumer: request id does not exist");
        require(router.cancelRequest(_requestId), "Consumer: router.cancelRequest failed");
        emit RequestCancellationSubmitted(msg.sender, _requestId);
        delete dataRequests[_requestId];
        return true;
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
        return token.balanceOf(address(this));
    }

    /**
     * @dev getRouterAddress returns the address of the Router smart contract being used
     *
     * @return address
     */
    function getRouterAddress() external view returns (address) {
        return address(router);
    }

    /**
     * @dev getDataProviderFee returns the fee for the given provider
     *
     * @return uint256
     */
    function getDataProviderFee(address _dataProvider) external view returns (uint256) {
        return dataProviderFees[_dataProvider];
    }

    /**
     * @dev getRequestNonce returns the current requestNonce
     *
     * @return uint256
     */
    function getRequestNonce() external view returns (uint256) {
        return requestNonce;
    }

    /**
     * @dev owner returns the address of the Consumer contract's owner
     *
     * @return address
     */
    function owner() external view returns (address) {
        return OWNER;
    }

    /**
     * @dev getGasPriceLimit returns gas price limit
     *
     * @return uint256
     */
    function getGasPriceLimit() external view returns (uint256) {
        return gasPriceLimit;
    }

    /**
     * @dev getRequestTimeout returns request timeout
     *
     * @return uint256
     */
    function getRequestTimeout() external view returns (uint256) {
        return requestTimeout;
    }

    /**
     * @dev getGasTopUpLimit - get the gas top up limit
     *
     * @return uint256 amount in wei
     */
    function getGasTopUpLimit() external view returns (uint256) {
        return gasTopUpLimit;
    }

    /*
     * MODIFIERS
     */

    modifier isProvider(address _dataProvider) {
        require(hasRole(ROLE_DATA_PROVIDER, _dataProvider), "Consumer: _dataProvider does not have role DATA_PROVIDER");
        _;
    }

    modifier isValidFulfillment(bytes32 _requestId, uint256 _price, bytes memory _signature) {
        require(msg.sender == address(router), "Consumer: data did not originate from Router");
        require(dataRequests[_requestId], "Consumer: _requestId does not exist");
        bytes32 message = ECDSA.toEthSignedMessageHash(keccak256(abi.encodePacked(_requestId, _price, address(this))));
        address provider = ECDSA.recover(message, _signature);
        require(hasRole(ROLE_DATA_PROVIDER, provider), "Consumer: dataProvider does not have DATA_PROVIDER");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == OWNER, "Consumer: only owner can do this");
        _;
    }
}
