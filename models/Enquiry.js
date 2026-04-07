const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Enquiry = sequelize.define('Enquiry', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  phone: { type: DataTypes.STRING(15), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: true },
  goal: { type: DataTypes.STRING(200), allowNull: true },
  source: {
    type: DataTypes.ENUM('Walk-in', 'Instagram', 'Facebook', 'WhatsApp', 'Reference', 'Other'),
    defaultValue: 'Walk-in',
  },
  follow_up_date: { type: DataTypes.DATEONLY, allowNull: true },
  status: {
    type: DataTypes.ENUM('New', 'Interested', 'Not Interested', 'Joined', 'Follow-up'),
    defaultValue: 'New',
  },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'enquiries',
});

module.exports = Enquiry;
