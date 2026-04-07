const { Payment, Member, Attendance, Plan } = require('../models');
const sequelize = require('../config/database');
const { Op, fn, col, literal } = require('sequelize');

const index = async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month || now.getMonth() + 1);
  const year = parseInt(req.query.year || now.getFullYear());

  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  // Revenue by payment mode
  const revenueByMode = await Payment.findAll({
    attributes: ['payment_mode', [fn('SUM', col('paid_amount')), 'total'], [fn('COUNT', col('id')), 'count']],
    where: { payment_date: { [Op.between]: [startDate, endDate] } },
    group: ['payment_mode'],
    raw: true,
  });

  const totalRevenue = revenueByMode.reduce((s, r) => s + parseFloat(r.total || 0), 0);
  const totalDue = await Payment.sum('due_amount', { where: { payment_date: { [Op.between]: [startDate, endDate] } } }) || 0;

  // Member stats
  const newMembers = await Member.count({ where: { join_date: { [Op.between]: [startDate, endDate] } } });
  const activeMembers = await Member.count({ where: { status: 'active', expiry_date: { [Op.gte]: today } } });
  const expiredMembers = await Member.count({ where: { expiry_date: { [Op.lt]: today } } });
  const renewals = await Payment.count({
    where: {
      payment_date: { [Op.between]: [startDate, endDate] },
      literal: sequelize.literal('member_id IN (SELECT id FROM members WHERE join_date < \'' + startDate + '\')'),
    },
  }).catch(() => 0);

  // Attendance per day
  const attendanceData = await Attendance.findAll({
    attributes: ['date', [fn('COUNT', col('id')), 'count']],
    where: { date: { [Op.between]: [startDate, endDate] } },
    group: ['date'],
    order: [['date', 'ASC']],
    raw: true,
  });

  const totalAttendance = attendanceData.reduce((s, r) => s + parseInt(r.count || 0), 0);
  const avgAttendance = attendanceData.length ? Math.round(totalAttendance / attendanceData.length) : 0;

  // Top plans
  const topPlans = await Payment.findAll({
    attributes: ['plan_id', [fn('COUNT', col('Payment.id')), 'count'], [fn('SUM', col('paid_amount')), 'revenue']],
    include: [{ association: 'plan', attributes: ['name'] }],
    where: { payment_date: { [Op.between]: [startDate, endDate] } },
    group: ['plan_id', 'plan.id', 'plan.name'],
    order: [[fn('COUNT', col('Payment.id')), 'DESC']],
    limit: 5,
  });

  res.render('pages/reports', {
    title: 'Monthly Reports',
    month, year,
    revenueByMode,
    totalRevenue,
    totalDue,
    newMembers, activeMembers, expiredMembers, renewals,
    attendanceData: JSON.stringify(attendanceData),
    totalAttendance, avgAttendance,
    topPlans,
  });
};

module.exports = { index };
