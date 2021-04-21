module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface
      .createTable("Jobs", {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        requestId: {
          type: Sequelize.STRING,
        },
        requestHeight: {
          type: Sequelize.INTEGER,
        },
        requestTxHash: {
          type: Sequelize.STRING,
        },
        fulfillTxHash: {
          type: Sequelize.STRING,
        },
        heightToFulfill: {
          type: Sequelize.INTEGER,
        },
        endpoint: {
          type: Sequelize.STRING,
        },
        price: {
          type: Sequelize.STRING,
        },
        consumer: {
          type: Sequelize.STRING,
        },
        fee: {
          type: Sequelize.BIGINT,
        },
        gasUsed: {
          type: Sequelize.BIGINT,
        },
        gasPrice: {
          type: Sequelize.BIGINT,
        },
        requestStatus: {
          type: Sequelize.INTEGER,
        },
        requestCompleteHeight: {
          type: Sequelize.INTEGER,
        },
        statusReason: {
          type: Sequelize.STRING,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      })
      .then(() => queryInterface.addIndex("Jobs", ["requestTxHash"], { unique: true }))
      .then(() => queryInterface.addIndex("Jobs", ["fulfillTxHash"], { unique: true }))
      .then(() => queryInterface.addIndex("Jobs", ["requestId"], { unique: true }))
      .then(() => queryInterface.addIndex("Jobs", ["consumer"]))
      .then(() => queryInterface.addIndex("Jobs", ["requestHeight"]))
      .then(() => queryInterface.addIndex("Jobs", ["heightToFulfill"]))
      .then(() => queryInterface.addIndex("Jobs", ["heightToFulfill", "requestStatus"]))
      .then(() => queryInterface.addIndex("Jobs", ["requestStatus"]))
      .then(() => queryInterface.addIndex("Jobs", ["requestCompleteHeight"]))
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Jobs")
  },
}
