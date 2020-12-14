const { accounts, contract, web3, privateKeys } = require('@openzeppelin/test-environment')

const {
  BN,           // Big Number support
  expectRevert,
  expectEvent,
} = require('@openzeppelin/test-helpers')

const { expect } = require('chai')

const MockToken = contract.fromArtifact('MockToken') // Loads a compiled contract
const Router = contract.fromArtifact('Router') // Loads a compiled contract
const MockConsumer = contract.fromArtifact('MockConsumer') // Loads a compiled contract
const ConsumerLib = contract.fromArtifact('ConsumerLib') // Loads a compiled contract

const REQUEST_VAR_GAS_PRICE_LIMIT = 1; // gas price limit in gwei the consumer is willing to pay for data processing
const REQUEST_VAR_TOP_UP_LIMIT = 2; // max ETH that can be sent in a gas top up Tx
const REQUEST_VAR_REQUEST_TIMEOUT = 3; // request timeout in seconds

function generateSigMsg(requestId, data, consumerAddress) {
  return web3.utils.soliditySha3(
    { 'type': 'bytes32', 'value': requestId},
    { 'type': 'uint256', 'value': data.toNumber()},
    { 'type': 'address', 'value': consumerAddress}
  )
}

const sleepFor = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function generateRequestId(
  consumerAddress,
  requestNonce,
  dataProvider,
  salt) {
  return web3.utils.soliditySha3(
    { 'type': 'address', 'value': consumerAddress},
    { 'type': 'uint256', 'value': requestNonce.toNumber()},
    { 'type': 'address', 'value': dataProvider},
    { 'type': 'bytes32', 'value': salt}
  )
}

describe('Consumer - request cancellation tests', function () {
  this.timeout(300000)

  const [admin, dataProvider1, dataConsumerOwner1, dataProvider2, dataConsumerOwner2, rando ] = accounts
  const [adminPk, dataProviderPk, dataConsumer1Pk, randoPk, dataProvider2Pk] = privateKeys
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const fee = new BN(0.1 * ( 10 ** 9 ))
  const endpoint = "PRICE.BTC.USD.AVG"
  const salt = web3.utils.soliditySha3(web3.utils.randomHex(32), new Date())
  const gasPrice = 100 // gwei, 10 ** 9 done in contract
  const callbackFuncSig = web3.eth.abi.encodeFunctionSignature('recieveData(uint256,bytes32,bytes)')
  const priceToSend = new BN("1000")
  const ROLE_DATA_PROVIDER = web3.utils.sha3('DATA_PROVIDER')

  /*
   * Tests in ideal scenario
   */
  describe('basic request cancellation', function () {
    // set up ideal scenario for these tests
    beforeEach(async function () {
      // admin deploy Token contract
      this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})

      // admin deploy Router contract
      this.RouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})

      // Deploy ConsumerLib library and link
      this.ConsumerLib = await ConsumerLib.new({from: admin})
      await MockConsumer.detectNetwork();
      await MockConsumer.link("ConsumerLib", this.ConsumerLib.address)

      // dataConsumerOwner1 deploy Consumer contract
      this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner1})

      // increase Router allowance
      await this.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner1})

      // add a dataProvider1
      await this.MockConsumerContract.addDataProvider(dataProvider1, fee, {from: dataConsumerOwner1});

      // Admin Transfer 10 Tokens to dataConsumerOwner1
      await this.MockTokenContract.transfer(dataConsumerOwner1, new BN(10 * (10 ** decimals)), {from: admin})

      // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner1
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner1})
    })

    /*
     * cancellation
     */
    it( 'dataConsumer (owner) can cancel a request - emits RequestCancellationSubmitted event', async function () {
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider1, routerSalt )

      // set request timeout to 1 second
      await this.MockConsumerContract.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, 1, { from: dataConsumerOwner1 })

      // initialse request
      await this.MockConsumerContract.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

      // wait a sec...
      await sleepFor(1000)

      // cancel request
      const reciept = await this.MockConsumerContract.cancelRequest( reqId, { from: dataConsumerOwner1 } )

      expectEvent( reciept, 'RequestCancellationSubmitted', {
        sender: dataConsumerOwner1,
        requestId: reqId,
      } )
    } )

    it( 'dataConsumer (owner) can cancel a request - Router emits RequestCancelled event', async function () {
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider1, routerSalt )

      // set request timeout to 1 second
      await this.MockConsumerContract.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, 1, { from: dataConsumerOwner1 })

      // initialse request
      await this.MockConsumerContract.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

      // wait a sec...
      await sleepFor(1000)

      // cancel request
      const reciept = await this.MockConsumerContract.cancelRequest( reqId, { from: dataConsumerOwner1 } )

      expectEvent( reciept, 'RequestCancelled', {
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: dataProvider1,
        requestId: reqId,
        refund: new BN(fee)
      } )
    } )

    it( 'only dataConsumer (owner) can cancel a request', async function () {
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider1, routerSalt )

      // set request timeout to 1 second
      await this.MockConsumerContract.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, 1, { from: dataConsumerOwner1 })

      // initialse request
      await this.MockConsumerContract.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

      // wait a sec...
      await sleepFor(1000)

      // cancel request
      await expectRevert(
        this.MockConsumerContract.cancelRequest( reqId, { from: rando } ),
        "ConsumerLib: only owner can do this"
      )
    } )

    it( 'request id must exist', async function () {
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider1, routerSalt )

      // cancel request
      await expectRevert(
        this.MockConsumerContract.cancelRequest( reqId, { from: dataConsumerOwner1 } ),
        "ConsumerLib: request id does not exist"
      )
    } )

    it( 'request must have expired', async function () {
      const requestNonce = await this.MockConsumerContract.getRequestNonce()
      const routerSalt = await this.RouterContract.getSalt()

      const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider1, routerSalt )

      // set request timeout to 100 seconds
      await this.MockConsumerContract.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, 100, { from: dataConsumerOwner1 })

      // initialse request
      await this.MockConsumerContract.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

      // cancel request
      await expectRevert(
        this.MockConsumerContract.cancelRequest( reqId, { from: dataConsumerOwner1 } ),
        "Router: request has not yet expired"
      )
    } )
  })

  /*
   * Cancellation Tests with Tokens
   */
  describe('token and cancellation tests', function () {
    const initialContract1 = 1000
    const initialContract2 = 1000
    const c1p1Fee = 100
    const c1p2Fee = 200
    const c2p1Fee = 300
    const c2p2Fee = 400
    // deploy new contracts for tests
    beforeEach(async function () {
      // admin deploy Token contract
      this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})
      // admin deploy Router contract
      this.RouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})

      // dataConsumerOwner1 deploy Consumer contract
      this.MockConsumerContract1 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner1})
      // dataConsumerOwner2 deploy Consumer contract
      this.MockConsumerContract2 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner2})

      // increase Router allowances
      await this.MockConsumerContract1.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner1})
      await this.MockConsumerContract2.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner2})

      // add dataProvider1
      await this.MockConsumerContract1.addDataProvider(dataProvider1, c1p1Fee, {from: dataConsumerOwner1});
      await this.MockConsumerContract2.addDataProvider(dataProvider1, c2p1Fee, {from: dataConsumerOwner2});
      // add dataProvider2
      await this.MockConsumerContract1.addDataProvider(dataProvider2, c1p2Fee, {from: dataConsumerOwner1});
      await this.MockConsumerContract2.addDataProvider(dataProvider2, c2p2Fee, {from: dataConsumerOwner2});

      // Admin Transfer 10000000000 Tokens to dataConsumerOwners
      await this.MockTokenContract.transfer(dataConsumerOwner1, new BN(10 * (10 ** decimals)), {from: admin})
      await this.MockTokenContract.transfer(dataConsumerOwner2, new BN(10 * (10 ** decimals)), {from: admin})

      // Transfer 1000 Tokens to MockConsumerContracts from dataConsumerOwners
      await this.MockTokenContract.transfer(this.MockConsumerContract1.address, initialContract1, {from: dataConsumerOwner1})
      await this.MockTokenContract.transfer(this.MockConsumerContract2.address, initialContract2, {from: dataConsumerOwner2})

      // set request timeout to 1 second
      await this.MockConsumerContract1.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, 1, { from: dataConsumerOwner1 })
      await this.MockConsumerContract2.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, 1, { from: dataConsumerOwner2 })
    })

    describe('basic tests', function () {
      it( 'single data cancellation success - ERC20 Transfer event emitted', async function () {

        const requestNonce = await this.MockConsumerContract1.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()
        const reqId = generateRequestId( this.MockConsumerContract1.address, requestNonce, dataProvider1, routerSalt )

        // initialise request
        await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

        // wait a sec...
        await sleepFor(1000)

        const reciept = await this.MockConsumerContract1.cancelRequest( reqId, { from: dataConsumerOwner1 } )
        expectEvent( reciept, 'Transfer', {
          from: this.RouterContract.address,
          to: this.MockConsumerContract1.address,
          value: new BN( c1p1Fee ),
        } )
      } )

      it( 'single data cancellation success - ERC20 router contract balance is zero', async function () {
        const requestNonce = await this.MockConsumerContract1.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()
        const reqId = generateRequestId( this.MockConsumerContract1.address, requestNonce, dataProvider1, routerSalt )

        // initialise request
        await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

        const tot1 = await this.MockTokenContract.balanceOf(this.RouterContract.address)
        expect( tot1.toNumber() ).to.equal( c1p1Fee )
        // wait a sec...
        await sleepFor(1000)

        await this.MockConsumerContract1.cancelRequest( reqId, { from: dataConsumerOwner1 } )

        const tot2 = await this.MockTokenContract.balanceOf(this.RouterContract.address)
        expect( tot2.toNumber() ).to.equal( 0 )
      })

      it( 'single data cancellation success - ERC20 consumer contract balance is 1000', async function () {
        const requestNonce = await this.MockConsumerContract1.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()
        const reqId = generateRequestId( this.MockConsumerContract1.address, requestNonce, dataProvider1, routerSalt )

        // initialise request
        await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

        const tot1 = await this.MockTokenContract.balanceOf(this.MockConsumerContract1.address)
        expect( tot1.toNumber() ).to.equal( initialContract1 - c1p1Fee )
        // wait a sec...
        await sleepFor(1000)

        await this.MockConsumerContract1.cancelRequest( reqId, { from: dataConsumerOwner1 } )

        const tot2 = await this.MockTokenContract.balanceOf(this.MockConsumerContract1.address)
        expect( tot2.toNumber() ).to.equal( initialContract1 )
      })

      it( 'single data cancellation success - router contract getTotalTokensHeld is zero', async function () {
        const requestNonce = await this.MockConsumerContract1.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()
        const reqId = generateRequestId( this.MockConsumerContract1.address, requestNonce, dataProvider1, routerSalt )

        // initialise request
        await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

        const tot1 = await this.RouterContract.getTotalTokensHeld()
        expect( tot1.toNumber() ).to.equal( c1p1Fee )
        // wait a sec...
        await sleepFor(1000)

        await this.MockConsumerContract1.cancelRequest( reqId, { from: dataConsumerOwner1 } )

        const tot2 = await this.RouterContract.getTotalTokensHeld()
        expect( tot2.toNumber() ).to.equal( 0 )
      })

      it( 'single data cancellation success - Router getTokensHeldFor for consumer contract/provider should be 0', async function () {
        const requestNonce = await this.MockConsumerContract1.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()
        const reqId = generateRequestId( this.MockConsumerContract1.address, requestNonce, dataProvider1, routerSalt )

        // initialise request
        await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

        const tot1 = await this.RouterContract.getTokensHeldFor(this.MockConsumerContract1.address, dataProvider1)
        expect( tot1.toNumber() ).to.equal( c1p1Fee )
        // wait a sec...
        await sleepFor(1000)

        await this.MockConsumerContract1.cancelRequest( reqId, { from: dataConsumerOwner1 } )

        const tot2 = await this.RouterContract.getTokensHeldFor(this.MockConsumerContract1.address, dataProvider1)
        expect( tot2.toNumber() ).to.equal( 0 )
      })
    })

    describe('advanced tests', function () {
      describe('single consumer, multiple providers', function () {
        it( 'keep p1, cancel p2 - router contract getTotalTokensHeld is 100', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = 100

          const routerSalt = await this.RouterContract.getSalt()

          // initialise request1 from provider1
          await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // generate request ID for request for provider 2
          const requestNonceP2 = await this.MockConsumerContract1.getRequestNonce()
          const reqIdP2 = generateRequestId( this.MockConsumerContract1.address, requestNonceP2, dataProvider2, routerSalt )

          // initialise request2 from provider2
          await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // total should be both fees
          const tot1 = await this.RouterContract.getTotalTokensHeld()
          expect( tot1.toNumber() ).to.equal( c1p1Fee + c1p2Fee )

          // wait a sec...
          await sleepFor(1000)

          // cancel request for P2
          await this.MockConsumerContract1.cancelRequest( reqIdP2, { from: dataConsumerOwner1 } )

          // should be c1p1Fee
          const tot2 = await this.RouterContract.getTotalTokensHeld()
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })

        it( 'keep p1, cancel p2 - ERC20 balance of router is 100', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = 100

          const routerSalt = await this.RouterContract.getSalt()

          // initialise request1 from provider1
          await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // generate request ID for request for provider 2
          const requestNonceP2 = await this.MockConsumerContract1.getRequestNonce()
          const reqIdP2 = generateRequestId( this.MockConsumerContract1.address, requestNonceP2, dataProvider2, routerSalt )

          // initialise request2 from provider2
          await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // total should be both fees
          const tot1 = await this.MockTokenContract.balanceOf(this.RouterContract.address)
          expect( tot1.toNumber() ).to.equal( c1p1Fee + c1p2Fee )

          // wait a sec...
          await sleepFor(1000)

          // cancel request for P2
          await this.MockConsumerContract1.cancelRequest( reqIdP2, { from: dataConsumerOwner1 } )

          // should be c1p1Fee
          const tot2 = await this.MockTokenContract.balanceOf(this.RouterContract.address)
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })

        it( 'keep p1, cancel p2 - ERC20 balance of consumer contract is 900', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = initialContract1 - c1p1Fee

          const routerSalt = await this.RouterContract.getSalt()

          // initialise request1 from provider1
          await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // generate request ID for request for provider 2
          const requestNonceP2 = await this.MockConsumerContract1.getRequestNonce()
          const reqIdP2 = generateRequestId( this.MockConsumerContract1.address, requestNonceP2, dataProvider2, routerSalt )

          // initialise request2 from provider2
          await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // total should be 1000 - both fees
          const tot1 = await this.MockTokenContract.balanceOf(this.MockConsumerContract1.address)
          expect( tot1.toNumber() ).to.equal( initialContract1 - (c1p1Fee + c1p2Fee) )

          // wait a sec...
          await sleepFor(1000)

          // cancel request for P2
          await this.MockConsumerContract1.cancelRequest( reqIdP2, { from: dataConsumerOwner1 } )

          // should be 1000 - c1p1Fee
          const tot2 = await this.MockTokenContract.balanceOf(this.MockConsumerContract1.address)
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })

        it( 'keep p1, cancel p2 - Router getTokensHeldFor for consumer contract/provider1 should be 100', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = 100

          const routerSalt = await this.RouterContract.getSalt()

          // initialise request1 from provider1
          await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // generate request ID for request for provider 2
          const requestNonceP2 = await this.MockConsumerContract1.getRequestNonce()
          const reqIdP2 = generateRequestId( this.MockConsumerContract1.address, requestNonceP2, dataProvider2, routerSalt )

          // initialise request2 from provider2
          await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // total should be both fees
          const tot1 = await this.RouterContract.getTotalTokensHeld()
          expect( tot1.toNumber() ).to.equal( c1p1Fee + c1p2Fee )

          // wait a sec...
          await sleepFor(1000)

          // cancel request for P2
          await this.MockConsumerContract1.cancelRequest( reqIdP2, { from: dataConsumerOwner1 } )

          // should be 100
          const tot2 = await this.RouterContract.getTokensHeldFor(this.MockConsumerContract1.address, dataProvider1)
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })

        it( 'keep p1, cancel p2 - Router getTokensHeldFor for consumer contract/provider2 should be 0', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = 0

          const routerSalt = await this.RouterContract.getSalt()

          // initialise request1 from provider1
          await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // generate request ID for request for provider 2
          const requestNonceP2 = await this.MockConsumerContract1.getRequestNonce()
          const reqIdP2 = generateRequestId( this.MockConsumerContract1.address, requestNonceP2, dataProvider2, routerSalt )

          // initialise request2 from provider2
          await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // total should be both fees
          const tot1 = await this.RouterContract.getTotalTokensHeld()
          expect( tot1.toNumber() ).to.equal( c1p1Fee + c1p2Fee )

          // wait a sec...
          await sleepFor(1000)

          // cancel request for P2
          await this.MockConsumerContract1.cancelRequest( reqIdP2, { from: dataConsumerOwner1 } )

          // should be 0
          const tot2 = await this.RouterContract.getTokensHeldFor(this.MockConsumerContract1.address, dataProvider2)
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })
      })

      describe('multiple consumers, multiple providers', function () {
        it( 'c1 keep p1, cancel p2, c2 cancel p1 keep p2 - router contract getTotalTokensHeld is 500', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = c1p1Fee + c2p2Fee // 500

          const routerSalt = await this.RouterContract.getSalt()

          //// C1
          // initialise request1 from c1 for p1
          await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // generate request ID for request from c1 for p2
          const requestNonceC1P2 = await this.MockConsumerContract1.getRequestNonce()
          const reqIdC1P2 = generateRequestId( this.MockConsumerContract1.address, requestNonceC1P2, dataProvider2, routerSalt )

          // initialise request2 from c1 for p2
          await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          //// C2
          // generate request ID for request from c2 for p1
          const requestNonceC2P1 = await this.MockConsumerContract2.getRequestNonce()
          const reqIdC2P1 = generateRequestId( this.MockConsumerContract2.address, requestNonceC2P1, dataProvider1, routerSalt )

          // initialise request2 from c2 for p1
          await this.MockConsumerContract2.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner2 } )
          // initialise request2 from c2 for p2
          await this.MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )

          // total should be all fees
          const tot1 = await this.RouterContract.getTotalTokensHeld()
          expect( tot1.toNumber() ).to.equal( c1p1Fee + c1p2Fee + c2p1Fee + c2p2Fee )

          // wait a sec...
          await sleepFor(1000)

          // cancel request for C1 P2
          await this.MockConsumerContract1.cancelRequest( reqIdC1P2, { from: dataConsumerOwner1 } )
          // cancel request for C2 P1
          await this.MockConsumerContract2.cancelRequest( reqIdC2P1, { from: dataConsumerOwner2 } )

          // should be c1p1Fee + c2p2Fee (500)
          const tot2 = await this.RouterContract.getTotalTokensHeld()
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })

        it( 'c1 keep p1, cancel p2, c2 cancel p1 keep p2 - ERC20 balance of router contract is 500', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = c1p1Fee + c2p2Fee // 500

          const routerSalt = await this.RouterContract.getSalt()

          //// C1
          // initialise request1 from c1 for p1
          await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // generate request ID for request from c1 for p2
          const requestNonceC1P2 = await this.MockConsumerContract1.getRequestNonce()
          const reqIdC1P2 = generateRequestId( this.MockConsumerContract1.address, requestNonceC1P2, dataProvider2, routerSalt )

          // initialise request2 from c1 for p2
          await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          //// C2
          // generate request ID for request from c2 for p1
          const requestNonceC2P1 = await this.MockConsumerContract2.getRequestNonce()
          const reqIdC2P1 = generateRequestId( this.MockConsumerContract2.address, requestNonceC2P1, dataProvider1, routerSalt )

          // initialise request2 from c2 for p1
          await this.MockConsumerContract2.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner2 } )
          // initialise request2 from c2 for p2
          await this.MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )

          // total should be all fees
          const tot1 = await this.MockTokenContract.balanceOf(this.RouterContract.address)
          expect( tot1.toNumber() ).to.equal( c1p1Fee + c1p2Fee + c2p1Fee + c2p2Fee )

          // wait a sec...
          await sleepFor(1000)

          // cancel request for C1 P2
          await this.MockConsumerContract1.cancelRequest( reqIdC1P2, { from: dataConsumerOwner1 } )
          // cancel request for C2 P1
          await this.MockConsumerContract2.cancelRequest( reqIdC2P1, { from: dataConsumerOwner2 } )

          // should be c1p1Fee + c2p2Fee (500)
          const tot2 = await this.MockTokenContract.balanceOf(this.RouterContract.address)
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })

        it( 'c1 keep p1, cancel p2, c2 cancel p1 keep p2 - ERC20 balance of c1 contract is 900', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = initialContract1 - c1p1Fee // 900
          const expectedIntermediaryTotal = initialContract1 - (c1p1Fee + c1p2Fee)

          const routerSalt = await this.RouterContract.getSalt()

          //// C1
          // initialise request1 from c1 for p1
          await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // generate request ID for request from c1 for p2
          const requestNonceC1P2 = await this.MockConsumerContract1.getRequestNonce()
          const reqIdC1P2 = generateRequestId( this.MockConsumerContract1.address, requestNonceC1P2, dataProvider2, routerSalt )

          // initialise request2 from c1 for p2
          await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          //// C2
          // generate request ID for request from c2 for p1
          const requestNonceC2P1 = await this.MockConsumerContract2.getRequestNonce()
          const reqIdC2P1 = generateRequestId( this.MockConsumerContract2.address, requestNonceC2P1, dataProvider1, routerSalt )

          // initialise request2 from c2 for p1
          await this.MockConsumerContract2.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner2 } )
          // initialise request2 from c2 for p2
          await this.MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )

          // total should be all fees
          const tot1 = await this.MockTokenContract.balanceOf(this.MockConsumerContract1.address)
          expect( tot1.toNumber() ).to.equal( expectedIntermediaryTotal )

          // wait a sec...
          await sleepFor(1000)

          // cancel request for C1 P2
          await this.MockConsumerContract1.cancelRequest( reqIdC1P2, { from: dataConsumerOwner1 } )
          // cancel request for C2 P1
          await this.MockConsumerContract2.cancelRequest( reqIdC2P1, { from: dataConsumerOwner2 } )

          // should be c1p1Fee + c2p2Fee (500)
          const tot2 = await this.MockTokenContract.balanceOf(this.MockConsumerContract1.address)
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })

        it( 'c1 keep p1, cancel p2, c2 cancel p1 keep p2 - ERC20 balance of c2 contract is 600', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = initialContract2 - c2p2Fee // 900
          const expectedIntermediaryTotal = initialContract2 - (c2p1Fee + c2p2Fee)

          const routerSalt = await this.RouterContract.getSalt()

          //// C1
          // initialise request1 from c1 for p1
          await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // generate request ID for request from c1 for p2
          const requestNonceC1P2 = await this.MockConsumerContract1.getRequestNonce()
          const reqIdC1P2 = generateRequestId( this.MockConsumerContract1.address, requestNonceC1P2, dataProvider2, routerSalt )

          // initialise request2 from c1 for p2
          await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          //// C2
          // generate request ID for request from c2 for p1
          const requestNonceC2P1 = await this.MockConsumerContract2.getRequestNonce()
          const reqIdC2P1 = generateRequestId( this.MockConsumerContract2.address, requestNonceC2P1, dataProvider1, routerSalt )

          // initialise request2 from c2 for p1
          await this.MockConsumerContract2.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner2 } )
          // initialise request2 from c2 for p2
          await this.MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )

          // total should be all fees
          const tot1 = await this.MockTokenContract.balanceOf(this.MockConsumerContract2.address)
          expect( tot1.toNumber() ).to.equal( expectedIntermediaryTotal )

          // wait a sec...
          await sleepFor(1000)

          // cancel request for C1 P2
          await this.MockConsumerContract1.cancelRequest( reqIdC1P2, { from: dataConsumerOwner1 } )
          // cancel request for C2 P1
          await this.MockConsumerContract2.cancelRequest( reqIdC2P1, { from: dataConsumerOwner2 } )

          // should be c1p1Fee + c2p2Fee (500)
          const tot2 = await this.MockTokenContract.balanceOf(this.MockConsumerContract2.address)
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })

        it( 'c1 keep p1, cancel p2, c2 cancel p1 keep p2 - Router getTokensHeldFor for c1 contract/p1 should be 100', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = c1p1Fee
          const expectedIntermediaryTotal = c1p1Fee

          const routerSalt = await this.RouterContract.getSalt()

          //// C1
          // initialise request1 from c1 for p1
          await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // generate request ID for request from c1 for p2
          const requestNonceC1P2 = await this.MockConsumerContract1.getRequestNonce()
          const reqIdC1P2 = generateRequestId( this.MockConsumerContract1.address, requestNonceC1P2, dataProvider2, routerSalt )

          // initialise request2 from c1 for p2
          await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          //// C2
          // generate request ID for request from c2 for p1
          const requestNonceC2P1 = await this.MockConsumerContract2.getRequestNonce()
          const reqIdC2P1 = generateRequestId( this.MockConsumerContract2.address, requestNonceC2P1, dataProvider1, routerSalt )

          // initialise request2 from c2 for p1
          await this.MockConsumerContract2.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner2 } )
          // initialise request2 from c2 for p2
          await this.MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )

          // c1p1Fee
          const tot1 = await this.RouterContract.getTokensHeldFor(this.MockConsumerContract1.address, dataProvider1)
          expect( tot1.toNumber() ).to.equal( expectedIntermediaryTotal )

          // wait a sec...
          await sleepFor(1000)

          // cancel request for C1 P2
          await this.MockConsumerContract1.cancelRequest( reqIdC1P2, { from: dataConsumerOwner1 } )
          // cancel request for C2 P1
          await this.MockConsumerContract2.cancelRequest( reqIdC2P1, { from: dataConsumerOwner2 } )

          // should be c1p1Fee + c2p2Fee (500)
          const tot2 = await this.RouterContract.getTokensHeldFor(this.MockConsumerContract1.address, dataProvider1)
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })

        it( 'c1 keep p1, cancel p2, c2 cancel p1 keep p2 - Router getTokensHeldFor for c1 contract/p2 should be 0', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = 0
          const expectedIntermediaryTotal = c1p2Fee

          const routerSalt = await this.RouterContract.getSalt()

          //// C1
          // initialise request1 from c1 for p1
          await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // generate request ID for request from c1 for p2
          const requestNonceC1P2 = await this.MockConsumerContract1.getRequestNonce()
          const reqIdC1P2 = generateRequestId( this.MockConsumerContract1.address, requestNonceC1P2, dataProvider2, routerSalt )

          // initialise request2 from c1 for p2
          await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          //// C2
          // generate request ID for request from c2 for p1
          const requestNonceC2P1 = await this.MockConsumerContract2.getRequestNonce()
          const reqIdC2P1 = generateRequestId( this.MockConsumerContract2.address, requestNonceC2P1, dataProvider1, routerSalt )

          // initialise request2 from c2 for p1
          await this.MockConsumerContract2.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner2 } )
          // initialise request2 from c2 for p2
          await this.MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )

          // total should be all fees
          const tot1 = await this.RouterContract.getTokensHeldFor(this.MockConsumerContract1.address, dataProvider2)
          expect( tot1.toNumber() ).to.equal( expectedIntermediaryTotal )

          // wait a sec...
          await sleepFor(1000)

          // cancel request for C1 P2
          await this.MockConsumerContract1.cancelRequest( reqIdC1P2, { from: dataConsumerOwner1 } )
          // cancel request for C2 P1
          await this.MockConsumerContract2.cancelRequest( reqIdC2P1, { from: dataConsumerOwner2 } )

          // should be 0
          const tot2 = await this.RouterContract.getTokensHeldFor(this.MockConsumerContract1.address, dataProvider2)
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })
        it( 'c1 keep p1, cancel p2, c2 cancel p1 keep p2 - Router getTokensHeldFor for c2 contract/p1 should be 0', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = 0
          const expectedIntermediaryTotal = c2p1Fee

          const routerSalt = await this.RouterContract.getSalt()

          //// C1
          // initialise request1 from c1 for p1
          await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // generate request ID for request from c1 for p2
          const requestNonceC1P2 = await this.MockConsumerContract1.getRequestNonce()
          const reqIdC1P2 = generateRequestId( this.MockConsumerContract1.address, requestNonceC1P2, dataProvider2, routerSalt )

          // initialise request2 from c1 for p2
          await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          //// C2
          // generate request ID for request from c2 for p1
          const requestNonceC2P1 = await this.MockConsumerContract2.getRequestNonce()
          const reqIdC2P1 = generateRequestId( this.MockConsumerContract2.address, requestNonceC2P1, dataProvider1, routerSalt )

          // initialise request2 from c2 for p1
          await this.MockConsumerContract2.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner2 } )
          // initialise request2 from c2 for p2
          await this.MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )

          // c1p1Fee
          const tot1 = await this.RouterContract.getTokensHeldFor(this.MockConsumerContract2.address, dataProvider1)
          expect( tot1.toNumber() ).to.equal( expectedIntermediaryTotal )

          // wait a sec...
          await sleepFor(1000)

          // cancel request for C1 P2
          await this.MockConsumerContract1.cancelRequest( reqIdC1P2, { from: dataConsumerOwner1 } )
          // cancel request for C2 P1
          await this.MockConsumerContract2.cancelRequest( reqIdC2P1, { from: dataConsumerOwner2 } )

          // should be c1p1Fee + c2p2Fee (500)
          const tot2 = await this.RouterContract.getTokensHeldFor(this.MockConsumerContract2.address, dataProvider1)
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })

        it( 'c1 keep p1, cancel p2, c2 cancel p1 keep p2 - Router getTokensHeldFor for c2 contract/p2 should be 400', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = 400
          const expectedIntermediaryTotal = c2p2Fee

          const routerSalt = await this.RouterContract.getSalt()

          //// C1
          // initialise request1 from c1 for p1
          await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          // generate request ID for request from c1 for p2
          const requestNonceC1P2 = await this.MockConsumerContract1.getRequestNonce()
          const reqIdC1P2 = generateRequestId( this.MockConsumerContract1.address, requestNonceC1P2, dataProvider2, routerSalt )

          // initialise request2 from c1 for p2
          await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )

          //// C2
          // generate request ID for request from c2 for p1
          const requestNonceC2P1 = await this.MockConsumerContract2.getRequestNonce()
          const reqIdC2P1 = generateRequestId( this.MockConsumerContract2.address, requestNonceC2P1, dataProvider1, routerSalt )

          // initialise request2 from c2 for p1
          await this.MockConsumerContract2.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner2 } )
          // initialise request2 from c2 for p2
          await this.MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )

          // 400
          const tot1 = await this.RouterContract.getTokensHeldFor(this.MockConsumerContract2.address, dataProvider2)
          expect( tot1.toNumber() ).to.equal( expectedIntermediaryTotal )

          // wait a sec...
          await sleepFor(1000)

          // cancel request for C1 P2
          await this.MockConsumerContract1.cancelRequest( reqIdC1P2, { from: dataConsumerOwner1 } )
          // cancel request for C2 P1
          await this.MockConsumerContract2.cancelRequest( reqIdC2P1, { from: dataConsumerOwner2 } )

          // should be 400
          const tot2 = await this.RouterContract.getTokensHeldFor(this.MockConsumerContract2.address, dataProvider2)
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })

      })
    })

  })

})
