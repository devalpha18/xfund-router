const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FulfilledRequests extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  FulfilledRequests.init({
    requestId: DataTypes.STRING,
    requestTxHash: DataTypes.STRING,
    fulfillTxHash: DataTypes.STRING,
    endpoint: DataTypes.STRING,
    price: DataTypes.STRING,
    dataConsumer: DataTypes.STRING,
    fee: DataTypes.STRING,
    gas: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'FulfilledRequests',
  })
  return FulfilledRequests
}
