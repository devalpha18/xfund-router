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

const getReqIdFromReceipt = function(receipt) {
  for(let i = 0; i < receipt.logs.length; i += 1) {
    const log = receipt.logs[i]
    if(log.event === "DataRequested") {
      return log.args.requestId
    }
  }
  return null
}

const signData = async function(reqId, priceToSend, consumerContractAddress, providerPk) {
  const msg = generateSigMsg(reqId, priceToSend, consumerContractAddress)
  return web3.eth.accounts.sign(msg, providerPk)
}

function generateSigMsg(requestId, data, consumerAddress) {
  return web3.utils.soliditySha3(
    { 'type': 'bytes32', 'value': requestId},
    { 'type': 'uint256', 'value': data},
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
  routerAddress) {
  return web3.utils.soliditySha3(
    { 'type': 'address', 'value': consumerAddress},
    { 'type': 'address', 'value': dataProvider},
    { 'type': 'address', 'value': routerAddress},
    { 'type': 'uint256', 'value': requestNonce.toNumber()}
  )
}

describe('Consumer - request cancellation tests', function () {
  this.timeout(300000)

  const [admin, dataProvider1, dataConsumerOwner1, dataProvider2, dataConsumerOwner2, rando ] = accounts
  const [adminPk, dataProvider1Pk, dataConsumer1Pk, dataProvider2Pk, dataConsumerOwner2Pk, randoPk] = privateKeys
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const fee = new BN(0.1 * ( 10 ** 9 ))
  const endpoint = web3.utils.asciiToHex("PRICE.BTC.USD.AVG")
  const gasPrice = 100 // gwei, 10 ** 9 done in contract

  /*
   * Tests in ideal scenario
   */
  describe('basic request cancellation', function () {
    // set up ideal scenario for these tests
    beforeEach(async function () {
      // admin deploy Token contract
      this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})

      // admin deploy Router contract
      this.RouterContract = await Router.new(this.MockTokenContract.address, {from: admin})

      // Deploy ConsumerLib library and link
      this.ConsumerLib = await ConsumerLib.new({from: admin})
      await MockConsumer.detectNetwork();
      await MockConsumer.link("ConsumerLib", this.ConsumerLib.address)

      // dataConsumerOwner1 deploy Consumer contract
      this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner1})

      // increase Router allowance
      await this.MockConsumerContract.setRouterAllowance(new BN(999999 * ( 10 ** 9 )), true, {from: dataConsumerOwner1})

      // add a dataProvider1
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider1, fee, false, {from: dataConsumerOwner1});

      // Admin Transfer 10 Tokens to dataConsumerOwner1
      await this.MockTokenContract.transfer(dataConsumerOwner1, new BN(10 * (10 ** decimals)), {from: admin})

      // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner1
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner1})

      // set provider to pay gas for data fulfilment - not testing this here
      await this.RouterContract.setProviderPaysGas(true, { from: dataProvider1 })
      await this.RouterContract.setProviderPaysGas(true, { from: dataProvider2 })
    })

    /*
     * cancellation
     */
    it( 'dataConsumer (owner) can cancel a request - emits RequestCancellationSubmitted event', async function () {
      // set request timeout to 1 second
      await this.MockConsumerContract.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, 1, { from: dataConsumerOwner1 })

      // initialse request
      const reqReciept = await this.MockConsumerContract.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )
      const reqId = await getReqIdFromReceipt(reqReciept)
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
      // set request timeout to 1 second
      await this.MockConsumerContract.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, 1, { from: dataConsumerOwner1 })

      // initialse request
      const reqReiept =  await this.MockConsumerContract.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )
      const reqId = await getReqIdFromReceipt(reqReiept)
      // wait a sec...
      await sleepFor(1000)

      // cancel request
      const reciept = await this.MockConsumerContract.cancelRequest( reqId, { from: dataConsumerOwner1 } )

      expectEvent( reciept, 'RequestCancelled', {
        dataConsumer: this.MockConsumerContract.address,
        dataProvider: dataProvider1,
        requestId: reqId
      } )
    } )

    it( 'only dataConsumer (owner) can cancel a request', async function () {
      // set request timeout to 1 second
      await this.MockConsumerContract.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, 1, { from: dataConsumerOwner1 })

      // initialse request
      const reqReciept = await this.MockConsumerContract.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )
      const reqId = await getReqIdFromReceipt(reqReciept)
      // wait a sec...
      await sleepFor(1000)

      // cancel request
      await expectRevert(
        this.MockConsumerContract.cancelRequest( reqId, { from: rando } ),
        "ConsumerLib: only owner"
      )
    } )

    it( 'request id must exist', async function () {
      const reqId = generateRequestId( this.MockConsumerContract.address, new BN(0), dataProvider1, this.RouterContract.address )

      // cancel request
      await expectRevert(
        this.MockConsumerContract.cancelRequest( reqId, { from: dataConsumerOwner1 } ),
        "ConsumerLib: request id does not exist"
      )
    } )

    it( 'request must have expired', async function () {
      // set request timeout to 100 seconds
      await this.MockConsumerContract.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, 100, { from: dataConsumerOwner1 })

      // initialse request
      const reciept = await this.MockConsumerContract.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )
      const reqId = await getReqIdFromReceipt(reciept)

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
      this.RouterContract = await Router.new(this.MockTokenContract.address, {from: admin})

      // dataConsumerOwner1 deploy Consumer contract
      this.MockConsumerContract1 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner1})
      // dataConsumerOwner2 deploy Consumer contract
      this.MockConsumerContract2 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner2})

      // increase Router allowances
      await this.MockConsumerContract1.setRouterAllowance(new BN(999999 * ( 10 ** 9 )), true, {from: dataConsumerOwner1})
      await this.MockConsumerContract2.setRouterAllowance(new BN(999999 * ( 10 ** 9 )), true, {from: dataConsumerOwner2})

      // add dataProvider1
      await this.MockConsumerContract1.addRemoveDataProvider(dataProvider1, c1p1Fee, false, {from: dataConsumerOwner1});
      await this.MockConsumerContract2.addRemoveDataProvider(dataProvider1, c2p1Fee, false, {from: dataConsumerOwner2});
      // add dataProvider2
      await this.MockConsumerContract1.addRemoveDataProvider(dataProvider2, c1p2Fee, false, {from: dataConsumerOwner1});
      await this.MockConsumerContract2.addRemoveDataProvider(dataProvider2, c2p2Fee, false, {from: dataConsumerOwner2});

      // Admin Transfer 10000000000 Tokens to dataConsumerOwners
      await this.MockTokenContract.transfer(dataConsumerOwner1, new BN(10 * (10 ** decimals)), {from: admin})
      await this.MockTokenContract.transfer(dataConsumerOwner2, new BN(10 * (10 ** decimals)), {from: admin})

      // Transfer 1000 Tokens to MockConsumerContracts from dataConsumerOwners
      await this.MockTokenContract.transfer(this.MockConsumerContract1.address, initialContract1, {from: dataConsumerOwner1})
      await this.MockTokenContract.transfer(this.MockConsumerContract2.address, initialContract2, {from: dataConsumerOwner2})

      // set request timeout to 1 second
      await this.MockConsumerContract1.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, 1, { from: dataConsumerOwner1 })
      await this.MockConsumerContract2.setRequestVar(REQUEST_VAR_REQUEST_TIMEOUT, 1, { from: dataConsumerOwner2 })

      // set provider to pay gas for data fulfilment - not testing this here
      await this.RouterContract.setProviderPaysGas(true, { from: dataProvider1 })
      await this.RouterContract.setProviderPaysGas(true, { from: dataProvider2 })
    })

    describe('basic tests', function () {
      it( 'single data cancellation success - ERC20 consumer contract balance remains 1000', async function () {
        // initialise request
        const reqReciept = await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )
        const reqId = await getReqIdFromReceipt(reqReciept)

        const tot1 = await this.MockTokenContract.balanceOf(this.MockConsumerContract1.address)
        expect( tot1.toNumber() ).to.equal( initialContract1 )
        // wait a sec...
        await sleepFor(1000)

        await this.MockConsumerContract1.cancelRequest( reqId, { from: dataConsumerOwner1 } )

        const tot2 = await this.MockTokenContract.balanceOf(this.MockConsumerContract1.address)
        expect( tot2.toNumber() ).to.equal( initialContract1 )
      })
    })

    describe('advanced tests', function () {
      describe('single consumer, multiple providers', function () {
        it( 'keep p1, cancel p2 - ERC20 balance of consumer contract is 900', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = initialContract1 - c1p1Fee

          // initialise request1 from provider1
          const r1 = await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )
          const reqIdP1 = getReqIdFromReceipt(r1)

          // initialise request2 from provider2
          const r2 = await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )
          const reqIdP2 = getReqIdFromReceipt(r2)

          // total should still be 1000
          const tot1 = await this.MockTokenContract.balanceOf(this.MockConsumerContract1.address)
          expect( tot1.toNumber() ).to.equal( initialContract1 )

          // fulfil 1
          const sig1 = await signData(reqIdP1, 100, this.MockConsumerContract1.address, dataProvider1Pk)
          await this.RouterContract.fulfillRequest(reqIdP1, 100, sig1.signature, {from: dataProvider1})

          // wait a sec...
          await sleepFor(1000)

          // cancel request for P2
          await this.MockConsumerContract1.cancelRequest( reqIdP2, { from: dataConsumerOwner1 } )

          // should be 1000 - c1p1Fee
          const tot2 = await this.MockTokenContract.balanceOf(this.MockConsumerContract1.address)
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })
      })

      describe('multiple consumers, multiple providers', function () {
        it( 'c1 keep p1, cancel p2, c2 cancel p1 keep p2 - ERC20 balance of c1 contract is 900', async function () {
          // c1p1 = 100, c1p2 = 200, c2p1 = 300, c2p2 = 400
          const expectedTotal = initialContract1 - c1p1Fee // 900

          //// C1
          // initialise request1 from c1 for p1
          const r1 = await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )
          const reqIdC1P1 = getReqIdFromReceipt(r1)

          // initialise request2 from c1 for p2
          const r2 = await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )
          const reqIdC1P2 = getReqIdFromReceipt(r2)

          //// C2
          // initialise request3 from c2 for p1
          const r3 = await this.MockConsumerContract2.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner2 } )
          const reqIdC2P1 = getReqIdFromReceipt(r3)

          // initialise request4 from c2 for p2
          const r4 = await this.MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )
          const reqIdC2P2 = getReqIdFromReceipt(r4)

          // total should still be 1000
          const tot1 = await this.MockTokenContract.balanceOf(this.MockConsumerContract1.address)
          expect( tot1.toNumber() ).to.equal( initialContract1 )

          // wait a sec...
          await sleepFor(1000)

          // fulfil C1 P1
          const sig1 = await signData(reqIdC1P1, 100, this.MockConsumerContract1.address, dataProvider1Pk)
          await this.RouterContract.fulfillRequest(reqIdC1P1, 100, sig1.signature, {from: dataProvider1})

          // fulfil C2 P2
          const sig2 = await signData(reqIdC2P2, 500, this.MockConsumerContract2.address, dataProvider2Pk)
          await this.RouterContract.fulfillRequest(reqIdC2P2, 500, sig2.signature, {from: dataProvider2})

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

          //// C1
          // initialise request1 from c1 for p1
          const r1 = await this.MockConsumerContract1.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner1 } )
          const reqIdC1P1 = getReqIdFromReceipt(r1)

          // initialise request2 from c1 for p2
          const r2 = await this.MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner1 } )
          const reqIdC1P2 = getReqIdFromReceipt(r2)

          //// C2
          // initialise request2 from c2 for p1
          const r3 = await this.MockConsumerContract2.requestData( dataProvider1, endpoint, gasPrice, { from: dataConsumerOwner2 } )
          const reqIdC2P1 = getReqIdFromReceipt(r3)

          // initialise request2 from c2 for p2
          const r4 = await this.MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )
          const reqIdC2P2 = getReqIdFromReceipt(r4)

          // total should still be 1000
          const tot1 = await this.MockTokenContract.balanceOf(this.MockConsumerContract1.address)
          expect( tot1.toNumber() ).to.equal( initialContract1 )

          // wait a sec...
          await sleepFor(1000)

          // fulfil C1 P1
          const sig1 = await signData(reqIdC1P1, 100, this.MockConsumerContract1.address, dataProvider1Pk)
          await this.RouterContract.fulfillRequest(reqIdC1P1, 100, sig1.signature, {from: dataProvider1})

          // fulfil C2 P2
          const sig2 = await signData(reqIdC2P2, 500, this.MockConsumerContract2.address, dataProvider2Pk)
          await this.RouterContract.fulfillRequest(reqIdC2P2, 500, sig2.signature, {from: dataProvider2})

          // cancel request for C1 P2
          await this.MockConsumerContract1.cancelRequest( reqIdC1P2, { from: dataConsumerOwner1 } )
          // cancel request for C2 P1
          await this.MockConsumerContract2.cancelRequest( reqIdC2P1, { from: dataConsumerOwner2 } )

          // should be c1p1Fee + c2p2Fee (500)
          const tot2 = await this.MockTokenContract.balanceOf(this.MockConsumerContract2.address)
          expect( tot2.toNumber() ).to.equal( expectedTotal )
        })
      })
    })

  })

})
