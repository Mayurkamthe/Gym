require('dotenv').config();

let ZKLib;
try {
  ZKLib = require('node-zklib');
} catch (e) {
  console.warn('node-zklib not installed. Biometric features disabled. Run: npm install node-zklib');
}

const { Member, Attendance } = require('../models');
const { Op } = require('sequelize');

const getDeviceList = () => {
  const raw = process.env.ESSL_DEVICES || '';
  return raw
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const [ip, port] = d.split(':');
      return { ip, port: parseInt(port) || 4370 };
    });
};

const fetchFromDevice = async (deviceConfig) => {
  if (!ZKLib) throw new Error('zklib not installed');
  const zkInstance = new ZKLib(deviceConfig.ip, deviceConfig.port, 10000, 4000);
  try {
    await zkInstance.createSocket();
    const logs = await zkInstance.getAttendances();
    await zkInstance.disconnect();
    return logs.data || [];
  } catch (err) {
    console.error(`Failed to connect to device ${deviceConfig.ip}:${deviceConfig.port}`, err.message);
    return [];
  }
};

/**
 * Push a user UID to the ZKTeco device (enrolment)
 */
const enrollOnDevice = async (deviceConfig, uid, name) => {
  if (!ZKLib) throw new Error('zklib not installed');
  const zkInstance = new ZKLib(deviceConfig.ip, deviceConfig.port, 10000, 4000);
  try {
    await zkInstance.createSocket();
    await zkInstance.setUser(parseInt(uid), uid, name, '', 0, 0);
    await zkInstance.disconnect();
    return true;
  } catch (err) {
    console.error(`Enrol failed on device ${deviceConfig.ip}`, err.message);
    return false;
  }
};

/**
 * Remove a user UID from the ZKTeco device (auto-removal on expiry)
 */
const removeFromDevice = async (deviceConfig, uid) => {
  if (!ZKLib) throw new Error('zklib not installed');
  const zkInstance = new ZKLib(deviceConfig.ip, deviceConfig.port, 10000, 4000);
  try {
    await zkInstance.createSocket();
    await zkInstance.deleteUser(parseInt(uid));
    await zkInstance.disconnect();
    return true;
  } catch (err) {
    console.error(`Remove failed on device ${deviceConfig.ip}`, err.message);
    return false;
  }
};

/**
 * Auto-expire members whose expiry_date has passed and remove them from all devices
 */
const autoExpireAndRemove = async () => {
  const today = new Date().toISOString().split('T')[0];
  const devices = getDeviceList();

  // Find active members whose expiry_date < today
  const expired = await Member.findAll({
    where: {
      status: 'active',
      expiry_date: { [Op.lt]: today },
      expiry_date: { [Op.ne]: null },
    },
  });

  let removedCount = 0;
  for (const member of expired) {
    // Update DB status
    await member.update({ status: 'expired' });

    // Remove from all configured devices
    if (member.fingerprint_id && devices.length) {
      for (const device of devices) {
        await removeFromDevice(device, member.fingerprint_id);
      }
    }
    removedCount++;
  }

  return { removedCount, expiredMembers: expired.map((m) => m.name) };
};

/**
 * Sync attendance from ALL configured devices
 */
const syncAttendance = async () => {
  const devices = getDeviceList();
  if (!devices.length) return { success: false, message: 'No devices configured in ESSL_DEVICES' };

  // Run auto-expire before sync so newly expired members are blocked
  await autoExpireAndRemove();

  let totalSynced = 0;
  let errors = [];

  for (const device of devices) {
    try {
      const logs = await fetchFromDevice(device);

      for (const log of logs) {
        const fingerprintId = String(log.deviceUserId);
        const logTime = new Date(log.recordTime);
        const dateStr = logTime.toISOString().split('T')[0];
        const timeStr = logTime.toTimeString().split(' ')[0];

        const member = await Member.findOne({ where: { fingerprint_id: fingerprintId } });
        if (!member) continue;

        // Gate: only active, non-expired members get attendance logged
        if (member.status !== 'active') continue;
        if (member.expiry_date && new Date(member.expiry_date) < new Date()) continue;

        const [att, created] = await Attendance.findOrCreate({
          where: { member_id: member.id, date: dateStr },
          defaults: {
            check_in: timeStr,
            device_ip: device.ip,
            source: 'biometric',
          },
        });

        if (!created && !att.check_out && timeStr > att.check_in) {
          await att.update({ check_out: timeStr });
        }

        if (created) totalSynced++;
      }
    } catch (err) {
      errors.push(`Device ${device.ip}: ${err.message}`);
    }
  }

  return {
    success: true,
    totalSynced,
    errors,
    message: `Synced ${totalSynced} attendance records from ${devices.length} device(s)`,
  };
};

const markManualAttendance = async (memberId, date) => {
  const member = await Member.findByPk(memberId);
  if (!member) throw new Error('Member not found');

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const [att, created] = await Attendance.findOrCreate({
    where: { member_id: memberId, date },
    defaults: { check_in: timeStr, source: 'manual' },
  });

  if (!created) {
    await att.update({ check_out: timeStr });
  }

  return att;
};

module.exports = { syncAttendance, markManualAttendance, getDeviceList, autoExpireAndRemove, enrollOnDevice, removeFromDevice };
