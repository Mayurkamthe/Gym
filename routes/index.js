const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../config/auth');

const authC = require('../controllers/authController');
const dashC = require('../controllers/dashboardController');
const enquiryC = require('../controllers/enquiryController');
const memberC = require('../controllers/memberController');
const planC = require('../controllers/planController');
const offerC = require('../controllers/offerController');
const billingC = require('../controllers/billingController');
const attendanceC = require('../controllers/attendanceController');
const reportC = require('../controllers/reportController');
const settingsC = require('../controllers/settingsController');
const fpC     = require('../controllers/fingerprintController');
const upload = require('../config/multer');

// Auth
router.get('/auth/login', authC.showLogin);
router.post('/auth/login', authC.login);
router.get('/auth/logout', authC.logout);

// Root redirect
router.get('/', (req, res) => res.redirect('/dashboard'));

// Dashboard
router.get('/dashboard', isAuthenticated, dashC.dashboard);

// Enquiry
router.get('/enquiry', isAuthenticated, enquiryC.index);
router.post('/enquiry', isAuthenticated, enquiryC.create);
router.get('/enquiry/:id/json', isAuthenticated, enquiryC.getOne);
router.post('/enquiry/:id/update', isAuthenticated, enquiryC.update);
router.post('/enquiry/:id/delete', isAuthenticated, enquiryC.destroy);

// Members
router.get('/members', isAuthenticated, memberC.index);
router.get('/members/add', isAuthenticated, memberC.showAdd);
router.post('/members', isAuthenticated, upload.single('photo'), memberC.create);
router.get('/members/:id', isAuthenticated, memberC.show);
router.get('/members/:id/edit', isAuthenticated, memberC.showEdit);
router.post('/members/:id/update', isAuthenticated, upload.single('photo'), memberC.update);
router.post('/members/:id/delete', isAuthenticated, memberC.destroy);

// Plans
router.get('/plans', isAuthenticated, planC.index);
router.post('/plans', isAuthenticated, planC.create);
router.get('/plans/:id/json', isAuthenticated, planC.getOne);
router.post('/plans/:id/update', isAuthenticated, planC.update);
router.post('/plans/:id/delete', isAuthenticated, planC.destroy);

// Offers
router.get('/offers', isAuthenticated, offerC.index);
router.post('/offers', isAuthenticated, offerC.create);
router.get('/offers/:id/json', isAuthenticated, offerC.getOne);
router.post('/offers/:id/update', isAuthenticated, offerC.update);
router.post('/offers/:id/delete', isAuthenticated, offerC.destroy);

// Billing
router.get('/billing', isAuthenticated, billingC.index);
router.get('/billing/new', isAuthenticated, billingC.showCreate);
router.post('/billing', isAuthenticated, billingC.create);
router.post('/billing/:id/delete', isAuthenticated, billingC.destroy);
router.get('/billing/calculate', isAuthenticated, billingC.calculateApi);

// Attendance
router.get('/attendance', isAuthenticated, attendanceC.index);
router.post('/attendance/sync', isAuthenticated, attendanceC.sync);
router.post('/attendance/manual', isAuthenticated, attendanceC.markManual);
router.post('/attendance/expire', isAuthenticated, attendanceC.triggerExpiry);
router.post('/attendance/:id/delete', isAuthenticated, attendanceC.destroy);

// Reports
router.get('/reports', isAuthenticated, reportC.index);

// Fingerprint
router.get('/fingerprint/devices',          isAuthenticated, fpC.getDevices);
router.post('/fingerprint/pull-users',      isAuthenticated, fpC.pullUsers);
router.post('/fingerprint/enroll',          isAuthenticated, fpC.enroll);
router.post('/fingerprint/sync',            isAuthenticated, fpC.sync);
router.get('/fingerprint/member/:id',       isAuthenticated, fpC.getMemberFingerprint);
router.post('/fingerprint/member/:id/clear',isAuthenticated, fpC.clearFingerprint);

// Settings
router.get('/settings', isAuthenticated, settingsC.index);
router.post('/settings/essl', isAuthenticated, settingsC.saveEssl);
router.post('/settings/devices/add', isAuthenticated, settingsC.addDevice);
router.post('/settings/devices/remove', isAuthenticated, settingsC.removeDevice);
router.post('/settings/devices/test', isAuthenticated, settingsC.testDevice);
router.post('/settings/admin', isAuthenticated, settingsC.saveAdmin);

module.exports = router;
