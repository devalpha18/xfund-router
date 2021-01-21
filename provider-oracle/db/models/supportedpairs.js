'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class SupportedPairs extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  };
  SupportedPairs.init({
    name: DataTypes.STRING,
    base: DataTypes.STRING,
    target: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'SupportedPairs',
  });
  return SupportedPairs;
};