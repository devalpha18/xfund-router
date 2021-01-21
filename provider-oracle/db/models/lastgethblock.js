const { Model } = require("sequelize")

module.exports = (sequelize, DataTypes) => {
  class LastGethBlock extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  LastGethBlock.init(
    {
      event: DataTypes.STRING,
      height: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "LastGethBlock",
    },
  )
  return LastGethBlock
}
