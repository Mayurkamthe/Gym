const { Member, Plan, Payment } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { enrollOnDevice, removeFromDevice, getDeviceList } = require('../services/esslService');

const index = async (req, res) => {
  const { status, search } = req.query;
  const where = {};
  if (status) where.status = status;
  if (search)
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { member_id: { [Op.like]: `%${search}%` } },
    ];
  const members = await Member.findAll({
    where,
    include: [{ association: 'plan' }],
    order: [['created_at', 'DESC']],
  });
  const today = new Date().toISOString().split('T')[0];
  const plans = await Plan.findAll({ where: { is_active: true } });

  // JSON response for fingerprint search
  if (req.query.json === '1') {
    return res.json({ members: members.map(m => ({
      id: m.id, name: m.name, member_id: m.member_id,
      phone: m.phone, fingerprint_id: m.fingerprint_id
    })) });
  }

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
    const member = await Member.create(data);

    // Enrol fingerprint on devices if fingerprint_id provided
    if (member.fingerprint_id) {
      const devices = getDeviceList();
      for (const device of devices) {
        await enrollOnDevice(device, member.fingerprint_id, member.name);
      }
    }

    req.flash('success', `Member ${member.name} added successfully! ID: ${member.member_id}`);
    res.redirect('/members');
  } catch (err) {
    req.flash('error', 'Failed to add member: ' + err.message);
    res.redirect('/members/add');
  }
};

const showEdit = async (req, res) => {
  const member = await Member.findByPk(req.params.id, { include: [{ association: 'plan' }] });
  if (!member) {
    req.flash('error', 'Member not found');
    return res.redirect('/members');
  }
  const plans = await Plan.findAll({ where: { is_active: true } });
  res.render('pages/add-member', { title: 'Edit Member', plans, member });
};

const update = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      req.flash('error', 'Member not found');
      return res.redirect('/members');
    }

    const oldFingerprintId = member.fingerprint_id;
    const data = { ...req.body };

    if (req.file) {
      if (member.photo) {
        const old = path.join(__dirname, '../public', member.photo);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      data.photo = '/uploads/members/' + req.file.filename;
    }

    await member.update(data);

    // Handle fingerprint_id change: remove old UID, enrol new UID
    const devices = getDeviceList();
    if (devices.length) {
      if (oldFingerprintId && oldFingerprintId !== member.fingerprint_id) {
        for (const device of devices) {
          await removeFromDevice(device, oldFingerprintId);
        }
      }
      if (member.fingerprint_id && member.status === 'active') {
        for (const device of devices) {
          await enrollOnDevice(device, member.fingerprint_id, member.name);
        }
      }
    }

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
    if (member) {
      // Remove from devices before deleting
      if (member.fingerprint_id) {
        const devices = getDeviceList();
        for (const device of devices) {
          await removeFromDevice(device, member.fingerprint_id);
        }
      }
      if (member.photo) {
        const old = path.join(__dirname, '../public', member.photo);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      await Member.destroy({ where: { id: req.params.id } });
    }
    req.flash('success', 'Member deleted!');
  } catch (err) {
    req.flash('error', 'Failed to delete member');
  }
  res.redirect('/members');
};

const show = async (req, res) => {
  const member = await Member.findByPk(req.params.id, {
    include: [
      { association: 'plan' },
      { association: 'payments', include: [{ association: 'plan' }], order: [['payment_date', 'DESC']] },
    ],
  });
  if (!member) {
    req.flash('error', 'Member not found');
    return res.redirect('/members');
  }
  const today = new Date().toISOString().split('T')[0];
  res.render('pages/member-profile', { title: member.name, member, today });
};

module.exports = { index, showAdd, create, showEdit, update, destroy, show };
