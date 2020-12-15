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
const MockBadConsumerBadImpl = contract.fromArtifact('MockBadConsumerBadImpl') // Loads a compiled contract
const ConsumerLib = contract.fromArtifact('ConsumerLib') // Loads a compiled contract

const signData = async function(reqId, priceToSend, consumerContractAddress, providerPk) {
  const msg = generateSigMsg(reqId, priceToSend, consumerContractAddress)
  return web3.eth.accounts.sign(msg, providerPk)
}

const generateSigMsg = function(requestId, data, consumerAddress) {
  return web3.utils.soliditySha3(
    { 'type': 'bytes32', 'value': requestId},
    { 'type': 'uint256', 'value': data},
    { 'type': 'address', 'value': consumerAddress}
  )
}

const generateRequestId = function(
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

const calculateCost = async function(receipts, value) {
  let totalCost = new BN(value)

  for(let i = 0; i < receipts.length; i += 1) {
    const r = receipts[i]
    const gasUsed = r.receipt.gasUsed
    const tx = await web3.eth.getTransaction(r.tx)
    const gasPrice = tx.gasPrice
    const gasCost = new BN(gasPrice).mul(new BN(gasUsed))
    totalCost = totalCost.add(gasCost)
  }

  return totalCost
}

const dumpReceiptGasInfo = async function(receipt, gasPrice) {
  let refundAmount = new BN(0)
  const gasPriceGwei = gasPrice * (10 ** 9)
  console.log("gasPrice", gasPrice)
  console.log("gasPriceGwei", gasPriceGwei)
  console.log(receipt.receipt.gasUsed, "(gasUsed)")
  console.log(receipt.receipt.cumulativeGasUsed, "(cumulativeGasUsed)")

  const actualSpent = await calculateCost([receipt], 0)

  for(let i = 0; i < receipt.receipt.logs.length; i += 1) {
    const log = receipt.receipt.logs[i]
    if(log.event === "GasRefundedToProvider") {
      refundAmount = log.args.amount
    }
  }
  const diff = refundAmount.sub(actualSpent)
  console.log(refundAmount.toString(), "(refund amount - wei)")
  console.log(actualSpent.toString(), "(actualSpent - wei)")
  console.log(diff.toString(), "(diff - wei)")

  console.log(web3.utils.fromWei(refundAmount), "(refund amount - eth)")
  console.log(web3.utils.fromWei(actualSpent), "(actualSpent - eth)")
  console.log(web3.utils.fromWei(diff), "(diff - eth)")

  const diffGwei = new BN(diff.toString()).div(new BN(10 ** 9))
  console.log(diffGwei.toString(), "(diff - gwei)")
  const gasDiff = diffGwei.div(new BN(String(gasPrice)))
  console.log(gasDiff.toString(), "(gasDiff)")
}

const estimateGasDiff = async function(receipt, gasPrice) {
  let refundAmount = new BN(0)
  const actualSpent = await calculateCost([receipt], 0)

  for(let i = 0; i < receipt.receipt.logs.length; i += 1) {
    const log = receipt.receipt.logs[i]
    if(log.event === "GasRefundedToProvider") {
      refundAmount = log.args.amount
    }
  }

  const diff = refundAmount.sub(actualSpent)
  const diffGwei = new BN(diff.toString()).div(new BN(10 ** 9))
  const gasDiff = diffGwei.div(new BN(String(gasPrice)))
  return gasDiff
}

const randomPrice = function() {
  const rand = Math.floor(Math.random() * (999999999)) + 1
  return web3.utils.toWei(String(rand), "ether")
}

const randomGasPrice = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

describe('Provider - gas refund tests', function () {
  this.timeout(300000)

  const [admin, dataProvider, dataConsumerOwner, rando] = accounts
  const [adminPk, dataProviderPk, dataConsumerPk, randoPk] = privateKeys
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const fee = new BN(0.1 * ( 10 ** 9 ))
  const endpoint = web3.utils.asciiToHex("PRICE.BTC.USD.AVG")
  const salt = web3.utils.soliditySha3(web3.utils.randomHex(32), new Date())
  const gasPrice = 90 // gwei, 10 ** 9 done in contract
  const callbackFuncSig = web3.eth.abi.encodeFunctionSignature('recieveData(uint256,bytes32,bytes)')
  const callbackFuncNoCheckSig = web3.eth.abi.encodeFunctionSignature('recieveDataNoCheck(uint256,bytes32,bytes)')
  const callbackFuncBigFuncSig = web3.eth.abi.encodeFunctionSignature('recieveDataBigFunc(uint256,bytes32,bytes)')
  // const priceToSend = new BN("1")
  // const priceToSend = new BN("115792089237316195423570985008687907853269984665640564039457584007913129639935")
  const priceToSend = new BN("2000000000000000000000")
  const MAX_ACCEPTABLE_GAS_DIFF_SET_FROM_ZERO = 5000
  const MAX_ACCEPTABLE_GAS_DIFF_SET_NON_ZERO = 4500

  // deploy contracts before every test
  beforeEach(async function () {
    // admin deploy Token contract
    this.MockTokenContract = await MockToken.new("MockToken", "MockToken", initSupply, decimals, {from: admin})

    // admin deploy Router contract
    this.RouterContract = await Router.new(this.MockTokenContract.address, salt, {from: admin})

    // Deploy ConsumerLib library and link
    this.ConsumerLib = await ConsumerLib.new({from: admin})
    await MockConsumer.detectNetwork();
    await MockConsumer.link("ConsumerLib", this.ConsumerLib.address)
    await MockBadConsumerBadImpl.detectNetwork();
    await MockBadConsumerBadImpl.link("ConsumerLib", this.ConsumerLib.address)

    // dataConsumerOwner deploy Consumer contract
    this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})

    // dataConsumerOwner deploy bad Consumer contract
    this.MockBadConsumerBadImplContract = await MockBadConsumerBadImpl.new(this.RouterContract.address, {from: dataConsumerOwner})

  })

  /*
   * Tests in ideal scenario
   */
  describe('ideal scenario - enough tokens and allowance, dataProvider authorised, gas topped up', function () {
    // set up ideal scenario for these tests
    beforeEach(async function () {
      // increase Router allowance
      await this.MockConsumerContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})
      await this.MockBadConsumerBadImplContract.increaseRouterAllowance(new BN(999999 * ( 10 ** 9 )), {from: dataConsumerOwner})

      // add a dataProvider
      await this.MockConsumerContract.addDataProvider(dataProvider, fee, {from: dataConsumerOwner});
      await this.MockBadConsumerBadImplContract.addDataProvider(dataProvider, fee, {from: dataConsumerOwner});

      // Admin Transfer 100 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, new BN(100 * (10 ** decimals)), {from: admin})

      // Transfer 10 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN(10 * (10 ** decimals)), {from: dataConsumerOwner})
      await this.MockTokenContract.transfer(this.MockBadConsumerBadImplContract.address, new BN(10 * (10 ** decimals)), {from: dataConsumerOwner})

      const topupValue = web3.utils.toWei( "0.5", "ether" )
      await this.MockConsumerContract.topUpGas( dataProvider, { from: dataConsumerOwner, value: topupValue } )
      await this.MockBadConsumerBadImplContract.topUpGas( dataProvider, { from: dataConsumerOwner, value: topupValue } )
      // twice for big data test
      await this.MockBadConsumerBadImplContract.topUpGas( dataProvider, { from: dataConsumerOwner, value: topupValue } )
    })

    describe('consumer pays gas', function () {
      it( 'provider balance after >= balance before: compare balance', async function () {

        const requestNonce = await this.MockConsumerContract.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()

        const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt )
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const sig = await signData( reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const providerBalanceBefore = await web3.eth.getBalance( dataProvider )

        const gasPriceGwei = gasPrice * ( 10 ** 9 )
        const fr = await this.RouterContract.fulfillRequest( reqId, priceToSend, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const providerBalanceAfter = await web3.eth.getBalance( dataProvider )

        expect( providerBalanceAfter ).to.be.bignumber.gte( providerBalanceBefore );
      } )

      it( 'provider balance after >= balance before: compare diffs', async function () {

        const requestNonce = await this.MockConsumerContract.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()

        const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt )
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const sig = await signData( reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const providerBalanceBefore = await web3.eth.getBalance( dataProvider )

        const gasPriceGwei = gasPrice * ( 10 ** 9 )
        const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, priceToSend, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const providerBalanceAfter = await web3.eth.getBalance( dataProvider )

        const actualSpent = await calculateCost( [ fulfullReceipt ], 0 )
        const refundAmount = fulfullReceipt.receipt.logs[3].args.amount
        const diff = refundAmount.sub( actualSpent )

        // expected balance calculated from diff between actual cost and refund amount
        const expectedMinBalanceFromDiff = new BN( providerBalanceBefore ).add( diff )

        expect( providerBalanceAfter ).to.be.bignumber.gte( expectedMinBalanceFromDiff );
      } )

      it( 'provider balance after >= balance before: compare spends/balance', async function () {

        const requestNonce = await this.MockConsumerContract.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()

        const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt )
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const sig = await signData( reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const providerBalanceBefore = await web3.eth.getBalance( dataProvider )

        const gasPriceGwei = gasPrice * ( 10 ** 9 )
        const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, priceToSend, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const providerBalanceAfter = await web3.eth.getBalance( dataProvider )

        const actualSpent = await calculateCost( [ fulfullReceipt ], 0 )
        const refundAmount = fulfullReceipt.receipt.logs[3].args.amount

        // expected balance calculated from start balance, and costs/refund
        const expectedMinBalanceFromSpends = new BN( providerBalanceBefore ).sub( actualSpent ).add( refundAmount )

        expect( providerBalanceAfter ).to.be.bignumber.gte( expectedMinBalanceFromSpends );
      } )

      it( 'eth spent on gas > 0', async function () {

        const requestNonce = await this.MockConsumerContract.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()

        const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt )
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const sig = await signData( reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const gasPriceGwei = gasPrice * ( 10 ** 9 )
        const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, priceToSend, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const actualSpent = await calculateCost( [ fulfullReceipt ], 0 )

        expect( actualSpent ).to.be.bignumber.gt( new BN( 0 ) )
      } )

      it( 'refund > 0', async function () {

        const requestNonce = await this.MockConsumerContract.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()

        const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt )
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const sig = await signData( reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const gasPriceGwei = gasPrice * ( 10 ** 9 )
        const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, priceToSend, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const refundAmount = fulfullReceipt.receipt.logs[3].args.amount

        expect( refundAmount ).to.be.bignumber.gt( new BN( 0 ) )
      } )

      it( 'spent/refund diff >= 0', async function () {

        const requestNonce = await this.MockConsumerContract.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()

        const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt )
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const sig = await signData( reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const gasPriceGwei = gasPrice * ( 10 ** 9 )
        const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, priceToSend, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const actualSpent = await calculateCost( [ fulfullReceipt ], 0 )
        const refundAmount = fulfullReceipt.receipt.logs[3].args.amount
        const diff = refundAmount.sub( actualSpent )

        expect( diff ).to.be.bignumber.gte( new BN( 0 ) )
      } )

      it( 'gas consumed diff <= acceptable threshold', async function () {

        const requestNonce = await this.MockConsumerContract.getRequestNonce()
        const routerSalt = await this.RouterContract.getSalt()
        const gasPriceGwei = gasPrice * ( 10 ** 9 )

        const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt )
        await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const sig = await signData( reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, priceToSend, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const gasDiff = await estimateGasDiff(fulfullReceipt, gasPrice)

        expect( gasDiff ).to.be.bignumber.lte( new BN( MAX_ACCEPTABLE_GAS_DIFF_SET_FROM_ZERO ) )

      } )

      it( 'provider end balance always >= start balance: 20 iterations', async function () {
        const routerSalt = await this.RouterContract.getSalt()
        const providerBalanceStart = await web3.eth.getBalance( dataProvider )

        for(let i = 0; i < 20; i += 1) {
          // simulate gas price fluctuation
          const randGas = randomGasPrice(50, 120)
          const requestNonce = await this.MockConsumerContract.getRequestNonce()
          const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt )
          await this.MockConsumerContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )

          const price = randomPrice()
          const gasPriceGwei = randGas * ( 10 ** 9 )

          const sig = await signData( reqId, price, this.MockConsumerContract.address, dataProviderPk )
          const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, price, sig.signature, {
            from: dataProvider,
            gasPrice: gasPriceGwei
          } )

          const providerBalanceAfter = await web3.eth.getBalance( dataProvider )
          expect( providerBalanceAfter ).to.be.bignumber.gte( providerBalanceStart );
        }

        const providerBalanceEnd = await web3.eth.getBalance( dataProvider )
        expect( providerBalanceEnd ).to.be.bignumber.gte( providerBalanceStart );
      })

      it( 'spend/refund diff always >= 0: 50 iterations', async function () {
        const routerSalt = await this.RouterContract.getSalt()

        for(let i = 0; i < 50; i += 1) {
          // simulate gas price fluctuation
          const randGas = randomGasPrice(10, 20)
          const requestNonce = await this.MockConsumerContract.getRequestNonce()
          const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt )
          await this.MockConsumerContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )

          const price = randomPrice()
          const gasPriceGwei = randGas * ( 10 ** 9 )

          const sig = await signData( reqId, price, this.MockConsumerContract.address, dataProviderPk )
          const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, price, sig.signature, {
            from: dataProvider,
            gasPrice: gasPriceGwei
          } )

          const actualSpent = await calculateCost( [ fulfullReceipt ], 0 )
          const refundAmount = fulfullReceipt.receipt.logs[3].args.amount
          const diff = refundAmount.sub( actualSpent )

          expect( diff ).to.be.bignumber.gte( new BN( 0 ) )

          // check price
          const retPrice = await this.MockConsumerContract.price()
          expect(retPrice).to.be.bignumber.equal(price)
        }
      })

      it( 'gas diff is acceptable under normal conditions: 50 iterations', async function () {
        const routerSalt = await this.RouterContract.getSalt()

        for(let i = 0; i < 50; i += 1) {
          // simulate gas price fluctuation
          const randGas = randomGasPrice(10, 20)
          const requestNonce = await this.MockConsumerContract.getRequestNonce()
          const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt )
          await this.MockConsumerContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )

          const price = randomPrice()
          const gasPriceGwei = randGas * ( 10 ** 9 )

          const sig = await signData( reqId, price, this.MockConsumerContract.address, dataProviderPk )
          const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, price, sig.signature, {
            from: dataProvider,
            gasPrice: gasPriceGwei
          } )

          const gasDiff = await estimateGasDiff(fulfullReceipt, randGas)

          // actual gas used will invariably be slightly more than the estimate in the Router
          // smart contract. Ensure it's never above an acceptable threshold for a "normal"
          // request fulfilment
          if(i === 0) {
            // setting a value from 0 to non zero will cost more gas
            expect( gasDiff ).to.be.bignumber.lte( new BN( MAX_ACCEPTABLE_GAS_DIFF_SET_FROM_ZERO ) )
          } else {
            expect( gasDiff ).to.be.bignumber.lte( new BN( MAX_ACCEPTABLE_GAS_DIFF_SET_NON_ZERO ) )
          }

          // check price
          const retPrice = await this.MockConsumerContract.price()
          expect(retPrice).to.be.bignumber.equal(price)
        }
      })

      describe('bad consumer implementation', function () {
        it( 'requestDataNoCheck spend/refund diff always >= 0: 50 iterations', async function () {
          const routerSalt = await this.RouterContract.getSalt()

          for(let i = 0; i < 50; i += 1) {
            // simulate gas price fluctuation
            const randGas = randomGasPrice(10, 20)
            const requestNonce = await this.MockBadConsumerBadImplContract.getRequestNonce()
            const reqId = generateRequestId( this.MockBadConsumerBadImplContract.address, requestNonce, dataProvider, routerSalt )
            await this.MockBadConsumerBadImplContract.requestDataNoCheck( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )

            const price = randomPrice()
            const gasPriceGwei = randGas * ( 10 ** 9 )

            const sig = await signData( reqId, price, this.MockBadConsumerBadImplContract.address, dataProviderPk )
            const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, price, sig.signature, {
              from: dataProvider,
              gasPrice: gasPriceGwei
            } )

            const actualSpent = await calculateCost( [ fulfullReceipt ], 0 )
            const refundAmount = fulfullReceipt.receipt.logs[3].args.amount
            const diff = refundAmount.sub( actualSpent )

            expect( diff ).to.be.bignumber.gte( new BN( 0 ) )

            // check price
            const retPrice = await this.MockBadConsumerBadImplContract.price()
            expect(retPrice).to.be.bignumber.equal(price)
          }
        })

        it( 'requestDataBigFunc spend/refund diff always >= 0: 50 iterations', async function () {

          const routerSalt = await this.RouterContract.getSalt()

          for(let i = 0; i < 50; i += 1) {
            // simulate gas price fluctuation
            const randGas = randomGasPrice(10, 20)
            const requestNonce = await this.MockBadConsumerBadImplContract.getRequestNonce()
            const reqId = generateRequestId( this.MockBadConsumerBadImplContract.address, requestNonce, dataProvider, routerSalt )

            // calling this should cost around 200000 gas
            await this.MockBadConsumerBadImplContract.requestDataBigFunc( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )

            const price = randomPrice()
            const gasPriceGwei = randGas * ( 10 ** 9 )

            const sig = await signData( reqId, price, this.MockBadConsumerBadImplContract.address, dataProviderPk )
            const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, price, sig.signature, {
              from: dataProvider,
              gasPrice: gasPriceGwei
            } )

            const actualSpent = await calculateCost( [ fulfullReceipt ], 0 )
            const refundAmount = fulfullReceipt.receipt.logs[3].args.amount
            const diff = refundAmount.sub( actualSpent )

            expect( diff ).to.be.bignumber.gte( new BN( 0 ) )

            // check price
            const retPrice = await this.MockBadConsumerBadImplContract.price()
            expect(retPrice).to.be.bignumber.equal(price)
          }
        })
      })
    })

    describe('provider pays gas', function () {
      it( 'consumer balance on Router never deducted: 20 iterations', async function () {
        const routerSalt = await this.RouterContract.getSalt()

        // set provider to pay gas for data fulfilment
        await this.RouterContract.setProviderPaysGas(true, { from: dataProvider })

        for(let i = 0; i < 20; i += 1) {
          // simulate gas price fluctuation
          const randGas = randomGasPrice(10, 20)
          const requestNonce = await this.MockConsumerContract.getRequestNonce()
          const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt )
          await this.MockConsumerContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )

          const price = randomPrice()
          const gasPriceGwei = randGas * ( 10 ** 9 )

          const sig = await signData( reqId, price, this.MockConsumerContract.address, dataProviderPk )

          const consumerRouterBalanceBefore = await this.RouterContract.getGasDepositsForConsumer( dataConsumerOwner )
          const consumerProviderRouterBalanceBefore = await this.RouterContract.getGasDepositsForConsumerProviders( dataConsumerOwner, dataProvider)
          const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, price, sig.signature, {
            from: dataProvider,
            gasPrice: gasPriceGwei
          } )

          const consumerRouterBalanceAfter = await this.RouterContract.getGasDepositsForConsumer( dataConsumerOwner )
          const consumerProviderRouterBalanceAfter = await this.RouterContract.getGasDepositsForConsumerProviders( dataConsumerOwner, dataProvider )

          expect( consumerRouterBalanceAfter ).to.be.bignumber.equal( consumerRouterBalanceBefore )
          expect( consumerProviderRouterBalanceAfter ).to.be.bignumber.equal( consumerProviderRouterBalanceBefore )

        }
      })

      it( 'provider balance deducted: 20 iterations', async function () {
        const routerSalt = await this.RouterContract.getSalt()

        // set provider to pay gas for data fulfilment
        await this.RouterContract.setProviderPaysGas(true, { from: dataProvider })

        for(let i = 0; i < 20; i += 1) {
          // simulate gas price fluctuation
          const randGas = randomGasPrice(10, 20)
          const requestNonce = await this.MockConsumerContract.getRequestNonce()
          const reqId = generateRequestId( this.MockConsumerContract.address, requestNonce, dataProvider, routerSalt )
          await this.MockConsumerContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )

          const price = randomPrice()
          const gasPriceGwei = randGas * ( 10 ** 9 )

          const sig = await signData( reqId, price, this.MockConsumerContract.address, dataProviderPk )

          const providerBalanceBefore = await web3.eth.getBalance( dataProvider )

          const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, price, sig.signature, {
            from: dataProvider,
            gasPrice: gasPriceGwei
          } )

          const providerBalanceAfter = await web3.eth.getBalance( dataProvider )

          expect( providerBalanceAfter ).to.be.bignumber.lt( providerBalanceBefore )

        }
      })
    })

  })

})
