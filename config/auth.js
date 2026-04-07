const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.admin) {
    return next();
  }
  req.flash('error', 'Please login to continue');
  return res.redirect('/auth/login');
};

module.exports = { isAuthenticated };
