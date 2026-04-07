# 🏋️ Gym Management System

A complete production-ready Gym Management System for Indian gyms built with **Node.js + Express + EJS + MySQL (XAMPP) + Sequelize ORM**.

---

## ✨ Features

- 🔐 **Secure Admin Login** (credentials in `.env`, session-based)
- 👥 **Member Management** — CRUD, photo upload, expiry tracking
- 📋 **Enquiry System** — Lead tracking with follow-up dates & status
- 💳 **Billing / Payments** — Partial payments, due tracking, auto expiry
- 🏷️ **Offers & Discounts** — Flat / percentage offers applied at billing
- 📊 **Monthly Reports** — Revenue, member stats, attendance charts
- 🖐️ **Attendance** — Manual + eSSL/ZKTeco biometric sync (multi-device)
- 📱 **Indian Features** — WhatsApp & Call buttons, ₹ currency, expiry alerts
- ⚡ **Auto DB Setup** — Sequelize ORM creates all tables automatically

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
Edit `.env` and set your values:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin@123
DB_NAME=gym_management
```

### 4. Create Database in XAMPP
Open `http://localhost/phpmyadmin` and create a database named `gym_management`.  
*(Tables are auto-created by Sequelize — no SQL import needed!)*

### 5. Run
```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Open **http://localhost:3000** and login!

---

## 📁 Project Structure

```
gym-management/
├── app.js                  # Express entry point
├── .env                    # Configuration
├── config/
│   ├── database.js         # Sequelize connection
│   ├── auth.js             # Auth middleware
│   └── multer.js           # File upload config
├── models/
│   ├── Enquiry.js
│   ├── Member.js
│   ├── Plan.js
│   ├── Offer.js
│   ├── Payment.js
│   └── Attendance.js
├── controllers/            # Business logic
├── routes/
│   └── index.js            # All routes
├── services/
│   ├── billingService.js   # Billing logic + discount calc
│   └── esslService.js      # ZKTeco biometric sync
├── views/
│   ├── partials/           # header.ejs, footer.ejs
│   └── pages/              # All EJS pages
└── public/
    ├── css/style.css
    ├── js/app.js
    └── uploads/members/    # Member photos
```

---

## ⚙️ Environment Variables

| Variable         | Description                          |
|-----------------|--------------------------------------|
| `PORT`           | Server port (default: 3000)          |
| `DB_HOST`        | MySQL host (default: localhost)       |
| `DB_USER`        | MySQL user (default: root)           |
| `DB_PASS`        | MySQL password (blank for XAMPP)     |
| `DB_NAME`        | Database name                        |
| `ADMIN_USERNAME` | Admin login username                 |
| `ADMIN_PASSWORD` | Admin login password                 |
| `SESSION_SECRET` | Express session secret               |
| `ESSL_DEVICES`   | Biometric device IPs (ip:port,...)   |
| `GYM_NAME`       | Gym name shown in UI                 |

---

## 📲 Biometric Setup (eSSL/ZKTeco)

1. Set device IPs in `.env`:
   ```
   ESSL_DEVICES=192.168.1.201:4370,192.168.1.202:4370
   ```
2. Assign `fingerprint_id` (device user ID) to each member
3. Click **"Sync Biometric"** on Attendance page to pull logs

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
