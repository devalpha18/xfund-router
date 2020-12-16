// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../interfaces/IRouter.sol";
import "../interfaces/IERC20_Ex.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

library ConsumerLib {
    using SafeMath for uint256;
    using Address for address;

    uint8 public constant REQUEST_VAR_GAS_PRICE_LIMIT = 1; // gas price limit in gwei the consumer is willing to pay for data processing
    uint8 public constant REQUEST_VAR_TOP_UP_LIMIT = 2; // max ETH that can be sent in a gas top up Tx
    uint8 public constant REQUEST_VAR_REQUEST_TIMEOUT = 3; // request timeout in seconds

    /*
     * STRUCTURES
     */

    struct DataProvider {
        uint256 fee;
        bool isAuthorised;
    }

    struct State {
        IRouter router; // the deployed address of Router smart contract
        IERC20_Ex token; // deployed address of the Token smart contract
        address payable OWNER; // wallet address of the Token holder who will pay fees
        uint256 requestNonce; // incremented nonce to help prevent request replays

        // common request variables
        mapping(uint8 => uint256) requestVars;

        // Mapping to hold open data requests
        mapping(bytes32 => bool) dataRequests;

        // Mapping for data providers
        mapping(address => DataProvider) dataProviders;
    }

    /*
     * EVENTS
     */

    event DataRequestSubmitted(bytes32 indexed requestId);
    event RouterSet(address indexed sender, address indexed oldRouter, address indexed newRouter);
    event OwnershipTransferred(address indexed sender, address indexed previousOwner, address indexed newOwner);
    event WithdrawTokensFromContract(address indexed sender, address indexed from, address indexed to, uint256 amount);
    event IncreasedRouterAllowance(address indexed sender, address indexed router, address indexed contractAddress, uint256 amount);
    event DecreasedRouterAllowance(address indexed sender, address indexed router, address indexed contractAddress, uint256 amount);
    event AddedDataProvider(address indexed sender, address indexed provider, uint256 oldFee, uint256 newFee);
    event RemovedDataProvider(address indexed sender, address indexed provider);
    event SetRequestVar(address indexed sender, uint8 variable, uint256 oldValue, uint256 newValue);

    event RequestCancellationSubmitted(address sender, bytes32 requestId);

    event PaymentRecieved(address sender, uint256 amount);

    /*
     * WRITE FUNCTIONS
     */

    function init(State storage self, address _router) public {
        require(_router != address(0), "ConsumerLib: router cannot be the zero address");
        require(_router.isContract(), "ConsumerLib: router address must be a contract");

        // set up router and token
        self.router = IRouter(_router);
        self.token = IERC20_Ex(self.router.getTokenAddress());

        // set token & contract owner
        self.OWNER = msg.sender;
        self.requestNonce = 0;
        self.requestVars[REQUEST_VAR_GAS_PRICE_LIMIT] = 200;
        self.requestVars[REQUEST_VAR_REQUEST_TIMEOUT] = 300;
        self.requestVars[REQUEST_VAR_TOP_UP_LIMIT] = 0.5 ether;

        emit RouterSet(msg.sender, address(0), _router);
        emit OwnershipTransferred( msg.sender, address(0), msg.sender);
    }

    /**
     * @dev addDataProvider add a new authorised data provider to this contract, and
     * authorise it to provide data via the Router. Can also be used to modify
     * a provider's fee
     *
     * @param _dataProvider the address of the data provider
     * @param _fee the data provider's fee
     * @return success
     */
    function addDataProvider(State storage self, address _dataProvider, uint256 _fee) public returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(_dataProvider != address(0), "ConsumerLib: dataProvider cannot be the zero address");

        DataProvider storage dp = self.dataProviders[_dataProvider];

        // new provider. Initial fee must be > 0
        if(dp.fee == 0) {
            require(_fee > 0, "ConsumerLib: fee must be > 0");
        }

        uint256 oldFee = dp.fee;

        // only set if the fee is > 0
        if(_fee > 0) {
            dp.fee = _fee;
        }

        if(!dp.isAuthorised) {
            dp.isAuthorised = true;
            require(self.router.grantProviderPermission(_dataProvider));
        }
        emit AddedDataProvider(msg.sender, _dataProvider, oldFee, dp.fee);
        return true;
    }

    /**
     * @dev removeDataProvider remove a data provider and its authorisation to provide data
     * for this smart contract from the Router
     *
     * @param _dataProvider the address of the data provider
     * @return success
     */
    function removeDataProvider(State storage self, address _dataProvider)
    public
    returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(self.dataProviders[_dataProvider].isAuthorised, "ConsumerLib: _dataProvider is not authorised");
        // msg.sender to Router will be the address of this contract
        require(self.router.revokeProviderPermission(_dataProvider));
        self.dataProviders[_dataProvider].isAuthorised = false;
        emit RemovedDataProvider(msg.sender, _dataProvider);
        return true;
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`),
     * and withdraws any tokens currentlry held by the contract.
     * Can only be called by the current owner.
     *
     * @param newOwner the address of the new owner
     * @return success
     */
    function transferOwnership(State storage self, address payable newOwner) public returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(newOwner != address(0), "ConsumerLib: new owner cannot be the zero address");
        require(self.router.getGasDepositsForConsumer(address(this)) == 0, "ConsumerLib: owner must withdraw all gas from router first");
        require(withdrawAllTokens(self), "ConsumerLib: failed to withdraw tokens from Router");
        emit OwnershipTransferred(msg.sender, self.OWNER, newOwner);
        self.OWNER = newOwner;
        return true;
    }

    /**
     * @dev withdrawAllTokens allows the token holder (contract owner) to withdraw all
     * Tokens held by this contract back to themselves.
     *
     * @return success
     */
    function withdrawAllTokens(State storage self) public returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        uint256 amount = self.token.balanceOf(address(this));
        if(amount > 0) {
            require(self.token.transfer(self.OWNER, amount), "ConsumerLib: token withdraw failed");
            emit WithdrawTokensFromContract(msg.sender, address(this), self.OWNER, amount);
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
    function withdrawTokenAmount(State storage self, uint256 _amount) public returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        uint256 contractBalance = self.token.balanceOf(address(this));
        require(contractBalance > 0, "ConsumerLib: contract has zero token balance");
        require(self.token.transfer(self.OWNER, _amount), "ConsumerLib: token withdraw failed");
        emit WithdrawTokensFromContract(msg.sender, address(this), self.OWNER, _amount);
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
    function increaseRouterAllowance(State storage self, uint256 _routerAllowance) public returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(self.token.increaseAllowance(address(self.router), _routerAllowance));
        emit IncreasedRouterAllowance(msg.sender, address(self.router), address(this), _routerAllowance);
        return true;
    }

    /**
     * @dev decreaseRouterAllowance allows the token holder (contract owner) to
     * reduce the token allowance for the Router
     *
     * @param _routerAllowance the amount of tokens the owner would like to decrease allocation by
     * @return success
     */
    function decreaseRouterAllowance(State storage self, uint256 _routerAllowance) public returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(self.token.decreaseAllowance(address(self.router), _routerAllowance));
        emit DecreasedRouterAllowance(msg.sender, address(self.router), address(this), _routerAllowance);
        return true;
    }

    /**
    * @dev setRequestVar set the specified variable. Request variables are used
    * when initialising a request, and are common settings for requests.
    *
    * The variable to be set can be one of:
    * 1 - gas price limit in gwei the consumer is willing to pay for data processing
    * 2 - max ETH that can be sent in a gas top up Tx
    * 3 - request timeout in seconds
    *
    * @param _var uint8 the variable being set.
    * @param _value uint256 the new value
    * @return success
    */
    function setRequestVar(State storage self, uint8 _var, uint256 _value) public returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(_value > 0, "ConsumerLib: _value must be > 0");
        if(_var == REQUEST_VAR_TOP_UP_LIMIT) {
            require(_value <= self.router.getGasTopUpLimit(), "ConsumerLib: _value must be <= Router gasTopUpLimit");
        }
        uint256 oldValue = self.requestVars[_var];
        self.requestVars[_var] = _value;
        emit SetRequestVar(msg.sender, _var, oldValue, _value);
        return true;
    }

    /**
     * @dev setRouter set the address of the Router smart contract
     *
     * @param _router on chain address of the router smart contract
     * @return success
     */
    function setRouter(State storage self, address _router) public returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(_router != address(0), "ConsumerLib: router cannot be the zero address");
        require(_router.isContract(), "ConsumerLib: router address must be a contract");
        address oldRouter = address(self.router);
        self.router = IRouter(_router);
        emit RouterSet(msg.sender, oldRouter, _router);
        return true;
    }

    /**
     * @dev submitDataRequest submit a new data request to the Router. The router will
     * verify the data request, and route it to the data provider
     *
     * @param self State object
     * @param _dataProvider the address of the data provider to send the request to
     * @param _data type of data being requested. E.g. PRICE.BTC.USD.AVG requests average price for BTC/USD pair
     * @param _gasPrice the gas price the consumer would like the provider to use for sending data back
     * @param _callbackFunctionSignature the callback function the provider should call to send data back
     * @return requestId - the bytes32 request id
     */
    function submitDataRequest(
        State storage self,
        address payable _dataProvider,
        bytes32 _data,
        uint256 _gasPrice,
        bytes4 _callbackFunctionSignature
    ) public
    returns (bytes32 requestId) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(self.dataProviders[_dataProvider].isAuthorised, "ConsumerLib: _dataProvider is not authorised");
        // check gas isn't stupidly high
        require(_gasPrice <= self.requestVars[REQUEST_VAR_GAS_PRICE_LIMIT], "ConsumerLib: gasPrice > gasPriceLimit");
        // check there are enough tokens, and that the router has a high enough allowance to pay fees
        uint256 fee = self.dataProviders[_dataProvider].fee;

        // generate the requestId
        bytes32 reqId = keccak256(
            abi.encodePacked(
                address(this),
                _dataProvider,
                address(self.router),
                self.requestNonce
            )
        );

        require(!self.dataRequests[reqId], "ConsumerLib: request id already exists");

        self.dataRequests[reqId] = true;

        uint256 expires = now + self.requestVars[REQUEST_VAR_REQUEST_TIMEOUT];

        // note - router.initialiseRequest will see msg.sender as the address of this contract
        require(
            self.router.initialiseRequest(
                _dataProvider,
                fee,
                self.requestNonce,
                _gasPrice * (10 ** 9), // gwei to wei
                expires,
                reqId, // will be regenerated and cross referenced in Router
                _data,
                _callbackFunctionSignature
            ));

        self.requestNonce += 1;

        // only emitted if the router request is successful.
        emit DataRequestSubmitted(reqId);
        return reqId;
    }

    /**
    * @dev cancelRequest submit cancellation to the router for the specified request
    *
    * @param _requestId the id of the request being cancelled
    * @return success bool
    */
    function cancelRequest(State storage self, bytes32 _requestId)
    public
    returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(self.dataRequests[_requestId], "ConsumerLib: request id does not exist");
        require(self.router.cancelRequest(_requestId));
        emit RequestCancellationSubmitted(msg.sender, _requestId);
        delete self.dataRequests[_requestId];
        return true;
    }
}
