const sequelize = require('../config/database');

const Enquiry = require('./Enquiry');
const Plan = require('./Plan');
const Offer = require('./Offer');
const Member = require('./Member');
const Payment = require('./Payment');
const Attendance = require('./Attendance');

module.exports = { sequelize, Enquiry, Plan, Offer, Member, Payment, Attendance };
