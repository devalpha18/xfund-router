const { accounts, contract, web3 } = require('@openzeppelin/test-environment')

const {
  BN,           // Big Number support
  constants,
  expectRevert,
  expectEvent,
} = require('@openzeppelin/test-helpers')

const { expect } = require('chai')

const MockToken = contract.fromArtifact('MockToken') // Loads a compiled contract
const Router = contract.fromArtifact('Router') // Loads a compiled contract
const MockConsumer = contract.fromArtifact('MockConsumer') // Loads a compiled contract

describe('Consumer - only owner function tests', function () {
  this.timeout(300000)
  const [admin, dataConsumerOwner, dataProvider, rando, eoa] = accounts
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const salt = web3.utils.soliditySha3(web3.utils.randomHex(32))
  const ROLE_DATA_PROVIDER = web3.utils.sha3('DATA_PROVIDER')

  beforeEach(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})

    // dataConsumerOwner deploy Consumer contract
    this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})

  })

  /*
   * Withdraw Token tests
   */
  describe('token withdraw', function () {
    it( 'owner can withdrawAllTokens - WithdrawTokensFromContract event emitted', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      const receipt = await this.MockConsumerContract.withdrawAllTokens( { from: dataConsumerOwner } )

      expectEvent( receipt, 'WithdrawTokensFromContract', {
        from: this.MockConsumerContract.address,
        to: dataConsumerOwner,
        amount: new BN( amountForContract )
      } )
    } )

    it( 'owner can withdrawAllTokens - ERC20 Transfer event emitted', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      const receipt = await this.MockConsumerContract.withdrawAllTokens( { from: dataConsumerOwner } )

      expectEvent( receipt, 'Transfer', {
        from: this.MockConsumerContract.address,
        to: dataConsumerOwner,
        value: new BN( amountForContract )
      } )
    } )

    it( 'owner can withdrawAllTokens - owner balance is 1000, contract balance is zero', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const expectedAmount = 1000
      const expectedAmountForContract = 0
      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      // withdraw all tokens from contract to owner
      await this.MockConsumerContract.withdrawAllTokens( { from: dataConsumerOwner } )

      // dataConsumerOwner should have 1000 tokens again, and Consumer contract should have zero
      const dcBalance = await this.MockTokenContract.balanceOf( dataConsumerOwner )
      const contractBalance = await this.MockTokenContract.balanceOf( this.MockConsumerContract.address )
      expect( dcBalance.toNumber() ).to.equal( expectedAmount )
      expect( contractBalance.toNumber() ).to.equal( expectedAmountForContract )
    } )

    it( 'only owner can withdrawAllTokens - should revert with error', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer 1 Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      await expectRevert(
        this.MockConsumerContract.withdrawAllTokens( { from: rando } ),
        "Consumer: only owner can do this"
      )
    } )

    it( 'only owner can withdrawAllTokens - owner balance should still be 900, and contract 100', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const expectedAmount = 900
      const expectedAmountForContract = 100
      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer 1 Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      await expectRevert(
        this.MockConsumerContract.withdrawAllTokens( { from: rando } ),
        "Consumer: only owner can do this"
      )

      // dataConsumerOwner should have 900 tokens again, and Consumer contract should have 100
      const dcBalance = await this.MockTokenContract.balanceOf( dataConsumerOwner )
      const contractBalance = await this.MockTokenContract.balanceOf( this.MockConsumerContract.address )
      expect( dcBalance.toNumber() ).to.equal( expectedAmount )
      expect( contractBalance.toNumber() ).to.equal( expectedAmountForContract )
    } )

    it( 'owner can withdrawTokenAmount - WithdrawTokensFromContract event emitted', async function () {
      const initialAmount = 1000
      const initialAmountForContract = 100
      const amountToWithdraw = 50

      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer 1 Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialAmountForContract, { from: dataConsumerOwner } )

      const receipt = await this.MockConsumerContract.withdrawTokenAmount( amountToWithdraw, { from: dataConsumerOwner } )

      expectEvent( receipt, 'WithdrawTokensFromContract', {
        from: this.MockConsumerContract.address,
        to: dataConsumerOwner,
        amount: new BN( amountToWithdraw )
      } )
    } )

    it( 'owner can withdrawTokenAmount - ERC20 Transfer event emitted', async function () {
      const initialAmount = 1000
      const initialAmountForContract = 100
      const amountToWithdraw = 50

      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer 1 Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialAmountForContract, { from: dataConsumerOwner } )

      const receipt = await this.MockConsumerContract.withdrawTokenAmount( amountToWithdraw, { from: dataConsumerOwner } )

      expectEvent( receipt, 'Transfer', {
        from: this.MockConsumerContract.address,
        to: dataConsumerOwner,
        value: new BN( amountToWithdraw )
      } )
    } )

    it( 'owner can withdrawTokenAmount - withdraw 50, owner has 950 balance, contract 50', async function () {
      const initialAmount = 1000
      const initialAmountForContract = 100
      const amountToWithdraw = 50
      const expectedAmount = 950
      const expectedAmountForContract = 50

      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer 1 Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialAmountForContract, { from: dataConsumerOwner } )

      await this.MockConsumerContract.withdrawTokenAmount( amountToWithdraw, { from: dataConsumerOwner } )

      // dataConsumerOwner should have 950 tokens, and Consumer contract should have 50
      const dcBalance = await this.MockTokenContract.balanceOf( dataConsumerOwner )
      const contractBalance = await this.MockTokenContract.balanceOf( this.MockConsumerContract.address )
      expect( dcBalance.toNumber() ).to.equal( expectedAmount )
      expect( contractBalance.toNumber() ).to.equal( expectedAmountForContract )
    } )

    it( 'only owner can withdrawTokenAmount - expect revert with error', async function () {
      const initialAmount = 1000
      const initialAmountForContract = 100
      const amountToWithdraw = 50

      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer 1 Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialAmountForContract, { from: dataConsumerOwner } )

      await expectRevert(
        this.MockConsumerContract.withdrawTokenAmount( amountToWithdraw, { from: rando } ),
        "Consumer: only owner can do this"
      )
    } )

    it( 'only owner can withdrawTokenAmount - attempt 50. Owner should remain 900, contract 100', async function () {
      const initialAmount = 1000
      const initialAmountForContract = 100
      const amountToWithdraw = 50
      const expectedAmount = 900
      const expectedAmountForContract = 100

      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer 1 Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialAmountForContract, { from: dataConsumerOwner } )

      await expectRevert(
        this.MockConsumerContract.withdrawTokenAmount( amountToWithdraw, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // dataConsumerOwner should have 900 tokens, and Consumer contract should have 100
      const dcBalance = await this.MockTokenContract.balanceOf( dataConsumerOwner )
      const contractBalance = await this.MockTokenContract.balanceOf( this.MockConsumerContract.address )
      expect( dcBalance.toNumber() ).to.equal( expectedAmount )
      expect( contractBalance.toNumber() ).to.equal( expectedAmountForContract )
    } )
  })

  /*
   * Router allowance tests
   */
  describe('router allowance', function () {

    it( 'owner can increase router allowance - initial allowance should be zero', async function () {
      // should initially be zero
      const routerAllowanceBefore = await this.MockTokenContract.allowance(this.MockConsumerContract.address, this.RouterContract.address)
      expect( routerAllowanceBefore.toNumber() ).to.equal( 0 )
    } )

    it( 'owner can increase router allowance - should emit IncreasedRouterAllowance event', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      const receipt = await this.MockConsumerContract.increaseRouterAllowance(allowance,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'IncreasedRouterAllowance', {
        router: this.RouterContract.address,
        contractAddress: this.MockConsumerContract.address,
        amount: new BN( allowance )
      } )
    } )

    it( 'owner can increase router allowance - should emit ERC20 Approval event', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      const receipt = await this.MockConsumerContract.increaseRouterAllowance(allowance,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'Approval', {
        owner: this.MockConsumerContract.address,
        spender: this.RouterContract.address,
        value: new BN( allowance )
      } )
    } )

    it( 'owner can increase router allowance - router should have allowance of 100', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const expectedAllowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      await this.MockConsumerContract.increaseRouterAllowance(allowance,  { from: dataConsumerOwner } )

      // router should have an allowance of 100
      const routerAllowanceAfter = await this.MockTokenContract.allowance(this.MockConsumerContract.address, this.RouterContract.address)
      expect( routerAllowanceAfter.toNumber() ).to.equal( expectedAllowance )
    } )

    it( 'only owner can increase router allowance - should revert with error', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      await expectRevert(
        this.MockConsumerContract.increaseRouterAllowance(allowance, { from: rando } ),
        "Consumer: only owner can do this"
      )
    } )

    it( 'only owner can increase router allowance - allowance should remain zero', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const expectedAllowance = 0

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      await expectRevert(
        this.MockConsumerContract.increaseRouterAllowance(allowance, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // router should have an allowance of zero
      const routerAllowanceAfter = await this.MockTokenContract.allowance(this.MockConsumerContract.address, this.RouterContract.address)
      expect( routerAllowanceAfter.toNumber() ).to.equal( expectedAllowance )
    } )

    it( 'owner can decrease router allowance - should emit DecreasedRouterAllowance event', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const decrease = 20

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      await this.MockConsumerContract.increaseRouterAllowance(allowance,  { from: dataConsumerOwner } )

      const receipt = await this.MockConsumerContract.decreaseRouterAllowance(decrease,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'DecreasedRouterAllowance', {
        router: this.RouterContract.address,
        contractAddress: this.MockConsumerContract.address,
        amount: new BN( decrease )
      } )
    } )

    it( 'owner can decrease router allowance - should emit ERC20 Approval event', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const decrease = 20
      const newApproved = 80

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      await this.MockConsumerContract.increaseRouterAllowance(allowance,  { from: dataConsumerOwner } )

      const receipt = await this.MockConsumerContract.decreaseRouterAllowance(decrease,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'Approval', {
        owner: this.MockConsumerContract.address,
        spender: this.RouterContract.address,
        value: new BN( newApproved )
      } )
    } )

    it( 'owner can decrease router allowance - router allowance should be reduced to 80', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const decrease = 20
      const expectedAllowance = 80

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      await this.MockConsumerContract.increaseRouterAllowance(allowance,  { from: dataConsumerOwner } )

      await this.MockConsumerContract.decreaseRouterAllowance(decrease,  { from: dataConsumerOwner } )

      // router should have an allowance of 80
      const routerAllowanceAfter = await this.MockTokenContract.allowance(this.MockConsumerContract.address, this.RouterContract.address)
      expect( routerAllowanceAfter.toNumber() ).to.equal( expectedAllowance )
    } )


    it( 'only owner can decrease router allowance - should revert with error', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const decrease = 20
      const expectedAllowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      await this.MockConsumerContract.increaseRouterAllowance(allowance,  { from: dataConsumerOwner } )

      await expectRevert(
        this.MockConsumerContract.decreaseRouterAllowance(decrease, { from: rando } ),
        "Consumer: only owner can do this"
      )
    } )

    it( 'only owner can decrease router allowance - allowance should remain 100', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const decrease = 20
      const expectedAllowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      await this.MockConsumerContract.increaseRouterAllowance(allowance,  { from: dataConsumerOwner } )

      await expectRevert(
        this.MockConsumerContract.decreaseRouterAllowance(decrease, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // router should still have an allowance of 100
      const routerAllowanceAfter = await this.MockTokenContract.allowance(this.MockConsumerContract.address, this.RouterContract.address)
      expect( routerAllowanceAfter.toNumber() ).to.equal( expectedAllowance )
    } )
  })

  /*
   * Data provider tests
   */
  describe('data providers', function () {
    it( 'owner can add a data provider - emits AddedDataProvider event', async function () {
      const fee = 100

      const receipt = await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'AddedDataProvider', {
        sender: dataConsumerOwner,
        provider: dataProvider,
        fee: new BN( fee )
      } )
    } )

    it( 'owner can add a data provider - emits RoleGranted event', async function () {
      const fee = 100

      const receipt = await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )

      expectEvent(receipt, 'RoleGranted', {
        role: ROLE_DATA_PROVIDER,
        account: dataProvider,
        sender: dataConsumerOwner
      })
    } )

    it( 'owner can add a data provider - emits Router GrantProviderPermission event', async function () {
      const fee = 100

      const receipt = await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )

      expectEvent(receipt, 'GrantProviderPermission', {
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: dataProvider,
      })
    } )

    it( 'owner can add a data provider - dataProvider has role DATA_PROVIDER', async function () {
      const fee = 100

      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )

      // dataProvider should now have DATA_PROVIDER role
      expect( await this.MockConsumerContract.hasRole(ROLE_DATA_PROVIDER, dataProvider) ).to.equal( true )
    } )

    it( 'owner can add a data provider - dataProvider is authorised for this contract on Router', async function () {
      const fee = 100

      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )

      // dataProvider should now be authorised on Router for this contract
      expect( await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider) ).to.equal( true )
    } )

    it( 'only owner can add a data provider - should revert with error', async function () {
      const fee = 100

      await expectRevert(
        this.MockConsumerContract.addDataProvider(dataProvider, fee, { from: rando } ),
        "Consumer: only owner can do this"
      )
    } )

    it( 'only owner can add a data provider - dataProvider should not have DATA_PROVIDER role', async function () {
      const fee = 100

      await expectRevert(
        this.MockConsumerContract.addDataProvider(dataProvider, fee, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // dataProvider should NOT have DATA_PROVIDER role
      expect( await this.MockConsumerContract.hasRole(ROLE_DATA_PROVIDER, dataProvider) ).to.equal( false )
    } )

    it( 'only owner can add a data provider - dataProvider should not be authorised on Router', async function () {
      const fee = 100

      await expectRevert(
        this.MockConsumerContract.addDataProvider(dataProvider, fee, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // dataProvider should now be authorised on Router for this contract
      expect( await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider) ).to.equal( false )
    } )

    it( 'addDataProvider - data provider must not be a zero address', async function () {
      const fee = 100

      await expectRevert(
        this.MockConsumerContract.addDataProvider(constants.ZERO_ADDRESS, fee, { from: dataConsumerOwner } ),
        "Consumer: dataProvider cannot be the zero address"
      )
    } )

    it( 'addDataProvider - fee must be > 0', async function () {
      await expectRevert(
        this.MockConsumerContract.addDataProvider(dataProvider, 0, { from: dataConsumerOwner } ),
        "Consumer: fee must be > 0"
      )
    } )

    it( 'owner can remove a data provider - emits RemovedDataProvider event', async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )

      const receipt = await this.MockConsumerContract.removeDataProvider(dataProvider,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'RemovedDataProvider', {
        sender: dataConsumerOwner,
        provider: dataProvider,
      } )
    } )

    it( 'owner can remove a data provider - Router emits RevokeProviderPermission event', async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )

      const receipt = await this.MockConsumerContract.removeDataProvider(dataProvider,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'RevokeProviderPermission', {
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: dataProvider,
      } )
    } )

    it( 'owner can remove a data provider - emits RoleRevoked event', async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )

      const receipt = await this.MockConsumerContract.removeDataProvider(dataProvider,  { from: dataConsumerOwner } )

      expectEvent(receipt, 'RoleRevoked', {
        role: ROLE_DATA_PROVIDER,
        account: dataProvider,
        sender: dataConsumerOwner
      })

    } )

    it( 'owner can remove a data provider - dataProvider no longer has DATA_PROVIDER role in contract', async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )
      // dataProvider should now have DATA_PROVIDER role
      expect( await this.MockConsumerContract.hasRole(ROLE_DATA_PROVIDER, dataProvider) ).to.equal( true )

      await this.MockConsumerContract.removeDataProvider(dataProvider,  { from: dataConsumerOwner } )

      // dataProvider should no longer have DATA_PROVIDER role
      expect( await this.MockConsumerContract.hasRole(ROLE_DATA_PROVIDER, dataProvider) ).to.equal( false )
    } )

    it( 'owner can remove a data provider - dataProvider no longer authorised for this contract in Router', async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )
      // dataProvider should be authorised in Router
      expect( await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider) ).to.equal( true )

      await this.MockConsumerContract.removeDataProvider(dataProvider,  { from: dataConsumerOwner } )

      // dataProvider should no longer be authorised in Router
      expect( await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider) ).to.equal( false )
    } )

    it( 'only owner can remove a data provider - expect revert with error', async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )

      await expectRevert(
        this.MockConsumerContract.removeDataProvider(dataProvider, { from: rando } ),
        "Consumer: only owner can do this"
      )

    } )

    it( 'only owner can remove a data provider - dataProvider should still have DATA_PROVIDER role', async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )

      await expectRevert(
        this.MockConsumerContract.removeDataProvider(dataProvider, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // dataProvider should still have DATA_PROVIDER role
      expect( await this.MockConsumerContract.hasRole(ROLE_DATA_PROVIDER, dataProvider) ).to.equal( true )
    } )

    it( 'only owner can remove a data provider - dataProvider should still be authorised in Router', async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )

      await expectRevert(
        this.MockConsumerContract.removeDataProvider(dataProvider, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // dataProvider should still be authorised in Router
      expect( await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider) ).to.equal( true )
    } )

    it( 'cannot remove non existent data provider', async function () {
      await expectRevert(
        this.MockConsumerContract.removeDataProvider(dataProvider, { from: dataConsumerOwner } ),
        "Consumer: _dataProvider does not have role DATA_PROVIDER"
      )

      // dataProvider should not have DATA_PROVIDER role
      expect( await this.MockConsumerContract.hasRole(ROLE_DATA_PROVIDER, dataProvider) ).to.equal( false )
      expect( await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider) ).to.equal( false )
    } )

    it( 'owner can set data provider fee - emits SetDataProviderFee event', async function () {
      const fee = 100
      const newFee = 200

      // add the dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )
      const f1 = await this.MockConsumerContract.getDataProviderFee(dataProvider)
      expect( f1.toNumber() ).to.equal( fee )

      const receipt = await this.MockConsumerContract.setDataProviderFee(dataProvider, newFee,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'SetDataProviderFee', {
        sender: dataConsumerOwner,
        provider: dataProvider,
        oldFee: new BN(fee),
        newFee: new BN(newFee),
      } )
    } )

    it( 'owner can set data provider fee - fee increases from 100 to 200', async function () {
      const fee = 100
      const newFee = 200

      // add the dataProvider with fee of 100
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )

      // set fee to 200
      await this.MockConsumerContract.setDataProviderFee(dataProvider, newFee,  { from: dataConsumerOwner } )

      const f2 = await this.MockConsumerContract.getDataProviderFee(dataProvider)
      expect( f2.toNumber() ).to.equal( newFee )
    } )

    it( 'only owner can set data provider fee', async function () {

      const fee = 100
      const newFee = 200

      // add the dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )
      const f1 = await this.MockConsumerContract.getDataProviderFee(dataProvider)
      expect( f1.toNumber() ).to.equal( fee )

      await expectRevert(
        this.MockConsumerContract.setDataProviderFee(dataProvider, newFee, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // should still be 100
      const f2 = await this.MockConsumerContract.getDataProviderFee(dataProvider)
      expect( f2.toNumber() ).to.equal( fee )
    } )

    it( 'setDataProviderFee - fee must be > 0', async function () {

      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )
      const f1 = await this.MockConsumerContract.getDataProviderFee(dataProvider)
      expect( f1.toNumber() ).to.equal( fee )

      await expectRevert(
        this.MockConsumerContract.setDataProviderFee(dataProvider, 0, { from: dataConsumerOwner } ),
        "Consumer: fee must be > 0"
      )

      // should still be 100
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )
      const f2 = await this.MockConsumerContract.getDataProviderFee(dataProvider)
      expect( f2.toNumber() ).to.equal( fee )
    } )

    it( 'setDataProviderFee - data provider must exist', async function () {
      const fee = 100
      await expectRevert(
        this.MockConsumerContract.setDataProviderFee(dataProvider, fee, { from: dataConsumerOwner } ),
        "Consumer: _dataProvider does not have role DATA_PROVIDER"
      )
    } )
  })

  /*
   * Misc tests
   */
  describe('misc.', function () {
    it( 'owner can set gas price limit - emits SetGasPriceLimit event', async function () {

      const newLimit = 80
      const receipt = await this.MockConsumerContract.setGasPriceLimit(newLimit,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'SetGasPriceLimit', {
        sender: dataConsumerOwner,
        oldLimit: new BN(200),
        newLimit: new BN(newLimit),
      } )
    } )

    it( 'owner can set gas price limit - limit reduced from 200 to 80', async function () {

      const newLimit = 80
      await this.MockConsumerContract.setGasPriceLimit(newLimit,  { from: dataConsumerOwner } )

      const limit = await this.MockConsumerContract.getGasPriceLimit()
      expect( limit.toNumber() ).to.equal( newLimit )

    } )

    it( 'only owner can set gas price limit', async function () {

      const newLimit = 80
      await expectRevert(
        this.MockConsumerContract.setGasPriceLimit(newLimit, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // should still be the default 200
      const limit = await this.MockConsumerContract.getGasPriceLimit()
      expect( limit.toNumber() ).to.equal( 200 )
    } )

    it( 'new gas price limit must be > 0', async function () {

      await expectRevert(
        this.MockConsumerContract.setGasPriceLimit(0, { from: dataConsumerOwner } ),
        "Consumer: gasPriceLimit must be > 0"
      )

      // should still be the default 200
      const limit = await this.MockConsumerContract.getGasPriceLimit()
      expect( limit.toNumber() ).to.equal( 200 )
    } )

    it( 'owner can set request timeout - emits SetRequestTimout event', async function () {

      const newLimit = 500
      const receipt = await this.MockConsumerContract.setRequestTimeout(newLimit,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'SetRequestTimout', {
        sender: dataConsumerOwner,
        oldTimeout: new BN(300),
        newTimeout: new BN(newLimit),
      } )
    } )

    it( 'owner can set request timeout - limit changed from 300 to 500', async function () {

      const newLimit = 500
      await this.MockConsumerContract.setRequestTimeout(newLimit,  { from: dataConsumerOwner } )

      const limit = await this.MockConsumerContract.getRequestTimeout()
      expect( limit.toNumber() ).to.equal( newLimit )

    } )

    it( 'only owner can set request timeout', async function () {

      const newLimit = 500
      await expectRevert(
        this.MockConsumerContract.setRequestTimeout(newLimit, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // should still be the default 300
      const limit = await this.MockConsumerContract.getRequestTimeout()
      expect( limit.toNumber() ).to.equal( 300 )
    } )

    it( 'new request timeout must be > 0', async function () {

      await expectRevert(
        this.MockConsumerContract.setRequestTimeout(0, { from: dataConsumerOwner } ),
        "Consumer: newTimeout must be > 0"
      )

      // should still be the default 300
      const limit = await this.MockConsumerContract.getRequestTimeout()
      expect( limit.toNumber() ).to.equal( 300 )
    } )

    it( 'owner can set new router - emits RouterSet event', async function () {

      const newRouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})
      const receipt = await this.MockConsumerContract.setRouter(newRouterContract.address,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'RouterSet', {
        sender: dataConsumerOwner,
        oldRouter: this.RouterContract.address,
        newRouter: newRouterContract.address,
      } )
    } )

    it( 'owner can set new router - new router contract address is correctly stored', async function () {
      const newRouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})
      await this.MockConsumerContract.setRouter(newRouterContract.address,  { from: dataConsumerOwner } )
      expect( await this.MockConsumerContract.getRouterAddress() ).to.equal( newRouterContract.address )
    } )

    it( 'only owner can set new router', async function () {

      const newRouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})

      await expectRevert(
        this.MockConsumerContract.setRouter(newRouterContract.address, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // should still be original router address
      expect( await this.MockConsumerContract.getRouterAddress() ).to.equal( this.RouterContract.address )

    } )

    it( 'router cannot be zero address', async function () {
      await expectRevert(
        this.MockConsumerContract.setRouter(constants.ZERO_ADDRESS, { from: dataConsumerOwner } ),
        "Consumer: router cannot be the zero address"
      )

      // should still be original router address
      expect( await this.MockConsumerContract.getRouterAddress() ).to.equal( this.RouterContract.address )
    } )

    it( 'router must be a contract', async function () {
      await expectRevert(
        this.MockConsumerContract.setRouter(eoa, { from: dataConsumerOwner } ),
        "Consumer: router address must be a contract"
      )

      // should still be original router address
      expect( await this.MockConsumerContract.getRouterAddress() ).to.equal( this.RouterContract.address )
    } )
  })
})
