const { accounts, contract, web3, privateKeys } = require('@openzeppelin/test-environment')


const {
  BN,           // Big Number support
  expectRevert,
  expectEvent,
} = require('@openzeppelin/test-helpers')

const { expect } = require('chai')

const {
  signData,
  generateSigMsg,
  getReqIdFromReceipt,
  generateRequestId,
  calculateCost,
  dumpReceiptGasInfo,
  estimateGasDiff,
  randomPrice,
  randomGasPrice,
  sleepFor,
} = require("./helpers/utils")

const MockToken = contract.fromArtifact('MockToken') // Loads a compiled contract
const Router = contract.fromArtifact('Router') // Loads a compiled contract
const MockConsumer = contract.fromArtifact('MockConsumer') // Loads a compiled contract
const MockBadConsumerBigReceive = contract.fromArtifact('MockBadConsumerBigReceive') // Loads a compiled contract
const ConsumerLib = contract.fromArtifact('ConsumerLib') // Loads a compiled contract

describe('Provider - gas refund tests', function () {
  this.timeout(300000)

  const [admin, dataProvider, dataConsumerOwner, rando] = accounts
  const [adminPk, dataProviderPk, dataConsumerPk, randoPk] = privateKeys
  const decimals = 9
  const initSupply = 1000 * (10 ** decimals)
  const fee = new BN(0.1 * ( 10 ** 9 ))
  const endpoint = web3.utils.asciiToHex("PRICE.BTC.USD.AVG")
  const gasPrice = 90 // gwei, 10 ** 9 done in contract
  // const priceToSend = new BN("1")
  // const priceToSend = new BN("115792089237316195423570985008687907853269984665640564039457584007913129639935")
  const priceToSend = new BN("2000000000000000000000")
  const MAX_ACCEPTABLE_GAS_DIFF_SET_FROM_ZERO = 150
  const MAX_ACCEPTABLE_GAS_DIFF_SET_NON_ZERO = 100

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
    await MockBadConsumerBigReceive.detectNetwork();
    await MockBadConsumerBigReceive.link("ConsumerLib", this.ConsumerLib.address)

    // dataConsumerOwner deploy Consumer contract
    this.MockConsumerContract = await MockConsumer.new(this.RouterContract.address, {from: dataConsumerOwner})

    // dataConsumerOwner deploy bad Consumer contract
    this.MockBadConsumerBigReceiveContract = await MockBadConsumerBigReceive.new(this.RouterContract.address, {from: dataConsumerOwner})

    // dataProvider registers on Router
    await this.RouterContract.registerAsProvider(fee, false, {from: dataProvider })
  })

  /*
   * Tests in ideal scenario
   */
  describe('ideal scenario - enough tokens and allowance, dataProvider authorised, gas topped up', function () {
    // set up ideal scenario for these tests
    beforeEach(async function () {
      // increase Router allowance
      await this.MockConsumerContract.setRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), true, {from: dataConsumerOwner})
      await this.MockBadConsumerBigReceiveContract.setRouterAllowance( new BN( 999999 * ( 10 ** 9 ) ), true, {from: dataConsumerOwner})

      // add a dataProvider
      await this.MockConsumerContract.addRemoveDataProvider(dataProvider, fee, false, {from: dataConsumerOwner});
      await this.MockBadConsumerBigReceiveContract.addRemoveDataProvider(dataProvider, fee, false, {from: dataConsumerOwner});

      // Admin Transfer 100 Tokens to dataConsumerOwner
      await this.MockTokenContract.transfer(dataConsumerOwner, new BN(100 * (10 ** decimals)), {from: admin})

      // Transfer 10 Tokens to MockConsumerContract from dataConsumerOwner
      await this.MockTokenContract.transfer(this.MockConsumerContract.address, new BN(10 * (10 ** decimals)), {from: dataConsumerOwner})
      await this.MockTokenContract.transfer(this.MockBadConsumerBigReceiveContract.address, new BN(10 * (10 ** decimals)), {from: dataConsumerOwner})

      const topupValue = web3.utils.toWei( "0.5", "ether" )
      await this.MockConsumerContract.topUpGas( dataProvider, { from: dataConsumerOwner, value: topupValue } )
      await this.MockBadConsumerBigReceiveContract.topUpGas( dataProvider, { from: dataConsumerOwner, value: topupValue } )
      // twice for big data test
      await this.MockBadConsumerBigReceiveContract.topUpGas( dataProvider, { from: dataConsumerOwner, value: topupValue } )
    })

    describe('consumer pays gas', function () {
      it( 'provider balance after >= balance before: compare balance', async function () {

        const receipt = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )

        const reqId = getReqIdFromReceipt(receipt)

        const sig = await signData( reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const providerBalanceBefore = await web3.eth.getBalance( dataProvider )

        const gasPriceGwei = gasPrice * ( 10 ** 9 )
        const fr = await this.RouterContract.fulfillRequest( reqId, priceToSend, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        // await dumpReceiptGasInfo(fr, gasPrice)

        const providerBalanceAfter = await web3.eth.getBalance( dataProvider )

        expect( providerBalanceAfter ).to.be.bignumber.gte( providerBalanceBefore );
      } )

      it( 'provider balance after >= balance before: compare diffs', async function () {

        const receipt = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        const reqId = getReqIdFromReceipt(receipt)

        const sig = await signData( reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const providerBalanceBefore = await web3.eth.getBalance( dataProvider )

        const gasPriceGwei = gasPrice * ( 10 ** 9 )
        const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, priceToSend, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const providerBalanceAfter = await web3.eth.getBalance( dataProvider )

        const actualSpent = await calculateCost( [ fulfullReceipt ], 0 )
        const refundAmount = fulfullReceipt.receipt.logs[1].args.amount

        const diff = refundAmount.sub( actualSpent )

        // expected balance calculated from diff between actual cost and refund amount
        const expectedMinBalanceFromDiff = new BN( providerBalanceBefore ).add( diff )

        expect( providerBalanceAfter ).to.be.bignumber.gte( expectedMinBalanceFromDiff );
      } )

      it( 'provider balance after >= balance before: compare spends/balance', async function () {

        const receipt = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        const reqId = getReqIdFromReceipt(receipt)

        const sig = await signData( reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const providerBalanceBefore = await web3.eth.getBalance( dataProvider )

        const gasPriceGwei = gasPrice * ( 10 ** 9 )
        const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, priceToSend, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const providerBalanceAfter = await web3.eth.getBalance( dataProvider )

        const actualSpent = await calculateCost( [ fulfullReceipt ], 0 )
        const refundAmount = fulfullReceipt.receipt.logs[1].args.amount

        // expected balance calculated from start balance, and costs/refund
        const expectedMinBalanceFromSpends = new BN( providerBalanceBefore ).sub( actualSpent ).add( refundAmount )

        expect( providerBalanceAfter ).to.be.bignumber.gte( expectedMinBalanceFromSpends );
      } )

      it( 'eth spent on gas > 0', async function () {
        const receipt = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        const reqId = getReqIdFromReceipt(receipt)

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

        const receipt = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        const reqId = getReqIdFromReceipt(receipt)

        const sig = await signData( reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const gasPriceGwei = gasPrice * ( 10 ** 9 )
        const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, priceToSend, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const refundAmount = fulfullReceipt.receipt.logs[1].args.amount

        expect( refundAmount ).to.be.bignumber.gt( new BN( 0 ) )
      } )

      it( 'spent/refund diff >= 0', async function () {
        const receipt = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        const reqId = getReqIdFromReceipt(receipt)

        const sig = await signData( reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const gasPriceGwei = gasPrice * ( 10 ** 9 )
        const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, priceToSend, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const actualSpent = await calculateCost( [ fulfullReceipt ], 0 )
        const refundAmount = fulfullReceipt.receipt.logs[1].args.amount
        const diff = refundAmount.sub( actualSpent )

        expect( diff ).to.be.bignumber.gte( new BN( 0 ) )
      } )

      it( `gas consumed diff <= acceptable threshold (<= ${MAX_ACCEPTABLE_GAS_DIFF_SET_FROM_ZERO}) - first time`, async function () {

        const gasPriceGwei = gasPrice * ( 10 ** 9 )

        const receipt = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        const reqId = getReqIdFromReceipt(receipt)

        const sig = await signData( reqId, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, priceToSend, sig.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const gasDiff = await estimateGasDiff(fulfullReceipt, gasPrice)

        // console.log("gasDiff", gasDiff.toString())

        expect( gasDiff ).to.be.bignumber.lte( new BN( MAX_ACCEPTABLE_GAS_DIFF_SET_FROM_ZERO ) )

      } )

      it( `gas consumed diff <= acceptable threshold (<= ${MAX_ACCEPTABLE_GAS_DIFF_SET_NON_ZERO}) - second time`, async function () {

        const gasPriceGwei = gasPrice * ( 10 ** 9 )

        const receipt1 = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        const reqId1 = getReqIdFromReceipt(receipt1)
        const sig1 = await signData( reqId1, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        await this.RouterContract.fulfillRequest( reqId1, priceToSend, sig1.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const receipt2 = await this.MockConsumerContract.requestData( dataProvider, endpoint, gasPrice, { from: dataConsumerOwner } )
        const reqId2 = getReqIdFromReceipt(receipt2)
        const sig2 = await signData( reqId2, priceToSend, this.MockConsumerContract.address, dataProviderPk )

        const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId2, priceToSend, sig2.signature, {
          from: dataProvider,
          gasPrice: gasPriceGwei
        } )

        const gasDiff = await estimateGasDiff(fulfullReceipt, gasPrice)

        expect( gasDiff ).to.be.bignumber.lte( new BN( MAX_ACCEPTABLE_GAS_DIFF_SET_NON_ZERO ) )

      } )

      it( 'provider end balance always >= start balance: 20 iterations', async function () {
        const providerBalanceStart = await web3.eth.getBalance( dataProvider )

        for(let i = 0; i < 20; i += 1) {
          // simulate gas price fluctuation
          const randGas = randomGasPrice(50, 120)
          const receipt = await this.MockConsumerContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )
          const reqId = getReqIdFromReceipt(receipt)

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
        for(let i = 0; i < 50; i += 1) {
          // simulate gas price fluctuation
          const randGas = randomGasPrice(10, 20)
          const receipt = await this.MockConsumerContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )
          const reqId = getReqIdFromReceipt(receipt)

          const price = randomPrice()
          const gasPriceGwei = randGas * ( 10 ** 9 )

          const sig = await signData( reqId, price, this.MockConsumerContract.address, dataProviderPk )
          const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, price, sig.signature, {
            from: dataProvider,
            gasPrice: gasPriceGwei
          } )

          const actualSpent = await calculateCost( [ fulfullReceipt ], 0 )
          const refundAmount = fulfullReceipt.receipt.logs[1].args.amount
          const diff = refundAmount.sub( actualSpent )

          expect( diff ).to.be.bignumber.gte( new BN( 0 ) )

          // check price
          const retPrice = await this.MockConsumerContract.price()
          expect(retPrice).to.be.bignumber.equal(price)
        }
      })

      it( `gas diff is acceptable (1st <= ${MAX_ACCEPTABLE_GAS_DIFF_SET_FROM_ZERO}, after 1st <= ${MAX_ACCEPTABLE_GAS_DIFF_SET_NON_ZERO})under normal conditions: 50 iterations`, async function () {
        for(let i = 0; i < 50; i += 1) {
          // simulate gas price fluctuation
          const randGas = randomGasPrice(10, 20)
          const receipt = await this.MockConsumerContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )
          const reqId = getReqIdFromReceipt(receipt)

          const price = randomPrice()
          const gasPriceGwei = randGas * ( 10 ** 9 )

          const sig = await signData( reqId, price, this.MockConsumerContract.address, dataProviderPk )
          const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, price, sig.signature, {
            from: dataProvider,
            gasPrice: gasPriceGwei
          } )

          // await dumpReceiptGasInfo(fulfullReceipt, randGas)
          const gasDiff = await estimateGasDiff(fulfullReceipt, randGas)
          // console.log("gasDiff OUT", gasDiff.toString())

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
        it( 'requestData spend/refund diff always >= 0 when receiveData func is big: 50 iterations', async function () {
          for(let i = 0; i < 50; i += 1) {
            // simulate gas price fluctuation
            const randGas = randomGasPrice(10, 20)

            // calling this should cost around 200000 gas
            const receipt = await this.MockBadConsumerBigReceiveContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )
            const reqId = getReqIdFromReceipt(receipt)

            const price = randomPrice()
            const gasPriceGwei = randGas * ( 10 ** 9 )

            const sig = await signData( reqId, price, this.MockBadConsumerBigReceiveContract.address, dataProviderPk )
            const fulfullReceipt = await this.RouterContract.fulfillRequest( reqId, price, sig.signature, {
              from: dataProvider,
              gasPrice: gasPriceGwei
            } )

            const actualSpent = await calculateCost( [ fulfullReceipt ], 0 )
            const refundAmount = fulfullReceipt.receipt.logs[1].args.amount
            const diff = refundAmount.sub( actualSpent )

            // await dumpReceiptGasInfo(fulfullReceipt, randGas)
            const gasDiff = await estimateGasDiff(fulfullReceipt, randGas)
            // console.log("gasDiff OUT", gasDiff.toString())

            expect( diff ).to.be.bignumber.gte( new BN( 0 ) )

            // check price
            const retPrice = await this.MockBadConsumerBigReceiveContract.price()
            expect(retPrice).to.be.bignumber.equal(price)
          }
        })
      })
    })

    describe('provider pays gas', function () {
      it( 'consumer balance on Router never deducted: 20 iterations', async function () {
        // set provider to pay gas for data fulfilment
        await this.RouterContract.setProviderPaysGas(true, { from: dataProvider })

        for(let i = 0; i < 20; i += 1) {
          // simulate gas price fluctuation
          const randGas = randomGasPrice(10, 20)
          const receipt = await this.MockConsumerContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )
          const reqId = getReqIdFromReceipt(receipt)

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
        // set provider to pay gas for data fulfilment
        await this.RouterContract.setProviderPaysGas(true, { from: dataProvider })

        for(let i = 0; i < 20; i += 1) {
          // simulate gas price fluctuation
          const randGas = randomGasPrice(10, 20)

          const receipt = await this.MockConsumerContract.requestData( dataProvider, endpoint, randGas, { from: dataConsumerOwner } )
          const reqId = getReqIdFromReceipt(receipt)

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
