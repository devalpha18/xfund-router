// SPDX-License-Identifier: MIT

pragma solidity ^0.6.0;

import "../interfaces/IRouter.sol";
import "../interfaces/IERC20_Ex.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title ConsumerLib smart contract
 * @dev Library smart contract containing the core functionality required for a data consumer
 * to initialise data requests and interact with the Router smart contract. This contract
 * will be deployed, and allow developers to link it to their own smart contract, via the
 * ConsumerBase.sol smart contract. There is no need to import this smart contract, since the
 * ConsumerBase.sol smart contract has the required proxy functions for data request and fulfilment
 * interaction.
 *
 * Most of the functions in this contract are proxied by the Consumer smart contract
 */
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
        uint8 isInitialised; // set once during init() to ensure it can only be called once

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

    /**
     * @dev DataRequestSubmitted - emitted when a Consumer initiates a successful data request
     * @param requestId request ID
     */
    event DataRequestSubmitted(bytes32 indexed requestId);

    /**
     * @dev RouterSet - emitted when the owner updates the Router smart contract address
     * @param sender address of the owner
     * @param oldRouter old Router address
     * @param newRouter new Router address
     */
    event RouterSet(address indexed sender, address indexed oldRouter, address indexed newRouter);

    /**
     * @dev OwnershipTransferred - emitted when the owner transfers ownership of the Consumer contract to
     *      a new address
     * @param sender address of the owner
     * @param previousOwner old owner address
     * @param newOwner new owner address
     */
    event OwnershipTransferred(address indexed sender, address indexed previousOwner, address indexed newOwner);

    /**
     * @dev WithdrawTokensFromContract - emitted when the owner withdraws any Tokens held by the Consumer contract
     * @param sender address of the owner
     * @param from address tokens are being sent from
     * @param to address tokens are being sent to
     * @param amount amount being withdrawn
     */
    event WithdrawTokensFromContract(address indexed sender, address indexed from, address indexed to, uint256 amount);

    /**
     * @dev IncreasedRouterAllowance - emitted when the owner increases the Router's token allowance
     * @param sender address of the owner
     * @param router address of the Router
     * @param contractAddress address of the Consumer smart contract
     * @param amount amount
     */
    event IncreasedRouterAllowance(address indexed sender, address indexed router, address indexed contractAddress, uint256 amount);

    /**
     * @dev DecreasedRouterAllowance - emitted when the owner decreases the Router's token allowance
     * @param sender address of the owner
     * @param router address of the Router
     * @param contractAddress address of the Consumer smart contract
     * @param amount amount
     */
    event DecreasedRouterAllowance(address indexed sender, address indexed router, address indexed contractAddress, uint256 amount);

    /**
     * @dev AddedDataProvider - emitted when the owner adds a new data provider
     * @param sender address of the owner
     * @param provider address of the provider
     * @param oldFee old fee to be paid per data request
     * @param newFee new fee to be paid per data request
     */
    event AddedDataProvider(address indexed sender, address indexed provider, uint256 oldFee, uint256 newFee);

    /**
     * @dev RemovedDataProvider - emitted when the owner removes a data provider
     * @param sender address of the owner
     * @param provider address of the provider
     */
    event RemovedDataProvider(address indexed sender, address indexed provider);

    /**
     * @dev SetRequestVar - emitted when the owner changes a request variable
     * @param sender address of the owner
     * @param variable variable being changed
     * @param oldValue old value
     * @param newValue new value
     */
    event SetRequestVar(address indexed sender, uint8 variable, uint256 oldValue, uint256 newValue);

    /**
    * @dev RequestCancellationSubmitted - emitted when the owner cancels a data request
    * @param sender address of the owner
    * @param requestId ID of request being cancelled
    */
    event RequestCancellationSubmitted(address sender, bytes32 requestId);

    event PaymentRecieved(address sender, uint256 amount);

    event EthWithdrawn(address receiver, uint256 amount);

    /*
     * WRITE FUNCTIONS
     */

    /**
     * @dev init - called once during the ConsumerBase.sol's constructor function to initialise the
     *      contract's data storage
     * @param self the Contract's State object
     * @param _router address of the Router smart contract
     */
    function init(State storage self, address _router) external {
        require(_router != address(0), "ConsumerLib: router cannot be the zero address");
        require(_router.isContract(), "ConsumerLib: router address must be a contract");
        require(self.isInitialised == 0, "ConsumerLib: already initialised");

        // set up router and token
        self.router = IRouter(_router);
        self.token = IERC20_Ex(self.router.getTokenAddress());

        // set token & contract owner
        self.OWNER = msg.sender;
        self.requestNonce = 0;
        self.requestVars[REQUEST_VAR_GAS_PRICE_LIMIT] = 200;
        self.requestVars[REQUEST_VAR_REQUEST_TIMEOUT] = 300;
        self.requestVars[REQUEST_VAR_TOP_UP_LIMIT] = 0.5 ether;
        self.isInitialised = 1;

        emit RouterSet(msg.sender, address(0), _router);
        emit OwnershipTransferred( msg.sender, address(0), msg.sender);
    }

    /**
     * @dev addRemoveDataProvider add a new authorised data provider to this contract, and
     *      authorise it to provide data via the Router, or de-authorise an existing provider.
     *      Can also be used to modify a provider's fee for an existing authorised provider.
     *      If the provider is currently authorised when setting the fee, the Router's
     *      grantProviderPermission is not called to conserve gas.
     *
     * @param self the Contract's State object
     * @param _dataProvider the address of the data provider
     * @param _fee the data provider's fee
     * @param _remove bool set to true to de-authorise
     * @return success
     */
    function addRemoveDataProvider(State storage self, address _dataProvider, uint256 _fee, bool _remove)
    external returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(_dataProvider != address(0), "ConsumerLib: dataProvider cannot be the zero address");

        if(_remove) {
            require(self.dataProviders[_dataProvider].isAuthorised, "ConsumerLib: _dataProvider is not authorised");
            // msg.sender to Router will be the address of this contract
            require(self.router.revokeProviderPermission(_dataProvider));
            self.dataProviders[_dataProvider].isAuthorised = false;
            emit RemovedDataProvider(msg.sender, _dataProvider);
            return true;
        }

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

        // only call if provider is not currently authorised, to save gas
        if(!dp.isAuthorised) {
            dp.isAuthorised = true;
            require(self.router.grantProviderPermission(_dataProvider));
        }
        emit AddedDataProvider(msg.sender, _dataProvider, oldFee, dp.fee);
        return true;
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`),
     *      and withdraws any tokens currentlry held by the contract.
     *      Can only be called by the current owner.
     *
     * @param self the Contract's State object
     * @param newOwner the address of the new owner
     * @return success
     */
    function transferOwnership(State storage self, address payable newOwner) external returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(newOwner != address(0), "ConsumerLib: new owner cannot be the zero address");
        require(self.router.getGasDepositsForConsumer(address(this)) == 0, "ConsumerLib: owner must withdraw all gas from router first");
        require(withdrawAllTokens(self));
        emit OwnershipTransferred(msg.sender, self.OWNER, newOwner);
        self.OWNER = newOwner;
        return true;
    }

    /**
     * @dev validateTopUpGas called by the underlying ConsumerBase.sol contract in order to
     *      validate the topUpGas input prior to forwarding ETH and data to the Router.
     *
     * @param _dataProvider address of data provider for whom gas will be refunded
     * @param _amount amount of ETH being sent as gas topup
     * @return success
     */
    function validateTopUpGas(State storage self, address _dataProvider, uint256 _amount)
    external view
    returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(_amount > 0, "ConsumerLib: amount cannot be zero");
        require(self.dataProviders[_dataProvider].isAuthorised, "ConsumerLib: _dataProvider is not authorised");
        require(_amount <= self.requestVars[2], "ConsumerLib: amount cannot exceed own gasTopUpLimit");
        return true;
    }

    /**
     * @dev withdrawTopUpGas allows the Consumer contract's owner to withdraw any ETH
     *      held by the Router for the specified data provider. All ETH held will be withdrawn
     *      from the Router and forwarded to the Consumer contract owner's wallet.this
     *
     *      NOTE: This function is called by the Consumer's withdrawTopUpGas function
     *
     * @param self the Contract's State object
     * @param _dataProvider address of associated data provider for whom ETH will be withdrawn
     */
    function withdrawTopUpGas(State storage self, address _dataProvider)
    public
    returns (bool success){
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        uint256 amount = self.router.withDrawGasTopUpForProvider(_dataProvider);
        require(withdrawEth(self, amount));
        return true;
    }

    /**
     * @dev withdrawEth allows the Consumer contract's owner to withdraw any ETH
     *      that has been sent to the Contract, either accidentally or via the
     *      withdrawTopUpGas function. In the case of the withdrawTopUpGas function, this
     *      is automatically called as part of that function. ETH is sent to the
     *      Consumer contract's current owner's wallet.
     *
     *      NOTE: This function is called by the Consumer's withdrawEth function
     *
     * @param self the Contract's State object
     * @param amount amount (in wei) of ETH to be withdrawn
     */
    function withdrawEth(State storage self, uint256 amount)
    public
    returns (bool success){
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(amount > 0, "ConsumerLib: nothing to withdraw");
        require(address(this).balance >= amount, "ConsumerLib: not enough balance");
        Address.sendValue(self.OWNER, amount);
        emit EthWithdrawn(self.OWNER, amount);
        return true;
    }

    /**
     * @dev withdrawAllTokens allows the token holder (contract owner) to withdraw all
     *      Tokens held by this contract back to themselves.
     *
     * @param self the Contract's State object
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
     * @dev setRouterAllowance allows the token holder (contract owner) to
     *      increase/decrease the token allowance for the Router, in order for the Router to
     *      pay fees for data requests
     *
     * @param self the Contract's State object
     * @param _routerAllowance the amount of tokens the owner would like to increase/decrease allocation by
     * @param _increase bool true to increase, false to decrease
     * @return success
     */
    function setRouterAllowance(State storage self, uint256 _routerAllowance, bool _increase) external returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        if(_increase) {
            require(self.token.increaseAllowance(address(self.router), _routerAllowance));
            emit IncreasedRouterAllowance(msg.sender, address(self.router), address(this), _routerAllowance);
        } else {
            require(self.token.decreaseAllowance(address(self.router), _routerAllowance));
            emit DecreasedRouterAllowance(msg.sender, address(self.router), address(this), _routerAllowance);
        }
        return true;
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
     * @param self the Contract's State object
     * @param _var uint8 the variable being set.
     * @param _value uint256 the new value
     * @return success
     */
    function setRequestVar(State storage self, uint8 _var, uint256 _value) external returns (bool success) {
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
     * @param self the Contract's State object
     * @param _router on chain address of the router smart contract
     * @return success
     */
    function setRouter(State storage self, address _router) external returns (bool success) {
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
     *      verify the data request, and route it to the data provider
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
    ) external
    returns (bytes32 requestId) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(self.dataProviders[_dataProvider].isAuthorised, "ConsumerLib: _dataProvider is not authorised");
        // check gas isn't stupidly high
        require(_gasPrice <= self.requestVars[REQUEST_VAR_GAS_PRICE_LIMIT], "ConsumerLib: gasPrice > gasPriceLimit");
        // get the fee currently set
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
     * @param self the Contract's State object
     * @param _requestId the id of the request being cancelled
     * @return success bool
     */
    function cancelRequest(State storage self, bytes32 _requestId)
    external
    returns (bool success) {
        require(msg.sender == self.OWNER, "ConsumerLib: only owner");
        require(self.dataRequests[_requestId], "ConsumerLib: request id does not exist");
        require(self.router.cancelRequest(_requestId));
        emit RequestCancellationSubmitted(msg.sender, _requestId);
        delete self.dataRequests[_requestId];
        return true;
    }
}
