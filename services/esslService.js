require('dotenv').config();

// zklib integration for eSSL/ZKTeco devices
// Install: npm install zklib
let ZKLib;
try {
  ZKLib = require('zklib');
} catch (e) {
  console.warn('zklib not installed. Biometric features disabled. Run: npm install zklib');
}

const { Member, Attendance } = require('../models');
const { Op } = require('sequelize');

/**
 * Parse device list from .env
 * Format: "ip:port,ip:port"
 */
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

/**
 * Connect to a single ZKTeco device and fetch attendance logs
 */
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
 * Fetch attendance from ALL configured devices and sync to DB
 */
const syncAttendance = async () => {
  const devices = getDeviceList();
  if (!devices.length) return { success: false, message: 'No devices configured' };

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

        // Find member with this fingerprint_id
        const member = await Member.findOne({ where: { fingerprint_id: fingerprintId } });
        if (!member) continue;

        // Only log attendance if membership active
        if (member.status !== 'active') continue;
        if (member.expiry_date && new Date(member.expiry_date) < new Date()) continue;

        // Upsert attendance
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

/**
 * Mark manual attendance
 */
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

module.exports = { syncAttendance, markManualAttendance, getDeviceList };
