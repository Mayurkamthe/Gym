# 🏋️ Gym Management System

A complete production-ready Gym Management System for Indian gyms built with **Node.js + Express + EJS + MySQL (XAMPP) + Sequelize ORM**.

---

## ✨ Features

- 🔐 **Secure Admin Login** — credentials in `.env`, session-based
- 👥 **Member Management** — CRUD, photo upload, expiry tracking
- 📋 **Enquiry System** — Lead tracking with follow-up dates & status
- 💳 **Billing / Payments** — Partial payments, due tracking, auto expiry
- 🏷️ **Offers & Discounts** — Flat / percentage offers applied at billing
- 📊 **Monthly Reports** — Revenue, member stats, attendance charts
- 🖐️ **Attendance** — Manual + eSSL/ZKTeco biometric sync (multi-device)
- 🔒 **Auto Door Control** — Expired members auto-removed from biometric device; renewed members re-enrolled automatically
- ⏰ **Daily Expiry Scheduler** — Runs on startup and every 24h to expire overdue members and remove from all devices
- 📱 **Indian Features** — WhatsApp & Call buttons, ₹ currency, expiry alerts
- ⚡ **Auto DB Setup** — Sequelize ORM creates all tables automatically

---

## 🚪 Biometric Door Access Flow

```
Member enrolls fingerprint on device
        ↓
Admin assigns fingerprint_id to member profile
        ↓
Member active → door allowed  ✅
        ↓
Membership expired → member auto-removed from device → door blocked  🔒
        ↓
Member renews (new bill) → auto re-enrolled on device → door allowed again  ✅
```

**Automatic expiry runs:**
- On server startup
- Every 24 hours
- On every Sync Biometric click
- On manual "Check Expiry" button in Attendance page

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js v18+
- XAMPP (MySQL running on port 3306)

### 2. Clone & Install
```bash
git clone https://github.com/Mayurkamthe/Gym.git
cd Gym
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```
Edit `.env`:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin@123
DB_NAME=gym_management
ESSL_DEVICES=192.168.1.201:4370
GYM_NAME=PowerFit Gym
```

### 4. Create Database
Open `http://localhost/phpmyadmin` and create a database named `gym_management`.
*(Tables are auto-created by Sequelize — no SQL import needed!)*

### 5. Run
```bash
npm run dev   # development (auto-restart)
npm start     # production
```

Open **http://localhost:3000** and login!

---

## 📁 Project Structure

```
gym-management/
├── app.js                  # Express entry + daily expiry scheduler
├── config/
│   ├── database.js
│   ├── auth.js
│   └── multer.js
├── models/
│   ├── Member.js           # fingerprint_id field
│   ├── Plan.js
│   ├── Payment.js
│   ├── Attendance.js
│   ├── Enquiry.js
│   └── Offer.js
├── controllers/
│   ├── memberController.js # enrol/remove on device on create/update/delete
│   ├── attendanceController.js # sync + triggerExpiry
│   ├── billingController.js
│   ├── dashboardController.js  # doorBlocked stat
│   └── ...
├── services/
│   ├── esslService.js      # ZKTeco sync + enrollOnDevice + removeFromDevice + autoExpireAndRemove
│   └── billingService.js   # billing + re-enrol on renewal
├── routes/index.js
└── views/
    └── pages/
```

---

## ⚙️ Environment Variables

| Variable         | Description                          |
|-----------------|--------------------------------------|
| `PORT`           | Server port (default: 3000)          |
| `DB_HOST`        | MySQL host (default: localhost)       |
| `DB_USER`        | MySQL user (default: root)           |
| `DB_PASS`        | MySQL password                       |
| `DB_NAME`        | Database name                        |
| `ADMIN_USERNAME` | Admin login username                 |
| `ADMIN_PASSWORD` | Admin login password                 |
| `SESSION_SECRET` | Express session secret               |
| `ESSL_DEVICES`   | Biometric device IPs (ip:port,...)   |
| `GYM_NAME`       | Gym name shown in UI                 |
| `GYM_PHONE`      | Gym phone for display                |

---

## 📲 Biometric Setup (eSSL/ZKTeco)

1. Set device IPs in `.env`:
   ```
   ESSL_DEVICES=192.168.1.201:4370,192.168.1.202:4370
   ```
2. Enrol member's fingerprint directly on the device
3. Assign the device-assigned **UID** as `fingerprint_id` in member profile
4. Click **Sync Biometric** on the Attendance page to pull logs
5. Expired members are **automatically removed** from the device — door is blocked
6. On renewal (new bill), member is **automatically re-enrolled** — door access restored

---

## 🛠️ Tech Stack

| Layer      | Tech                                |
|-----------|-------------------------------------|
| Backend    | Node.js + Express                   |
| Frontend   | EJS + Bootstrap 5 + Bootstrap Icons |
| Database   | MySQL (XAMPP) via Sequelize ORM     |
| Auth       | express-session + connect-flash     |
| Upload     | Multer                              |
| Biometric  | zklib (ZKTeco/eSSL devices)         |

---

## 📄 License
MIT
