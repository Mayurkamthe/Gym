const { Payment, Member, Plan, Offer } = require('../models');
const { Op } = require('sequelize');

/**
 * Calculate discount based on offer
 */
const calculateDiscount = (originalAmount, offer) => {
  if (!offer) return { discountAmount: 0, finalAmount: originalAmount };

  let discountAmount = 0;
  if (offer.type === 'flat') {
    discountAmount = Math.min(parseFloat(offer.value), originalAmount);
  } else if (offer.type === 'percentage') {
    discountAmount = (originalAmount * parseFloat(offer.value)) / 100;
  }

  const finalAmount = Math.max(0, originalAmount - discountAmount);
  return { discountAmount: Math.round(discountAmount * 100) / 100, finalAmount: Math.round(finalAmount * 100) / 100 };
};

/**
 * Create a new payment/billing entry
 */
const createBilling = async (data) => {
  const { memberId, planId, offerId, paidAmount, paymentMode, paymentDate, transactionRef, notes } = data;

  const member = await Member.findByPk(memberId);
  if (!member) throw new Error('Member not found');

  const plan = await Plan.findByPk(planId);
  if (!plan) throw new Error('Plan not found');

  let offer = null;
  if (offerId) {
    offer = await Offer.findOne({
      where: {
        id: offerId,
        status: 'active',
        valid_from: { [Op.lte]: paymentDate },
        valid_to: { [Op.gte]: paymentDate },
      },
    });
  }

  const originalAmount = parseFloat(plan.price);
  const { discountAmount, finalAmount } = calculateDiscount(originalAmount, offer);
  const paid = parseFloat(paidAmount);
  const due = Math.max(0, finalAmount - paid);

  // Calculate start/end dates
  const startDate = paymentDate;
  const start = new Date(startDate);
  const endDate = new Date(start.setDate(start.getDate() + plan.duration_days)).toISOString().split('T')[0];

  const payment = await Payment.create({
    member_id: memberId,
    plan_id: planId,
    offer_id: offerId || null,
    original_amount: originalAmount,
    discount_amount: discountAmount,
    final_amount: finalAmount,
    paid_amount: paid,
    due_amount: due,
    payment_mode: paymentMode,
    payment_date: paymentDate,
    start_date: startDate,
    end_date: endDate,
    transaction_ref: transactionRef,
    notes,
    status: due > 0 ? 'partial' : 'paid',
  });

  // Update member expiry date
  await member.update({
    expiry_date: endDate,
    plan_id: planId,
    status: 'active',
  });

  return payment;
};

/**
 * Get active offers for today
 */
const getActiveOffers = async () => {
  const today = new Date().toISOString().split('T')[0];
  return await Offer.findAll({
    where: {
      status: 'active',
      valid_from: { [Op.lte]: today },
      valid_to: { [Op.gte]: today },
    },
  });
};

module.exports = { createBilling, calculateDiscount, getActiveOffers };
