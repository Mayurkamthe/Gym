require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const methodOverride = require('method-override');

const { sequelize } = require('./models');
const routes = require('./routes');
const { autoExpireAndRemove } = require('./services/esslService');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'gym_secret_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

// Flash messages
app.use(flash());

// Locals available in all views
app.use((req, res, next) => {
  res.locals.messages = {
    success: req.flash('success'),
    error: req.flash('error'),
    info: req.flash('info'),
  };
  res.locals.gymName = process.env.GYM_NAME || 'GymPro';
  res.locals.gymPhone = process.env.GYM_PHONE || '';
  next();
});

// Routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/login', { title: '404 Not Found', layout: false });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  req.flash('error', err.message || 'Something went wrong');
  res.redirect('back');
});

// ─── Daily expiry scheduler (runs once at startup, then every 24h) ───
const runDailyExpiry = async () => {
  try {
    const result = await autoExpireAndRemove();
    if (result.removedCount > 0) {
      console.log(`⏰ Daily expiry: ${result.removedCount} member(s) expired and removed from devices.`);
    }
  } catch (err) {
    console.error('Daily expiry check failed:', err.message);
  }
};

// Sync DB and start server
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await sequelize.sync({ alter: true });
    console.log('✅ Database synced');

    app.listen(PORT, () => {
      console.log(`\n🏋️  Gym Management System running!`);
      console.log(`🌐 Open: http://localhost:${PORT}`);
      console.log(`👤 Login: ${process.env.ADMIN_USERNAME} / ${process.env.ADMIN_PASSWORD}\n`);
    });

    // Run expiry check on startup and every 24 hours
    await runDailyExpiry();
    setInterval(runDailyExpiry, 24 * 60 * 60 * 1000);
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
})();
