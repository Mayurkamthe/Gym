const { Enquiry } = require('../models');
const { Op } = require('sequelize');

const index = async (req, res) => {
  const { status, search } = req.query;
  const where = {};
  if (status) where.status = status;
  if (search) where[Op.or] = [
    { name: { [Op.like]: `%${search}%` } },
    { phone: { [Op.like]: `%${search}%` } },
  ];

  const enquiries = await Enquiry.findAll({ where, order: [['created_at', 'DESC']] });
  const counts = {
    all: await Enquiry.count(),
    New: await Enquiry.count({ where: { status: 'New' } }),
    Interested: await Enquiry.count({ where: { status: 'Interested' } }),
    Joined: await Enquiry.count({ where: { status: 'Joined' } }),
  };
  res.render('pages/enquiry', { title: 'Enquiries', enquiries, counts, status, search });
};

const create = async (req, res) => {
  try {
    await Enquiry.create(req.body);
    req.flash('success', 'Enquiry added successfully!');
  } catch (err) {
    req.flash('error', 'Failed to add enquiry: ' + err.message);
  }
  res.redirect('/enquiry');
};

const update = async (req, res) => {
  try {
    await Enquiry.update(req.body, { where: { id: req.params.id } });
    req.flash('success', 'Enquiry updated successfully!');
  } catch (err) {
    req.flash('error', 'Failed to update enquiry');
  }
  res.redirect('/enquiry');
};

const destroy = async (req, res) => {
  try {
    await Enquiry.destroy({ where: { id: req.params.id } });
    req.flash('success', 'Enquiry deleted!');
  } catch (err) {
    req.flash('error', 'Failed to delete enquiry');
  }
  res.redirect('/enquiry');
};

const getOne = async (req, res) => {
  const enquiry = await Enquiry.findByPk(req.params.id);
  res.json(enquiry);
};

module.exports = { index, create, update, destroy, getOne };
