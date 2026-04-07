const { Member, Payment, Attendance, Enquiry } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const sequelize = require('../config/database');

const dashboard = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0];

    // Stats
    const totalMembers = await Member.count();
    const activeMembers = await Member.count({ where: { status: 'active', expiry_date: { [Op.gte]: today } } });
    const expiredMembers = await Member.count({ where: { expiry_date: { [Op.lt]: today } } });
    const todayAttendance = await Attendance.count({ where: { date: today } });

    // Monthly revenue
    const revenueResult = await Payment.findOne({
      attributes: [[fn('SUM', col('paid_amount')), 'total']],
      where: { payment_date: { [Op.gte]: firstOfMonth } },
      raw: true,
    });
    const monthlyRevenue = parseFloat(revenueResult?.total || 0);

    // New enquiries this month
    const newEnquiries = await Enquiry.count({
      where: { created_at: { [Op.gte]: firstOfMonth }, status: 'New' },
    });

    // Expiring soon (next 7 days)
    const sevenDays = new Date();
    sevenDays.setDate(sevenDays.getDate() + 7);
    const expiringSoon = await Member.findAll({
      where: {
        expiry_date: { [Op.between]: [today, sevenDays.toISOString().split('T')[0]] },
        status: 'active',
      },
      limit: 10,
      order: [['expiry_date', 'ASC']],
    });

    // Recent payments
    const recentPayments = await Payment.findAll({
      include: [{ association: 'member', attributes: ['name', 'phone'] }],
      limit: 8,
      order: [['created_at', 'DESC']],
    });

    // Today's attendance list
    const todayList = await Attendance.findAll({
      where: { date: today },
      include: [{ association: 'member', attributes: ['name', 'member_id'] }],
      limit: 10,
      order: [['check_in', 'DESC']],
    });

    // Monthly attendance chart data (last 7 days)
    const attendanceChart = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = await Attendance.count({ where: { date: dateStr } });
      attendanceChart.push({ date: dateStr, count });
    }

    res.render('pages/dashboard', {
      title: 'Dashboard',
      stats: { totalMembers, activeMembers, expiredMembers, todayAttendance, monthlyRevenue, newEnquiries },
      expiringSoon,
      recentPayments,
      todayList,
      attendanceChart: JSON.stringify(attendanceChart),
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load dashboard');
    res.render('pages/dashboard', { title: 'Dashboard', stats: {}, expiringSoon: [], recentPayments: [], todayList: [], attendanceChart: '[]' });
  }
};

module.exports = { dashboard };
