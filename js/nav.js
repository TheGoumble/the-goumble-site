function initNav(navItems) {
  const container = document.getElementById('navLinks');
  const toggle = document.getElementById('navToggle');
  container.innerHTML = '';

  const positions = [36, 50, 64, 78];

  navItems.forEach((item, i) => {
    const a = document.createElement('a');
    a.href = item.href;
    a.className = 'nav-link';
    a.textContent = item.label;
    a.style.left = positions[i % positions.length] + '%';

    a.addEventListener('click', () => {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      a.classList.add('active');
      container.classList.add('closed');
    });

    container.appendChild(a);
  });

  toggle.addEventListener('click', () => {
    container.classList.toggle('closed');
  });

  if (window.innerWidth <= 700) container.classList.add('closed');
}