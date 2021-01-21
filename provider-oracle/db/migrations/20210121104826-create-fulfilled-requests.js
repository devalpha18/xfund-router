module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('FulfilledRequests', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      requestId: {
        type: Sequelize.STRING
      },
      requestTxHash: {
        type: Sequelize.STRING
      },
      fulfillTxHash: {
        type: Sequelize.STRING
      },
      endpoint: {
        type: Sequelize.STRING
      },
      price: {
        type: Sequelize.STRING
      },
      dataConsumer: {
        type: Sequelize.STRING
      },
      fee: {
        type: Sequelize.STRING
      },
      gas: {
        type: Sequelize.STRING
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
      .then(() => queryInterface.addIndex("FulfilledRequests", ["requestTxHash"], { unique: true }))
      .then(() => queryInterface.addIndex("FulfilledRequests", ["fulfillTxHash"], { unique: true }))
      .then(() => queryInterface.addIndex("FulfilledRequests", ["requestId"], { unique: true }))
      .then(() => queryInterface.addIndex("FulfilledRequests", ["dataConsumer"]))
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('FulfilledRequests')
  }
}