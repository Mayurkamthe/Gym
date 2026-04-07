require('dotenv').config();

const showLogin = (req, res) => {
  if (req.session.admin) return res.redirect('/dashboard');
  res.render('pages/login', { title: 'Admin Login', layout: false });
};

const login = (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.admin = { username };
    req.flash('success', 'Welcome back, Admin!');
    return res.redirect('/dashboard');
  }
  req.flash('error', 'Invalid username or password');
  res.redirect('/auth/login');
};

const logout = (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
};

module.exports = { showLogin, login, logout };
