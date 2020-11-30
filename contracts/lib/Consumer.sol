// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../interfaces/IRouter.sol";
import "../interfaces/IERC20_Ex.sol";
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
contract Consumer is AccessControl {
    using SafeMath for uint256;
    using Address for address;

    /*
     * CONSTANTS
     */
    bytes32 public constant ROLE_DATA_PROVIDER = keccak256("DATA_PROVIDER");
    bytes32 public constant ROLE_DATA_REQUESTER = keccak256("DATA_REQUESTER");

    /*
     * STATE VARIABLES
     */
    IRouter private router; // the deployed address of Router smart contract
    IERC20_Ex private token; // deployed address of the Token smart contract
    address private OWNER; // wallet address of the Token holder who will pay fees
    uint256 private requestNonce; // incremented nonce to help prevent request replays
    uint private gasPriceLimit; // gas price limit in gwei the consumer is willing to pay for data processing

    // Mapping to hold open data requests
    mapping(bytes32 => bool) dataRequests;

    // Mapping for data provider fees
    mapping(address => uint256) dataProviderFees;

    /*
     * EVENTS
     */
    event DataRequestSubmitted(
        address indexed dataConsumer,
        address indexed dataProvider,
        uint256 fee,
        string endpoint,
        bytes32 indexed requestId,
        bytes4 callbackFunctionSignature
    );

    event RouterSet(address router);
    event OwnerSet(address owner);

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
        _setupRole(ROLE_DATA_REQUESTER, msg.sender);

        // set up router and token
        router = IRouter(_router);
        token = IERC20_Ex(router.getTokenAddress());

        // set token owner
        OWNER = msg.sender;
        requestNonce = 0;
        gasPriceLimit = 200;
        emit RouterSet(_router);
        emit OwnerSet(msg.sender);
    }

    /**
     * @dev withdrawAllTokens allows the token holder (contract owner) to withdraw all
     * Tokens held by this contract back to themselves.
     *
     * @return success
     */
    function withdrawAllTokens() public isTokenOwner() returns (bool success) {
        require(token.transfer(OWNER, token.balanceOf(address(this))), "Consumer: token withdraw failed");
        return true;
    }

    /**
     * @dev withdrawTokenAmount allows the token holder (contract owner) to withdraw
     * the specified amount of Tokens held by this contract back to themselves.
     *
     * @param _amount the amount of tokens the owner would like to withdraw
     * @return success
     */
    function withdrawTokenAmount(uint256 _amount) public isTokenOwner() returns (bool success) {
        require(token.transfer(OWNER, _amount), "Consumer: token withdraw failed");
        return true;
    }

    /**
     * @dev increaseRouterAllowance allows the token holder (contract owner) to
     * increase the token allowance for the Router, in order for the Router to
     * pay fees for data requests
     *
     * @param _routerAllowance the amount of tokens the owner would like to increase allocation by
     * @return success
     */
    function increaseRouterAllowance(uint256 _routerAllowance) public isTokenOwner() returns (bool success) {
        require(token.increaseAllowance(address(router), _routerAllowance), "Consumer: failed to increase Router token allowance");
        return true;
    }

    /**
     * @dev decreaseRouterAllowance allows the token holder (contract owner) to
     * reduce the token allowance for the Router
     *
     * @param _routerAllowance the amount of tokens the owner would like to decrease allocation by
     * @return success
     */
    function decreaseRouterAllowance(uint256 _routerAllowance) public isTokenOwner() returns (bool success) {
        require(token.decreaseAllowance(address(router), _routerAllowance), "Consumer: failed to increase Router token allowance");
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
    function addDataProvider(address _dataProvider, uint256 _fee) public isAdmin() returns (bool success) {
        require(_dataProvider != address(0), "Consumer: dataProvider cannot be the zero address");
        require(_fee > 0, "Consumer: fee must be > 0");
        grantRole(ROLE_DATA_PROVIDER, _dataProvider);
        require(router.grantProviderPermission(_dataProvider), "Consumer: failed to grant dataProvider on Router");
        dataProviderFees[_dataProvider] = _fee;
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
    isAdmin()
    isProvider(_dataProvider)
    returns (bool success) {
        require(_dataProvider != address(0), "Consumer: dataProvider cannot be the zero address");
        revokeRole(ROLE_DATA_PROVIDER, _dataProvider);
        require(router.revokeProviderPermission(_dataProvider), "Consumer: failed to revoke dataProvider on Router");
        delete dataProviderFees[_dataProvider];
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
    isAdmin()
    isProvider(_dataProvider)
    returns (bool success) {
        require(_fee > 0, "Consumer: fee must be > 0");
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
    function setGasPriceLimit(uint _gasPriceLimit) public isAdmin() returns (bool success) {
        require(_gasPriceLimit > 0, "Consumer: gasPriceLimit must be > 0");
        gasPriceLimit = _gasPriceLimit;
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
    ) public isAutorisedRequester() isProvider(_dataProvider)
    returns (bytes32 requestId) {

        // check gas isn't stupidly high
        require(_gasPrice <= gasPriceLimit, "Consumer: gasPrice > gasPriceLimit");

        uint256 fee = dataProviderFees[_dataProvider];
        // check there are enough tokens, and that the router has a high enough allowance to pay fees
        require(token.balanceOf(address(this)) >= fee, "Consumer: this contract does not have enough tokens to pay fee");
        require(token.allowance(address(this), address(router)) >= fee, "Consumer: not enough Router allowance to pay fee");

        uint256 gasPriceGwei = _gasPrice * (10 ** 9); // convert gwei input to wei

        // generate the requestId
        requestId = keccak256(
            abi.encodePacked(
                address(this),
                requestNonce,
                _dataProvider,
                _data,
                _callbackFunctionSignature,
                gasPriceGwei,
                router.getSalt()
            )
        );

        dataRequests[requestId] = true;

        // note - router.initialiseRequest will see msg.sender as the address of this contract
        require(
            router.initialiseRequest(
                _dataProvider,
                fee,
                requestNonce,
                _data,
                gasPriceGwei,
                requestId,
                _callbackFunctionSignature
            ), "submitDataRequest: router.initialiseRequest failed");

        requestNonce += 1;

        // only emitted if the router request is successful. Data provider can cross reference and check
        emit DataRequestSubmitted(
            address(this), // request comes from the address of this contract
            _dataProvider,
            fee,
            _data,
            requestId,
            _callbackFunctionSignature
        );
        return requestId;
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
     * @dev getOwnerAddress returns the address of the Consumer contract's owner
     *
     * @return address
     */
    function getOwnerAddress() external view returns (address) {
        return OWNER;
    }

    /*
     * MODIFIERS
     */
    modifier isAutorisedRequester() {
        require(hasRole(ROLE_DATA_REQUESTER, msg.sender), "Consumer: only authorised requesters can request data");
        _;
    }

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
    
    modifier isTokenOwner() {
        require(msg.sender == OWNER, "Consumer: not token owner");
        _;
    }

    modifier isAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Consumer: only admin can do this");
        _;
    }
}
