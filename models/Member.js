const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Plan = require('./Plan');

const Member = sequelize.define('Member', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  member_id: { type: DataTypes.STRING(20), unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  phone: { type: DataTypes.STRING(15), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  dob: { type: DataTypes.DATEONLY, allowNull: true },
  gender: { type: DataTypes.ENUM('Male', 'Female', 'Other'), defaultValue: 'Male' },
  join_date: { type: DataTypes.DATEONLY, allowNull: false },
  expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
  plan_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'plans', key: 'id' } },
  fingerprint_id: { type: DataTypes.STRING(50), allowNull: true },
  fingerprint_data: { type: DataTypes.TEXT('long'), allowNull: true },  // Base64 fingerprint template
  fingerprint_enrolled_at: { type: DataTypes.DATE, allowNull: true },
  fingerprint_device: { type: DataTypes.STRING(50), allowNull: true }, // IP:PORT or COM:BAUD that enrolled this member
  photo: { type: DataTypes.STRING(255), allowNull: true },
  emergency_contact: { type: DataTypes.STRING(15), allowNull: true },
  blood_group: {
    type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
    allowNull: true,
  },
  status: { type: DataTypes.ENUM('active', 'expired', 'suspended'), defaultValue: 'active' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'members',
  hooks: {
    beforeCreate: async (member) => {
      if (!member.member_id) {
        const count = await Member.count();
        member.member_id = `GYM${String(count + 1).padStart(4, '0')}`;
      }
    },
  },
});

Member.belongsTo(Plan, { foreignKey: 'plan_id', as: 'plan' });
Plan.hasMany(Member, { foreignKey: 'plan_id', as: 'members' });

module.exports = Member;
