module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface
      .createTable("SupportedPairs", {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        name: {
          type: Sequelize.STRING,
        },
        base: {
          type: Sequelize.STRING,
        },
        target: {
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
      .then(() => queryInterface.addIndex("SupportedPairs", ["name"], { unique: true }))
      .then(() => queryInterface.addIndex("SupportedPairs", ["base"]))
      .then(() => queryInterface.addIndex("SupportedPairs", ["target"]))
      .then(() => queryInterface.addIndex("SupportedPairs", ["base", "target"]))
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("SupportedPairs")
  },
}
