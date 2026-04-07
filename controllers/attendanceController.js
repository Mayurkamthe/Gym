const { Attendance, Member } = require('../models');
const { syncAttendance, markManualAttendance } = require('../services/esslService');
const { Op } = require('sequelize');

const index = async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const records = await Attendance.findAll({
    where: { date },
    include: [{ association: 'member', attributes: ['name', 'member_id', 'phone'] }],
    order: [['check_in', 'DESC']],
  });
  const members = await Member.findAll({ where: { status: 'active' }, order: [['name', 'ASC']] });
  res.render('pages/attendance', { title: 'Attendance', records, members, date });
};

const sync = async (req, res) => {
  try {
    const result = await syncAttendance();
    req.flash(result.success ? 'success' : 'error', result.message);
  } catch (err) {
    req.flash('error', 'Sync failed: ' + err.message);
  }
  res.redirect('/attendance');
};

const markManual = async (req, res) => {
  try {
    const { member_id, date } = req.body;
    await markManualAttendance(member_id, date || new Date().toISOString().split('T')[0]);
    req.flash('success', 'Attendance marked!');
  } catch (err) {
    req.flash('error', 'Failed: ' + err.message);
  }
  res.redirect('/attendance');
};

const destroy = async (req, res) => {
  await Attendance.destroy({ where: { id: req.params.id } });
  req.flash('success', 'Record removed');
  res.redirect('/attendance');
};

module.exports = { index, sync, markManual, destroy };
