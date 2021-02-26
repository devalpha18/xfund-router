const { Model } = require("sequelize")

module.exports = (sequelize, DataTypes) => {
  class Jobs extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Jobs.init(
    {
      requestId: DataTypes.STRING,
      requestTxHash: DataTypes.STRING,
      requestHeight: DataTypes.INTEGER,
      fulfillTxHash: DataTypes.STRING,
      heightToFulfill: DataTypes.INTEGER,
      cancelTxHash: DataTypes.STRING,
      cancelHeight: DataTypes.INTEGER,
      endpoint: DataTypes.STRING,
      price: DataTypes.STRING,
      dataConsumer: DataTypes.STRING,
      fee: DataTypes.BIGINT,
      gas: DataTypes.BIGINT,
      requestStatus: DataTypes.INTEGER,
      requestCompleteHeight: DataTypes.INTEGER,
      statusReason: DataTypes.STRING,
      gasPayer: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Jobs",
    },
  )
  return Jobs
}
