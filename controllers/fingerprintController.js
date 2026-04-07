/**
 * Fingerprint Controller
 * ======================
 * Handles:
 *  - GET  /fingerprint/devices        → list devices + COM ports
 *  - POST /fingerprint/pull-users     → pull all users from a device
 *  - POST /fingerprint/enroll         → link device user to a member
 *  - POST /fingerprint/sync           → sync all fingerprints from device to DB
 *  - GET  /fingerprint/member/:id     → view member fingerprint info
 *  - POST /fingerprint/member/:id/clear → clear fingerprint from member
 */

const fp = require('../services/fingerprintService');
const { Member } = require('../models');

// GET /fingerprint/devices
exports.getDevices = async (req, res) => {
  try {
    const comPorts   = await fp.getComPorts();
    const tcpDevices = (process.env.ESSL_DEVICES || '')
      .split(',').map(d => d.trim()).filter(Boolean)
      .map(d => { const [ip, port] = d.split(':'); return { ip, port: port || '4370', str: d }; });

    res.render('pages/fingerprint', {
      title: 'Fingerprint Management',
      comPorts,
      tcpDevices,
      flash: { success: req.flash('success'), error: req.flash('error') }
    });
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/settings');
  }
};

// POST /fingerprint/pull-users  { device: "192.168.1.1:4370" }
exports.pullUsers = async (req, res) => {
  try {
    const { device } = req.body;
    if (!device) return res.status(400).json({ error: 'Device is required' });

    const users = await fp.pullAllUsersFromDevice(device);

    // For each device user, check if already linked to a member
    const members = await Member.findAll({ attributes: ['id', 'name', 'member_id', 'fingerprint_id'] });
    const memberMap = {};
    members.forEach(m => { if (m.fingerprint_id) memberMap[m.fingerprint_id] = m; });

    const enriched = users.map(u => ({
      ...u,
      linkedMember: memberMap[u.userId] || null
    }));

    res.json({ success: true, users: enriched, total: enriched.length });
  } catch (err) {
    console.error('[FP] pullUsers error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /fingerprint/enroll  { memberId, device, deviceUserId }
exports.enroll = async (req, res) => {
  try {
    const { memberId, device, deviceUserId } = req.body;
    if (!memberId || !device || !deviceUserId) {
      return res.status(400).json({ error: 'memberId, device, and deviceUserId are required' });
    }

    const result = await fp.enrollFingerprintToMember(memberId, device, deviceUserId);
    res.json(result);
  } catch (err) {
    console.error('[FP] enroll error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /fingerprint/sync  { device }
exports.sync = async (req, res) => {
  try {
    const { device } = req.body;
    if (!device) return res.status(400).json({ error: 'Device is required' });

    const result = await fp.syncFingerprintsFromDevice(device);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[FP] sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /fingerprint/member/:id
exports.getMemberFingerprint = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    res.json({
      memberId:       member.id,
      name:           member.name,
      fingerprint_id: member.fingerprint_id,
      enrolled_at:    member.fingerprint_enrolled_at,
      device:         member.fingerprint_device,
      has_template:   !!member.fingerprint_data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /fingerprint/member/:id/clear
exports.clearFingerprint = async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) { req.flash('error', 'Member not found'); return res.redirect('/members'); }

    await member.update({
      fingerprint_id:          null,
      fingerprint_data:        null,
      fingerprint_enrolled_at: null,
      fingerprint_device:      null
    });

    req.flash('success', `Fingerprint cleared for ${member.name}`);
    res.redirect(`/members/${member.id}`);
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/members');
  }
};
