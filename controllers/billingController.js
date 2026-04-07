const { Payment, Member, Plan, Offer } = require('../models');
const { createBilling, calculateDiscount, getActiveOffers } = require('../services/billingService');
const { Op } = require('sequelize');

const index = async (req, res) => {
  const { search, mode } = req.query;
  const where = {};
  if (mode) where.payment_mode = mode;
  const payments = await Payment.findAll({
    where,
    include: [
      { association: 'member', where: search ? { name: { [Op.like]: `%${search}%` } } : undefined, required: !!search },
      { association: 'plan' },
      { association: 'offer' },
    ],
    order: [['payment_date', 'DESC']],
    limit: 100,
  });
  res.render('pages/billing', { title: 'Billing', payments, search, mode });
};

const showCreate = async (req, res) => {
  const members = await Member.findAll({ where: { status: 'active' }, order: [['name', 'ASC']] });
  const plans = await Plan.findAll({ where: { is_active: true } });
  const offers = await getActiveOffers();
  const today = new Date().toISOString().split('T')[0];
  const selectedMemberId = req.query.member_id || null;
  res.render('pages/add-billing', { title: 'New Bill', members, plans, offers, today, selectedMemberId });
};

const create = async (req, res) => {
  try {
    const payment = await createBilling({
      memberId: req.body.member_id,
      planId: req.body.plan_id,
      offerId: req.body.offer_id || null,
      paidAmount: req.body.paid_amount,
      paymentMode: req.body.payment_mode,
      paymentDate: req.body.payment_date,
      transactionRef: req.body.transaction_ref,
      notes: req.body.notes,
    });
    req.flash('success', `Bill created! Invoice: ${payment.invoice_no}`);
    res.redirect('/billing');
  } catch (err) {
    req.flash('error', 'Billing failed: ' + err.message);
    res.redirect('/billing/new');
  }
};

const destroy = async (req, res) => {
  try {
    await Payment.destroy({ where: { id: req.params.id } });
    req.flash('success', 'Payment record deleted');
  } catch (err) {
    req.flash('error', 'Failed to delete payment');
  }
  res.redirect('/billing');
};

const calculateApi = async (req, res) => {
  const { plan_id, offer_id } = req.query;
  const plan = await Plan.findByPk(plan_id);
  if (!plan) return res.json({ error: 'Plan not found' });
  let offer = null;
  if (offer_id) offer = await Offer.findByPk(offer_id);
  const { discountAmount, finalAmount } = calculateDiscount(parseFloat(plan.price), offer);
  res.json({ original: plan.price, discount: discountAmount, final: finalAmount, duration: plan.duration_days });
};

module.exports = { index, showCreate, create, destroy, calculateApi };
