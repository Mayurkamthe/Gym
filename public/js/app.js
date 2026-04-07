// Sidebar toggle
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// Auto-dismiss alerts after 4 seconds
document.querySelectorAll('.alert').forEach(alert => {
  setTimeout(() => {
    const bsAlert = new bootstrap.Alert(alert);
    bsAlert.close();
  }, 4000);
});

// Active sidebar link highlight based on URL
document.querySelectorAll('.menu-item').forEach(item => {
  if (item.href && window.location.pathname.startsWith(new URL(item.href).pathname) && new URL(item.href).pathname !== '/') {
    item.classList.add('active');
  }
});
