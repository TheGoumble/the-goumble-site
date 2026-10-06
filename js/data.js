function loadData(onReady) {
  fetch('data.json')
    .then(r => r.json())
    .then(data => {
      document.title = data.site.title;
      document.getElementById('heroName').textContent = data.profile.name;
      document.getElementById('heroRole').textContent = data.profile.role;
      document.getElementById('bioText').textContent = data.profile.bio;
      document.getElementById('navLogoText').textContent =
        (data.site.title || 'logo').split(' ')[0].toLowerCase();

      const headshotEl = document.getElementById('headshot');
      const iconEl = document.getElementById('icon');
      headshotEl.onerror = () => { headshotEl.style.display = 'none'; };
      iconEl.onerror = () => { iconEl.style.display = 'none'; };
      headshotEl.src = data.profile.headshot;
      iconEl.src = data.profile.icon;

      onReady(data);
    })
    .catch(err => {
      console.error('Could not load data.json', err);
    });
}