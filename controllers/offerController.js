const { Offer } = require('../models');

const index = async (req, res) => {
  const offers = await Offer.findAll({ order: [['created_at', 'DESC']] });
  const today = new Date().toISOString().split('T')[0];
  res.render('pages/offers', { title: 'Offers & Discounts', offers, today });
};

const create = async (req, res) => {
  try {
    await Offer.create(req.body);
    req.flash('success', 'Offer created!');
  } catch (err) {
    req.flash('error', 'Failed to create offer: ' + err.message);
  }
  res.redirect('/offers');
};

const update = async (req, res) => {
  try {
    await Offer.update(req.body, { where: { id: req.params.id } });
    req.flash('success', 'Offer updated!');
  } catch (err) {
    req.flash('error', 'Failed to update offer');
  }
  res.redirect('/offers');
};

const destroy = async (req, res) => {
  try {
    await Offer.destroy({ where: { id: req.params.id } });
    req.flash('success', 'Offer deleted!');
  } catch (err) {
    req.flash('error', 'Failed to delete offer');
  }
  res.redirect('/offers');
};

const getOne = async (req, res) => {
  const offer = await Offer.findByPk(req.params.id);
  res.json(offer);
};

module.exports = { index, create, update, destroy, getOne };
