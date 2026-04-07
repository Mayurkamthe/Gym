const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Member = require('./Member');

const Attendance = sequelize.define('Attendance', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  member_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'members', key: 'id' } },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  check_in: { type: DataTypes.TIME, allowNull: true },
  check_out: { type: DataTypes.TIME, allowNull: true },
  device_ip: { type: DataTypes.STRING(20), allowNull: true },
  source: { type: DataTypes.ENUM('biometric', 'manual'), defaultValue: 'manual' },
}, {
  tableName: 'attendance',
  indexes: [{ unique: true, fields: ['member_id', 'date'] }],
});

Attendance.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });
Member.hasMany(Attendance, { foreignKey: 'member_id', as: 'attendances' });

module.exports = Attendance;
