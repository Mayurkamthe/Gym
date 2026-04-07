const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Member = require('./Member');
const Plan = require('./Plan');
const Offer = require('./Offer');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  invoice_no: { type: DataTypes.STRING(20), unique: true },
  member_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'members', key: 'id' } },
  plan_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'plans', key: 'id' } },
  offer_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'offers', key: 'id' } },
  original_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  discount_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  final_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  paid_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  due_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  payment_mode: { type: DataTypes.ENUM('Cash', 'UPI', 'Card', 'Bank Transfer'), defaultValue: 'Cash' },
  payment_date: { type: DataTypes.DATEONLY, allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  transaction_ref: { type: DataTypes.STRING(100), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('paid', 'partial', 'pending'), defaultValue: 'paid' },
}, {
  tableName: 'payments',
  hooks: {
    beforeCreate: async (payment) => {
      if (!payment.invoice_no) {
        const count = await Payment.count();
        const date = new Date();
        payment.invoice_no = `INV${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(count + 1).padStart(4, '0')}`;
      }
    },
  },
});

Payment.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });
Payment.belongsTo(Plan, { foreignKey: 'plan_id', as: 'plan' });
Payment.belongsTo(Offer, { foreignKey: 'offer_id', as: 'offer' });
Member.hasMany(Payment, { foreignKey: 'member_id', as: 'payments' });

module.exports = Payment;
