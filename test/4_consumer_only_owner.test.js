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
    it( 'owner can withdrawAllTokens', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const expectedAmount = 1000
      const expectedAmountForContract = 0
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

      // dataConsumerOwner should have 10 tokens again, and Consumer contract should have zero
      const dcBalance = await this.MockTokenContract.balanceOf( dataConsumerOwner )
      const contractBalance = await this.MockTokenContract.balanceOf( this.MockConsumerContract.address )
      expect( dcBalance.toNumber() ).to.equal( expectedAmount )
      expect( contractBalance.toNumber() ).to.equal( expectedAmountForContract )
    } )

    it( 'only owner can withdrawAllTokens', async function () {
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

      // dataConsumerOwner should have 10 tokens again, and Consumer contract should have zero
      const dcBalance = await this.MockTokenContract.balanceOf( dataConsumerOwner )
      const contractBalance = await this.MockTokenContract.balanceOf( this.MockConsumerContract.address )
      expect( dcBalance.toNumber() ).to.equal( expectedAmount )
      expect( contractBalance.toNumber() ).to.equal( expectedAmountForContract )
    } )

    it( 'owner can withdrawTokenAmount', async function () {
      const initialAmount = 1000
      const initialAmountForContract = 100
      const amountToWithdraw = 50
      const expectedAmount = 950
      const expectedAmountForContract = 50

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

      // dataConsumerOwner should have 9.5 tokens, and Consumer contract should have 0.5
      const dcBalance = await this.MockTokenContract.balanceOf( dataConsumerOwner )
      const contractBalance = await this.MockTokenContract.balanceOf( this.MockConsumerContract.address )
      expect( dcBalance.toNumber() ).to.equal( expectedAmount )
      expect( contractBalance.toNumber() ).to.equal( expectedAmountForContract )
    } )

    it( 'only owner can withdrawTokenAmount', async function () {
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

      // dataConsumerOwner should have 9.5 tokens, and Consumer contract should have 0.5
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
    it( 'owner can increase router allowance', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const expectedAllowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      // should initially be zero
      const routerAllowanceBefore = await this.MockTokenContract.allowance(this.MockConsumerContract.address, this.RouterContract.address)
      expect( routerAllowanceBefore.toNumber() ).to.equal( 0 )

      const receipt = await this.MockConsumerContract.increaseRouterAllowance(allowance,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'IncreasedRouterAllowance', {
        router: this.RouterContract.address,
        contractAddress: this.MockConsumerContract.address,
        amount: new BN( allowance )
      } )

      // router should have an allowance of 100
      const routerAllowanceAfter = await this.MockTokenContract.allowance(this.MockConsumerContract.address, this.RouterContract.address)
      expect( routerAllowanceAfter.toNumber() ).to.equal( expectedAllowance )
    } )

    it( 'only owner can increase router allowance', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const expectedAllowance = 0

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      // should initially be zero
      const routerAllowanceBefore = await this.MockTokenContract.allowance(this.MockConsumerContract.address, this.RouterContract.address)
      expect( routerAllowanceBefore.toNumber() ).to.equal( 0 )

      await expectRevert(
        this.MockConsumerContract.increaseRouterAllowance(allowance, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // router should have an allowance of zero
      const routerAllowanceAfter = await this.MockTokenContract.allowance(this.MockConsumerContract.address, this.RouterContract.address)
      expect( routerAllowanceAfter.toNumber() ).to.equal( expectedAllowance )
    } )

    it( 'owner can decrease router allowance', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const decrease = 20
      const expectedAllowance = 80

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      // should initially be zero
      const routerAllowanceBefore = await this.MockTokenContract.allowance(this.MockConsumerContract.address, this.RouterContract.address)
      expect( routerAllowanceBefore.toNumber() ).to.equal( 0 )

      await this.MockConsumerContract.increaseRouterAllowance(allowance,  { from: dataConsumerOwner } )

      const receipt = await this.MockConsumerContract.decreaseRouterAllowance(decrease,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'DecreasedRouterAllowance', {
        router: this.RouterContract.address,
        contractAddress: this.MockConsumerContract.address,
        amount: new BN( decrease )
      } )

      // router should have an allowance of 80
      const routerAllowanceAfter = await this.MockTokenContract.allowance(this.MockConsumerContract.address, this.RouterContract.address)
      expect( routerAllowanceAfter.toNumber() ).to.equal( expectedAllowance )
    } )


    it( 'only owner can decrease router allowance', async function () {
      const initialAmount = 1000
      const amountForContract = 100
      const allowance = 100
      const decrease = 20
      const expectedAllowance = 100

      // Admin Transfer Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, initialAmount, { from: admin } )
      // dataConsumerOwner Transfer Tokens to MockConsumerContract
      await this.MockTokenContract.transfer( this.MockConsumerContract.address, amountForContract, { from: dataConsumerOwner } )

      // should initially be zero
      const routerAllowanceBefore = await this.MockTokenContract.allowance(this.MockConsumerContract.address, this.RouterContract.address)
      expect( routerAllowanceBefore.toNumber() ).to.equal( 0 )

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
    it( 'owner can add a data provider', async function () {
      const fee = 100

      const receipt = await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'AddedDataProvider', {
        sender: dataConsumerOwner,
        provider: dataProvider,
        fee: new BN( fee )
      } )

      expectEvent(receipt, 'RoleGranted', {
        role: ROLE_DATA_PROVIDER,
        account: dataProvider,
        sender: dataConsumerOwner
      })

      // dataProvider should now have DATA_PROVIDER role
      expect( await this.MockConsumerContract.hasRole(ROLE_DATA_PROVIDER, dataProvider) ).to.equal( true )
      expect( await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider) ).to.equal( true )
    } )

    it( 'only owner can add a data provider', async function () {
      const fee = 100

      await expectRevert(
        this.MockConsumerContract.addDataProvider(dataProvider, fee, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // dataProvider should NOT have DATA_PROVIDER role
      expect( await this.MockConsumerContract.hasRole(ROLE_DATA_PROVIDER, dataProvider) ).to.equal( false )
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

    it( 'owner can remove a data provider', async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )
      // dataProvider should now have DATA_PROVIDER role
      expect( await this.MockConsumerContract.hasRole(ROLE_DATA_PROVIDER, dataProvider) ).to.equal( true )
      expect( await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider) ).to.equal( true )

      const receipt = await this.MockConsumerContract.removeDataProvider(dataProvider,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'RemovedDataProvider', {
        sender: dataConsumerOwner,
        provider: dataProvider,
      } )

      expectEvent(receipt, 'RoleRevoked', {
        role: ROLE_DATA_PROVIDER,
        account: dataProvider,
        sender: dataConsumerOwner
      })

      // dataProvider should no longer have DATA_PROVIDER role
      expect( await this.MockConsumerContract.hasRole(ROLE_DATA_PROVIDER, dataProvider) ).to.equal( false )
      expect( await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider) ).to.equal( false )
    } )

    it( 'only owner can remove a data provider', async function () {
      const fee = 100

      // add the dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee,  { from: dataConsumerOwner } )
      // dataProvider should now have DATA_PROVIDER role
      expect( await this.MockConsumerContract.hasRole(ROLE_DATA_PROVIDER, dataProvider) ).to.equal( true )
      expect( await this.RouterContract.providerIsAuthorised(this.MockConsumerContract.address, dataProvider) ).to.equal( true )

      await expectRevert(
        this.MockConsumerContract.removeDataProvider(dataProvider, { from: rando } ),
        "Consumer: only owner can do this"
      )

      // dataProvider should still have DATA_PROVIDER role
      expect( await this.MockConsumerContract.hasRole(ROLE_DATA_PROVIDER, dataProvider) ).to.equal( true )
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

    it( 'owner can set data provider fee', async function () {
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
    it( 'owner can set gas price limit', async function () {

      const newLimit = 80
      const receipt = await this.MockConsumerContract.setGasPriceLimit(newLimit,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'SetGasPriceLimit', {
        sender: dataConsumerOwner,
        oldLimit: new BN(200),
        newLimit: new BN(newLimit),
      } )

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

    it( 'owner can set new router', async function () {

      const newRouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})
      const receipt = await this.MockConsumerContract.setRouter(newRouterContract.address,  { from: dataConsumerOwner } )

      expectEvent( receipt, 'RouterSet', {
        sender: dataConsumerOwner,
        oldRouter: this.RouterContract.address,
        newRouter: newRouterContract.address,
      } )

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
