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
const MockConsumerCustomRequest = contract.fromArtifact("MockConsumerCustomRequest") // Loads a compiled contract
const ConsumerLib = contract.fromArtifact('ConsumerLib') // Loads a compiled contract

const sleepFor = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

const getReqIdFromReceipt = function(receipt) {
  for(let i = 0; i < receipt.logs.length; i += 1) {
    const log = receipt.logs[i]
    if(log.event === "DataRequested") {
      return log.args.requestId
    }
  }
  return null
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

describe('Consumer - data request tests', function () {
  this.timeout(300000)

  const [admin, dataProvider, dataConsumerOwner, rando, dataProvider2, dataConsumerOwner2] = accounts
  const [adminPk, dataProviderPk, dataConsumerOwnerPk, randoPk, dataProvider2Pk, dataConsumerOwner2Pk] = privateKeys
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const fee = new BN(0.1 * ( 10 ** 9 ))
  const endpoint = web3.utils.asciiToHex("PRICE.BTC.USD.AVG")
  const gasPrice = 100 // gwei, 10 ** 9 done in contract

  // deploy contracts before every test
  beforeEach(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, {from: admin})

    // Deploy ConsumerLib library and link
    this.ConsumerLib = await ConsumerLib.new({from: admin})
    await MockConsumer.detectNetwork();
    await MockConsumer.link("ConsumerLib", this.ConsumerLib.address)

    await MockConsumerCustomRequest.detectNetwork();
    await MockConsumerCustomRequest.link("ConsumerLib", this.ConsumerLib.address)

    // dataConsumerOwner deploy Consumer contracts
    this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
    this.MockConsumerCustomRequestContract = await MockConsumerCustomRequest.new(this.RouterContract.address, {from: dataConsumerOwner})

  })

  /*
   * Tests in ideal scenario
   */
  describe('ideal scenario - enough tokens and allowance, dataProvider authorised', function () {
    // set up ideal scenario for these tests
    beforeEach(async function () {
      // increase Router allowance
      await this.MockConsumerContract.setRouterAllowance(new BN(999999 * ( 10 ** 9 )), true, {from: dataConsumerOwner})
      await this.MockConsumerCustomRequestContract.setRouterAllowance(new BN(999999 * ( 10 ** 9 )), true, {from: dataConsumerOwner})

      // add a dataProvider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {from: dataConsumerOwner});
      await this.MockConsumerCustomRequestContract.addRemoveDataProvider(dataProvider, fee, false, {from: dataConsumerOwner});

      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})

      // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})
      await this.MockTokenContract.transfer(this.MockConsumerCustomRequestContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})

      // set provider to pay gas for data fulfilment - not testing this here
      await this.RouterContract.setProviderPaysGas(true, { from: dataProvider })
      await this.RouterContract.setProviderPaysGas(true, { from: dataProvider2 })
    })

    describe('initialise requests', function () {

      it( 'dataConsumer (owner) can initialise a request - emits DataRequestSubmitted event', async function () {
        const reciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const reqId = await getReqIdFromReceipt(reciept)

        expectEvent( reciept, 'DataRequestSubmitted', {
          requestId: reqId,
        } )
      } )

      it( 'dataConsumer (owner) can initialise a custom request - emits CustomDataRequested event', async function () {
        const reciept = await this.MockConsumerCustomRequestContract.customRequestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const reqId = await getReqIdFromReceipt(reciept)

        expectEvent( reciept, 'CustomDataRequested', {
          requestId: reqId,
          data: `${endpoint}000000000000000000000000000000`
        } )
      } )

      it( 'dataConsumer (owner) can initialise a request - Router emits DataRequested event', async function () {
        const reciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        const reqId = await getReqIdFromReceipt(reciept)
        const expires = await this.RouterContract.getDataRequestExpires( reqId )

        expectEvent( reciept, 'DataRequested', {
          dataConsumer: this.MockConsumerContract.address,
          dataProvider: dataProvider,
          fee: fee,
          data: `${endpoint}000000000000000000000000000000`,
          requestId: reqId,
          gasPrice: new BN( gasPrice * ( 10 ** 9 ) ),
          expires: expires,
        } )
      } )

      it( 'request ID correctly generated', async function () {

        const expectedReqId = generateRequestId( this.MockConsumerContract.address, new BN(0), dataProvider, this.RouterContract.address )
        const reciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const actualReqId = getReqIdFromReceipt(reciept)

        expect(actualReqId).to.equal(expectedReqId)

      } )

      it( 'only dataConsumer (owner) can initialise a request - reverts with error', async function () {
        await expectRevert(
          this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: rando } ),
          "ConsumerLib: only owner"
        )
      } )

      it( 'cannot exceed own gas limit - reverts with error', async function () {
        // gasLimit is 200 Gwei. Send with 300
        await expectRevert(
          this.MockConsumerContract.requestData( dataProvider, endpoint, 300, { from: dataConsumerOwner } ),
          "ConsumerLib: gasPrice > gasPriceLimit"
        )
      } )

      it( 'consumer must have authorised provider - reverts with error', async function () {
        // rando is not authorised
        await expectRevert(
          this.MockConsumerContract.requestData( rando, endpoint, gasPrice, { from: dataConsumerOwner } ),
          "ConsumerLib: _dataProvider is not authorised"
        )
      } )

      it( 'dataConsumer (owner) can add rando as new data provider and initialise a request', async function () {
        // add rando as new provider
        await this.MockConsumerContract.addRemoveDataProvider( rando, fee, false, { from: dataConsumerOwner } );

        const reciept = await this.MockConsumerContract.requestData( rando, endpoint, gasPrice, { from: dataConsumerOwner } )
        const reqId = await getReqIdFromReceipt(reciept)

        expectEvent( reciept, 'DataRequestSubmitted', {
          requestId: reqId,
        } )
      } )

      it( 'request will fail if dataProvider revoked - reverts with error', async function () {
        // remove dataProvider as a data provider
        await this.MockConsumerContract.addRemoveDataProvider( dataProvider, 0, true, { from: dataConsumerOwner } );
        // dataProvider is no longer authorised
        await expectRevert(
          this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } ),
          "ConsumerLib: _dataProvider is not authorised"
        )
      } )
    })
  })

  /*
   * Basic Tests with Tokens
   */
  describe('basic token tests', function () {
    // add data provider but no tokens
    beforeEach(async function () {
      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, new BN(10 * (10 ** decimals)), {from: admin})
      // add Data provider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {from: dataConsumerOwner});

      // set provider to pay gas for data fulfilment - not testing this here
      await this.RouterContract.setProviderPaysGas(true, { from: dataProvider })

    })

    it( 'consumer contract must have enough tokens', async function () {
      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } ),
        "Router: contract does not have enough tokens to pay fee"
      )
    } )

    it( 'router contract must have enough allowance', async function () {
      // Transfer 1 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})

      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } ),
        "Router: not enough allowance to pay fee"
      )
    } )

    it( 'request succeeds when contract balance and router allowance increases', async function () {
      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } ),
        "Router: contract does not have enough tokens to pay fee"
      )

      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN((10 ** decimals)), {from: dataConsumerOwner})

      await expectRevert(
        this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } ),
        "Router: not enough allowance to pay fee"
      )

      // increase Router allowance
      await this.MockConsumerContract.setRouterAllowance(new BN(999999 * ( 10 ** 9 )), true, {from: dataConsumerOwner})

      const reciept = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
      const reqId = await getReqIdFromReceipt(reciept)

      expectEvent( reciept, 'DataRequestSubmitted', {
        requestId: reqId,
      } )

    })
  })
  /*
   * Advanced Tests with Tokens
   */
  describe('advanced token and payment tests', function () {
    // add data provider and tokens
    beforeEach( async function () {
      // Admin Transfer 10 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer( dataConsumerOwner, new BN( 10 * ( 10 ** decimals ) ), { from: admin } )
      // Admin Transfer 10 Tokens to dataConsumerOwner2
      await this.MockTokenContract.transfer( dataConsumerOwner2, new BN( 10 * ( 10 ** decimals ) ), { from: admin } )

      // set provider to pay gas for data fulfilment - not testing this here
      await this.RouterContract.setProviderPaysGas(true, { from: dataProvider })
      await this.RouterContract.setProviderPaysGas(true, { from: dataProvider2 })

    } )
    describe('single data provider', function () {
      it( 'data request success - ERC20 token balance for Consumer contract should be 800 after 2 requests', async function () {
        const initialContract = 1000
        const expectedContract = 800
        const dpFee = 100

        // add tokens to consumer contract
        await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialContract, { from: dataConsumerOwner } )
        // add Data provider
        await this.MockConsumerContract.addRemoveDataProvider( dataProvider, dpFee, false, { from: dataConsumerOwner } );
        // increase router allowance
        await this.MockConsumerContract.setRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), true, { from: dataConsumerOwner } )

        // request 1, pay 100
        const r1 = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        // request 2, pay another 100
        const r2 = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const reqId1 = getReqIdFromReceipt(r1)
        const reqId2 = getReqIdFromReceipt(r2)

        // no fee transfers yet
        const erc20BalanceBefore = await this.MockTokenContract.balanceOf( this.MockConsumerContract.address )
        expect( erc20BalanceBefore.toNumber() ).to.equal( initialContract )

        // fulfill requests
        const msg1 = generateSigMsg(reqId1, 100, this.MockConsumerContract.address)
        const sig1 = await web3.eth.accounts.sign(msg1, dataProviderPk)
        await this.RouterContract.fulfillRequest(reqId1, 100, sig1.signature, {from: dataProvider})

        const msg2 = generateSigMsg(reqId2, 200, this.MockConsumerContract.address)
        const sig2 = await web3.eth.accounts.sign(msg2, dataProviderPk)
        await this.RouterContract.fulfillRequest(reqId2, 200, sig2.signature, {from: dataProvider})

        const erc20BalanceAfter = await this.MockTokenContract.balanceOf( this.MockConsumerContract.address )
        expect( erc20BalanceAfter.toNumber() ).to.equal( expectedContract )
      } )
    })
    describe('multiple data providers', function () {
      it( 'data request success - ERC20 token balance for Consumer contract should be 700 after 2 requests', async function () {
        const initialContract = 1000
        const expectedContract = 700
        const dp1Fee = 100
        const dp2Fee = 200

        // add tokens to consumer contract
        await this.MockTokenContract.transfer( this.MockConsumerContract.address, initialContract, { from: dataConsumerOwner } )
        // add Data provider1
        await this.MockConsumerContract.addRemoveDataProvider( dataProvider, dp1Fee, false, { from: dataConsumerOwner } );
        // add Data provider2
        await this.MockConsumerContract.addRemoveDataProvider( dataProvider2, dp2Fee, false, { from: dataConsumerOwner } );
        // increase router allowance
        await this.MockConsumerContract.setRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), true, { from: dataConsumerOwner } )

        // request 1 from provider 1, pay 100
        const r1 = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        // request 2, from provider 2 pay 200
        const r2 = await this.MockConsumerContract.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner } )

        const reqId1 = getReqIdFromReceipt(r1)
        const reqId2 = getReqIdFromReceipt(r2)

        // ERC20 balance for consumer contract should be 700
        const erc20Balance = await this.MockTokenContract.balanceOf( this.MockConsumerContract.address )
        expect( erc20Balance.toNumber() ).to.equal( initialContract )

        // fulfill requests
        const msg1 = generateSigMsg(reqId1, 100, this.MockConsumerContract.address)
        const sig1 = await web3.eth.accounts.sign(msg1, dataProviderPk)
        await this.RouterContract.fulfillRequest(reqId1, 100, sig1.signature, {from: dataProvider})

        const msg2 = generateSigMsg(reqId2, 200, this.MockConsumerContract.address)
        const sig2 = await web3.eth.accounts.sign(msg2, dataProvider2Pk)
        await this.RouterContract.fulfillRequest(reqId2, 200, sig2.signature, {from: dataProvider2})

        const erc20BalanceAfter = await this.MockTokenContract.balanceOf( this.MockConsumerContract.address )
        expect( erc20BalanceAfter.toNumber() ).to.equal( expectedContract )
      } )
    })

    describe('multiple data consumers and providers', function () {

      it( 'data request success - ERC20 token balance for Consumer contracts should be correct after 4 requests', async function () {
        const initialContract1 = 1000
        const initialContract2 = 1000
        const c1p1Fee = 100
        const c1p2Fee = 200
        const c2p1Fee = 300
        const c2p2Fee = 400
        const expectedC1 = 700
        const expectedC2 = 300

        // dataConsumerOwner deploy Consumer contract
        const MockConsumerContract1 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})
        // add tokens to consumer contract
        await this.MockTokenContract.transfer( MockConsumerContract1.address, initialContract1, { from: dataConsumerOwner } )
        // add Data provider1
        await MockConsumerContract1.addRemoveDataProvider( dataProvider, c1p1Fee, false, { from: dataConsumerOwner } );
        // add Data provider2
        await MockConsumerContract1.addRemoveDataProvider( dataProvider2, c1p2Fee, false, { from: dataConsumerOwner } );
        // increase router allowance
        await MockConsumerContract1.setRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), true, { from: dataConsumerOwner } )

        // dataConsumerOwner2 deploy Consumer contract
        const MockConsumerContract2 = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner2})
        // add tokens to consumer contract
        await this.MockTokenContract.transfer( MockConsumerContract2.address, initialContract2, { from: dataConsumerOwner2 } )
        // add Data provider1
        await MockConsumerContract2.addRemoveDataProvider( dataProvider, c2p1Fee, false, { from: dataConsumerOwner2 } );
        // add Data provider2
        await MockConsumerContract2.addRemoveDataProvider( dataProvider2, c2p2Fee, false, { from: dataConsumerOwner2 } );
        // increase router allowance
        await MockConsumerContract2.setRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), true, { from: dataConsumerOwner2 } )

        // request 1 - consumer 1 from provider 1, pay 100
        const r1 = await MockConsumerContract1.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        // request 2 - consumer 1 from provider 2 pay 200
        const r2 = await MockConsumerContract1.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner } )

        // request 3 - consumer 2 from provider 1, pay 100
        const r3 = await MockConsumerContract2.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner2 } )

        // request 4 - consumer 2 from provider 2 pay 200
        const r4 =  await MockConsumerContract2.requestData( dataProvider2, endpoint, gasPrice, { from: dataConsumerOwner2 } )

        // ERC20 balance for C1 should be 1000
        const erc20BalanceC1Before = await this.MockTokenContract.balanceOf( MockConsumerContract1.address )
        expect( erc20BalanceC1Before.toNumber() ).to.equal( initialContract1 )

        // ERC20 balance for C2 should be 1000
        const erc20BalanceC2Before = await this.MockTokenContract.balanceOf( MockConsumerContract2.address )
        expect( erc20BalanceC2Before.toNumber() ).to.equal( initialContract2 )

        const reqId1 = getReqIdFromReceipt(r1)
        const reqId2 = getReqIdFromReceipt(r2)
        const reqId3 = getReqIdFromReceipt(r3)
        const reqId4 = getReqIdFromReceipt(r4)

        // fulfill requests
        const msg1 = generateSigMsg(reqId1, 100, MockConsumerContract1.address)
        const sig1 = await web3.eth.accounts.sign(msg1, dataProviderPk)
        await this.RouterContract.fulfillRequest(reqId1, 100, sig1.signature, {from: dataProvider})

        const msg2 = generateSigMsg(reqId2, 200, MockConsumerContract1.address)
        const sig2 = await web3.eth.accounts.sign(msg2, dataProvider2Pk)
        await this.RouterContract.fulfillRequest(reqId2, 200, sig2.signature, {from: dataProvider2})

        const msg3 = generateSigMsg(reqId3, 300, MockConsumerContract2.address)
        const sig3 = await web3.eth.accounts.sign(msg3, dataProviderPk)
        await this.RouterContract.fulfillRequest(reqId3, 300, sig3.signature, {from: dataProvider})

        const msg4 = generateSigMsg(reqId4, 400, MockConsumerContract2.address)
        const sig4 = await web3.eth.accounts.sign(msg4, dataProvider2Pk)
        await this.RouterContract.fulfillRequest(reqId4, 400, sig4.signature, {from: dataProvider2})

        // ERC20 balance for C1 should be 700
        const erc20BalanceC1After = await this.MockTokenContract.balanceOf( MockConsumerContract1.address )
        expect( erc20BalanceC1After.toNumber() ).to.equal( expectedC1 )

        // ERC20 balance for C2 should be 300
        const erc20BalanceC2After = await this.MockTokenContract.balanceOf( MockConsumerContract2.address )
        expect( erc20BalanceC2After.toNumber() ).to.equal( expectedC2 )
      })
    } )
  })
})
