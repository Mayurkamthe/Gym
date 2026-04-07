require('dotenv').config();
const fs = require('fs');
const path = require('path');

let ZKLib;
try { ZKLib = require('zklib'); } catch (e) {}

const { getDeviceList } = require('../services/esslService');

const ENV_PATH = path.join(__dirname, '../.env');

/**
 * Read .env file as key=value map
 */
const readEnv = () => {
  if (!fs.existsSync(ENV_PATH)) return {};
  const lines = fs.readFileSync(ENV_PATH, 'utf-8').split('\n');
  const map = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    map[key] = val;
  }
  return map;
};

/**
 * Write updated values back to .env, preserving comments and order
 */
const writeEnv = (updates) => {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf-8') : '';
  for (const [key, val] of Object.entries(updates)) {
    const regex = new RegExp(`^(${key}=).*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${val}`);
    } else {
      content += `\n${key}=${val}`;
    }
  }
  fs.writeFileSync(ENV_PATH, content, 'utf-8');
};

/**
 * Ping a single ZKTeco device — returns {ok, latency, error}
 */
const pingDevice = async (ip, port) => {
  if (!ZKLib) return { ok: false, error: 'zklib not installed' };
  const start = Date.now();
  const zk = new ZKLib(ip, parseInt(port) || 4370, 5000, 2000);
  try {
    await zk.createSocket();
    await zk.disconnect();
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err.message, latency: Date.now() - start };
  }
};

/* ─── GET /settings ─── */
const index = (req, res) => {
  const env = readEnv();
  const devices = getDeviceList();
  res.render('pages/settings', {
    title: 'eSSL / Device Settings',
    env,
    devices,
    zkInstalled: !!ZKLib,
  });
};

/* ─── POST /settings/essl ─── update ESSL_DEVICES + gym info ─── */
const saveEssl = (req, res) => {
  try {
    const { gym_name, gym_phone, essl_devices, session_secret } = req.body;
    const updates = {};
    if (gym_name !== undefined)     updates['GYM_NAME']       = gym_name;
    if (gym_phone !== undefined)    updates['GYM_PHONE']       = gym_phone;
    if (essl_devices !== undefined) updates['ESSL_DEVICES']    = essl_devices.trim();
    if (session_secret)             updates['SESSION_SECRET']  = session_secret;

    writeEnv(updates);

    // Apply immediately to process.env (takes effect without restart for device list)
    for (const [k, v] of Object.entries(updates)) process.env[k] = v;

    req.flash('success', 'Settings saved! Restart the server for all changes to take full effect.');
  } catch (err) {
    req.flash('error', 'Failed to save settings: ' + err.message);
  }
  res.redirect('/settings');
};

/* ─── POST /settings/devices/add ─── add one device ─── */
const addDevice = (req, res) => {
  try {
    const { ip, port } = req.body;
    if (!ip) throw new Error('IP address is required');
    const current = (process.env.ESSL_DEVICES || '').split(',').map(s => s.trim()).filter(Boolean);
    const entry = `${ip.trim()}:${(port || '4370').trim()}`;
    if (!current.includes(entry)) {
      current.push(entry);
      const newVal = current.join(',');
      writeEnv({ ESSL_DEVICES: newVal });
      process.env.ESSL_DEVICES = newVal;
    }
    req.flash('success', `Device ${entry} added.`);
  } catch (err) {
    req.flash('error', err.message);
  }
  res.redirect('/settings');
};

/* ─── POST /settings/devices/remove ─── remove one device ─── */
const removeDevice = (req, res) => {
  try {
    const { entry } = req.body;
    const current = (process.env.ESSL_DEVICES || '').split(',').map(s => s.trim()).filter(Boolean);
    const filtered = current.filter(d => d !== entry);
    const newVal = filtered.join(',');
    writeEnv({ ESSL_DEVICES: newVal });
    process.env.ESSL_DEVICES = newVal;
    req.flash('success', `Device ${entry} removed.`);
  } catch (err) {
    req.flash('error', err.message);
  }
  res.redirect('/settings');
};

/* ─── POST /settings/devices/test ─── ping one device ─── */
const testDevice = async (req, res) => {
  const { ip, port } = req.body;
  const result = await pingDevice(ip, port || 4370);
  res.json(result);
};

/* ─── POST /settings/admin ─── change admin credentials ─── */
const saveAdmin = (req, res) => {
  try {
    const { admin_username, admin_password, confirm_password } = req.body;
    if (!admin_username) throw new Error('Username cannot be empty');
    if (admin_password && admin_password !== confirm_password) throw new Error('Passwords do not match');

    const updates = { ADMIN_USERNAME: admin_username };
    if (admin_password) updates['ADMIN_PASSWORD'] = admin_password;

    writeEnv(updates);
    for (const [k, v] of Object.entries(updates)) process.env[k] = v;

    req.flash('success', 'Admin credentials updated. Please log in again.');
    req.session.destroy();
    res.redirect('/auth/login');
    return;
  } catch (err) {
    req.flash('error', err.message);
    res.redirect('/settings');
  }
};

module.exports = { index, saveEssl, addDevice, removeDevice, testDevice, saveAdmin };
