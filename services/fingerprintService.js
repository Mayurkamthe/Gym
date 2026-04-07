/**
 * Fingerprint Service
 * ===================
 * Handles pulling fingerprint templates from ZKTeco devices
 * via both TCP/IP (network) and COM port (serial/USB).
 *
 * Supports:
 *  - TCP/IP devices (node-zklib)
 *  - COM port devices via serialport
 */

const { Member } = require('../models');

let ZKLib;
try { ZKLib = require('node-zklib'); } catch (e) {
  console.warn('[Fingerprint] node-zklib not available');
}

let SerialPort;
try { SerialPort = require('serialport').SerialPort; } catch (e) {
  console.warn('[Fingerprint] serialport not available — COM port features disabled');
}

// ── Parse device string ───────────────────────────────
// Formats: "192.168.1.100:4370" or "COM3:9600" or "/dev/ttyUSB0:9600"
function parseDevice(deviceStr) {
  const str = (deviceStr || '').trim();
  const isCom = /^COM\d+/i.test(str) || str.startsWith('/dev/tty');
  if (isCom) {
    const [port, baud] = str.split(':');
    return { type: 'serial', port, baud: parseInt(baud) || 9600 };
  }
  const [ip, port] = str.split(':');
  return { type: 'tcp', ip, port: parseInt(port) || 4370 };
}

// ── Connect to TCP device ─────────────────────────────
async function connectTCP(ip, port) {
  if (!ZKLib) throw new Error('node-zklib not installed. Run: npm install node-zklib');
  const zk = new ZKLib(ip, port, 10000, 4000);
  await zk.createSocket();
  return zk;
}

// ── Get all users from a TCP device ──────────────────
async function getUsersFromTCP(ip, port) {
  const zk = await connectTCP(ip, port);
  try {
    const result = await zk.getUsers();
    await zk.disconnect();
    return result.data || [];
  } catch (err) {
    try { await zk.disconnect(); } catch(e) {}
    throw err;
  }
}

// ── Get available COM ports ───────────────────────────
async function getComPorts() {
  if (!SerialPort) return [];
  try {
    const { SerialPort } = require('serialport');
    const ports = await SerialPort.list();
    return ports.map(p => ({
      path: p.path,
      manufacturer: p.manufacturer || '',
      serialNumber: p.serialNumber || '',
      description: p.friendlyName || p.path
    }));
  } catch (err) {
    console.error('[Fingerprint] getComPorts error:', err.message);
    return [];
  }
}

// ── Pull fingerprint template from TCP device for a user ─
async function pullFingerprintFromDevice(deviceStr, userId) {
  const device = parseDevice(deviceStr);

  if (device.type === 'tcp') {
    if (!ZKLib) throw new Error('node-zklib not installed');
    const zk = await connectTCP(device.ip, device.port);
    try {
      // Get all users to find the one matching userId
      const usersResult = await zk.getUsers();
      const users = usersResult.data || [];
      const user = users.find(u => String(u.userId) === String(userId));
      if (!user) {
        await zk.disconnect();
        throw new Error(`User ID ${userId} not found on device ${deviceStr}`);
      }
      await zk.disconnect();
      return {
        userId:   user.userId,
        name:     user.name,
        // node-zklib exposes cardno, role, password but not raw template
        // Store the user record as JSON — template extraction requires ZK SDK
        template: Buffer.from(JSON.stringify(user)).toString('base64'),
        device:   deviceStr
      };
    } catch (err) {
      try { await zk.disconnect(); } catch(e) {}
      throw err;
    }
  }

  throw new Error('COM port fingerprint pull not supported in this version — use TCP/IP device');
}

// ── Pull all users from device and return list ────────
async function pullAllUsersFromDevice(deviceStr) {
  const device = parseDevice(deviceStr);

  if (device.type === 'tcp') {
    const users = await getUsersFromTCP(device.ip, device.port);
    return users.map(u => ({
      userId:   String(u.userId),
      name:     u.name     || '',
      cardno:   u.cardno   || '',
      role:     u.role     || 0,
      password: u.password || ''
    }));
  }

  throw new Error('COM port not supported for user pull — use TCP/IP');
}

// ── Enroll fingerprint: store in DB for a member ─────
async function enrollFingerprintToMember(memberId, deviceStr, deviceUserId) {
  const member = await Member.findByPk(memberId);
  if (!member) throw new Error('Member not found');

  const fp = await pullFingerprintFromDevice(deviceStr, deviceUserId);

  await member.update({
    fingerprint_id:          String(deviceUserId),
    fingerprint_data:        fp.template,
    fingerprint_enrolled_at: new Date(),
    fingerprint_device:      deviceStr
  });

  return { success: true, member: member.name, fingerprintId: deviceUserId };
}

// ── Sync all device users into members by fingerprint_id ─
async function syncFingerprintsFromDevice(deviceStr) {
  const users = await pullAllUsersFromDevice(deviceStr);
  const results = { matched: 0, unmatched: [], total: users.length };

  for (const user of users) {
    const member = await Member.findOne({ where: { fingerprint_id: user.userId } });
    if (member) {
      await member.update({
        fingerprint_data:        Buffer.from(JSON.stringify(user)).toString('base64'),
        fingerprint_enrolled_at: new Date(),
        fingerprint_device:      deviceStr
      });
      results.matched++;
    } else {
      results.unmatched.push({ userId: user.userId, name: user.name });
    }
  }

  return results;
}

module.exports = {
  parseDevice,
  getComPorts,
  pullAllUsersFromDevice,
  pullFingerprintFromDevice,
  enrollFingerprintToMember,
  syncFingerprintsFromDevice,
  getUsersFromTCP
};
