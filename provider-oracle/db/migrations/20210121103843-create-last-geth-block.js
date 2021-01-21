module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface
      .createTable("LastGethBlocks", {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        event: {
          type: Sequelize.STRING,
        },
        height: {
          type: Sequelize.INTEGER,
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
      .then(() => queryInterface.addIndex("LastGethBlocks", ["event"], { unique: true }))
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("LastGethBlocks")
  },
}
