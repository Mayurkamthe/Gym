const { Member, Plan, Payment } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

const index = async (req, res) => {
  const { status, search } = req.query;
  const where = {};
  if (status) where.status = status;
  if (search) where[Op.or] = [
    { name: { [Op.like]: `%${search}%` } },
    { phone: { [Op.like]: `%${search}%` } },
    { member_id: { [Op.like]: `%${search}%` } },
  ];
  const members = await Member.findAll({ where, include: [{ association: 'plan' }], order: [['created_at', 'DESC']] });
  const today = new Date().toISOString().split('T')[0];
  const plans = await Plan.findAll({ where: { is_active: true } });
  res.render('pages/members', { title: 'Members', members, plans, status, search, today });
};

const showAdd = async (req, res) => {
  const plans = await Plan.findAll({ where: { is_active: true } });
  res.render('pages/add-member', { title: 'Add Member', plans, member: null });
};

const create = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.photo = '/uploads/members/' + req.file.filename;
    await Member.create(data);
    req.flash('success', 'Member added successfully!');
    res.redirect('/members');
  } catch (err) {
    req.flash('error', 'Failed to add member: ' + err.message);
    res.redirect('/members/add');
  }
};

const showEdit = async (req, res) => {
  const member = await Member.findByPk(req.params.id, { include: [{ association: 'plan' }] });
  if (!member) { req.flash('error', 'Member not found'); return res.redirect('/members'); }
  const plans = await Plan.findAll({ where: { is_active: true } });
  res.render('pages/add-member', { title: 'Edit Member', plans, member });
};

const update = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) { req.flash('error', 'Member not found'); return res.redirect('/members'); }
    const data = { ...req.body };
    if (req.file) {
      if (member.photo) {
        const old = path.join(__dirname, '../public', member.photo);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      data.photo = '/uploads/members/' + req.file.filename;
    }
    await member.update(data);
    req.flash('success', 'Member updated!');
    res.redirect('/members');
  } catch (err) {
    req.flash('error', 'Failed to update: ' + err.message);
    res.redirect('/members/' + req.params.id + '/edit');
  }
};

const destroy = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (member?.photo) {
      const old = path.join(__dirname, '../public', member.photo);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    await Member.destroy({ where: { id: req.params.id } });
    req.flash('success', 'Member deleted!');
  } catch (err) {
    req.flash('error', 'Failed to delete member');
  }
  res.redirect('/members');
};

const show = async (req, res) => {
  const member = await Member.findByPk(req.params.id, {
    include: [{ association: 'plan' }, { association: 'payments', include: [{ association: 'plan' }] }],
  });
  if (!member) { req.flash('error', 'Member not found'); return res.redirect('/members'); }
  const today = new Date().toISOString().split('T')[0];
  res.render('pages/member-profile', { title: member.name, member, today });
};

module.exports = { index, showAdd, create, showEdit, update, destroy, show };
