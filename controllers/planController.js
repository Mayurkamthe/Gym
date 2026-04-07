const { Plan } = require('../models');

const index = async (req, res) => {
  const plans = await Plan.findAll({ order: [['duration_days', 'ASC']] });
  res.render('pages/plans', { title: 'Plans', plans });
};

const create = async (req, res) => {
  try {
    await Plan.create(req.body);
    req.flash('success', 'Plan created!');
  } catch (err) {
    req.flash('error', 'Failed to create plan: ' + err.message);
  }
  res.redirect('/plans');
};

const update = async (req, res) => {
  try {
    await Plan.update(req.body, { where: { id: req.params.id } });
    req.flash('success', 'Plan updated!');
  } catch (err) {
    req.flash('error', 'Failed to update plan');
  }
  res.redirect('/plans');
};

const destroy = async (req, res) => {
  try {
    await Plan.destroy({ where: { id: req.params.id } });
    req.flash('success', 'Plan deleted!');
  } catch (err) {
    req.flash('error', 'Cannot delete plan (in use by members)');
  }
  res.redirect('/plans');
};

const getOne = async (req, res) => {
  const plan = await Plan.findByPk(req.params.id);
  res.json(plan);
};

module.exports = { index, create, update, destroy, getOne };
