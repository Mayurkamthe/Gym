const { Member, Payment, Attendance, Enquiry } = require('../models');
const { Op, fn, col } = require('sequelize');

const dashboard = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const totalMembers = await Member.count();
    const activeMembers = await Member.count({ where: { status: 'active', expiry_date: { [Op.gte]: today } } });
    const expiredMembers = await Member.count({ where: { [Op.or]: [{ status: 'expired' }, { expiry_date: { [Op.lt]: today } }] } });
    const doorBlocked = await Member.count({ where: { [Op.or]: [{ status: { [Op.ne]: 'active' } }, { expiry_date: { [Op.lt]: today } }] } });
    const todayAttendance = await Attendance.count({ where: { date: today } });

    const revenueResult = await Payment.findOne({
      attributes: [[fn('SUM', col('paid_amount')), 'total']],
      where: { payment_date: { [Op.gte]: firstOfMonth } },
      raw: true,
    });
    const monthlyRevenue = parseFloat(revenueResult?.total || 0);

    const newEnquiries = await Enquiry.count({
      where: { created_at: { [Op.gte]: firstOfMonth }, status: 'New' },
    });

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

    const recentPayments = await Payment.findAll({
      include: [{ association: 'member', attributes: ['name', 'phone'] }],
      limit: 8,
      order: [['created_at', 'DESC']],
    });

    const todayList = await Attendance.findAll({
      where: { date: today },
      include: [{ association: 'member', attributes: ['name', 'member_id'] }],
      limit: 10,
      order: [['check_in', 'DESC']],
    });

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
      stats: { totalMembers, activeMembers, expiredMembers, doorBlocked, todayAttendance, monthlyRevenue, newEnquiries },
      expiringSoon,
      recentPayments,
      todayList,
      attendanceChart: JSON.stringify(attendanceChart),
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to load dashboard');
    res.render('pages/dashboard', {
      title: 'Dashboard',
      stats: {},
      expiringSoon: [],
      recentPayments: [],
      todayList: [],
      attendanceChart: '[]',
    });
  }
};

module.exports = { dashboard };
