const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Offer = sequelize.define('Offer', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  type: { type: DataTypes.ENUM('flat', 'percentage'), allowNull: false },
  value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  valid_from: { type: DataTypes.DATEONLY, allowNull: false },
  valid_to: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  description: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'offers',
});

module.exports = Offer;
