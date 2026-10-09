function loadData(onReady) {
  fetch('data.json')
    .then(r => r.json())
    .then(data => {
      document.title = data.site.title;
      document.getElementById('heroName').textContent = data.profile.name;
      document.getElementById('heroRole').textContent = data.profile.role;

      // bio can be a single string or a list of paragraphs
      const bio = Array.isArray(data.profile.bio) ? data.profile.bio : [data.profile.bio];
      const bioBox = document.getElementById('bioText');
      bioBox.textContent = '';
      bio.forEach(text => {
        const p = document.createElement('p');
        p.textContent = text;
        bioBox.appendChild(p);
      });

      const headshotEl = document.getElementById('headshot');
      const iconEl = document.getElementById('icon');
      headshotEl.onerror = () => { headshotEl.style.display = 'none'; };
      iconEl.onerror = () => { iconEl.style.display = 'none'; };
      headshotEl.alt = 'Photo of ' + data.profile.name;
      iconEl.alt = '';                      // decorative
      headshotEl.src = data.profile.headshot;
      iconEl.src = data.profile.icon;

      // social links under the black hole
      const socials = document.getElementById('socials');
      (data.profile.socials || []).forEach(s => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'resume-btn';
        a.href = s.url;
        a.textContent = s.label;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        li.appendChild(a);
        socials.appendChild(li);
      });

      onReady(data);
    })
    .catch(err => {
      console.error('Could not load data.json', err);
    });
}