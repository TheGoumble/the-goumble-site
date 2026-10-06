function initContact(email) {
  document.getElementById('blackhole').addEventListener('click', () => {
    if (email) window.location.href = 'mailto:' + email;
  });
}