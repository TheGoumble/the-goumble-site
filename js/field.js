/* ============================================================
   FIELD (asteroid field: projects + skills)
   ------------------------------------------------------------
   Owns: the drifting asteroid elements inside #asteroidField
   (projects large/slow/clickable, skills small/fast), PLUS a
   plain-list alternative inside #fieldList — project name +
   description + link, and a row of skill tags — toggled via
   #fieldViewToggle for anyone who'd rather just read the list
   than chase drifting asteroids.

   Moves on its own: each asteroid drifts via a CSS animation
   (see .asteroid / @keyframes drift in style.css) — this file
   only sets each one's starting position, speed, and delay once.
   The list view is static; nothing animates there.

   Depends on: data.projects and data.skills arrays from
   data.json (projects already carry a "description" field —
   it was unused by the old asteroid-only view, now the list
   view shows it). Must be called AFTER data.json has loaded.

   Call: initField(projects, skills)
   ============================================================ */

function initField(projects, skills) {
  const field = document.getElementById('asteroidField');
  const list = document.getElementById('fieldList');
  const toggle = document.getElementById('fieldViewToggle');
  const toggleLabel = toggle.querySelector('.view-toggle-label');

  renderAsteroids(field, projects, skills);
  renderList(list, projects, skills);

  toggle.addEventListener('click', () => {
    const showingList = toggle.getAttribute('aria-pressed') === 'true';
    const next = !showingList;
    toggle.setAttribute('aria-pressed', String(next));
    toggleLabel.textContent = next ? 'field view' : 'list view';
    field.hidden = next;
    list.hidden = !next;
  });
}

function renderAsteroids(field, projects, skills) {
  field.innerHTML = '';

  const items = [
    ...projects.map(p => ({ ...p, type: 'project' })),
    ...skills.map(s => ({ ...s, type: 'skill' }))
  ];

  items.forEach(item => {
    const el = document.createElement(item.link ? 'a' : 'div');
    el.className = 'asteroid ' + item.type;
    el.textContent = item.name;

    if (item.link) {
      el.href = item.link;
      el.target = '_blank';
      el.rel = 'noopener';
    }

    // random vertical position, speed, and start offset per asteroid —
    // projects drift slower (22-32s) than skills (10-18s)
    const top = Math.random() * 80;
    const duration = item.type === 'project'
      ? 22 + Math.random() * 10
      : 10 + Math.random() * 8;
    const delay = -Math.random() * duration; // negative delay = starts mid-animation

    el.style.top = top + '%';
    el.style.animationDuration = duration + 's';
    el.style.animationDelay = delay + 's';

    field.appendChild(el);
  });
}

function renderList(list, projects, skills) {
  const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const projectItems = projects.map(p => `
    <div class="field-list-item">
      <h3>${p.link
        ? `<a href="${escapeHTML(p.link)}" target="_blank" rel="noopener">${escapeHTML(p.name)}</a>`
        : escapeHTML(p.name)}</h3>
      ${p.description ? `<p>${escapeHTML(p.description)}</p>` : ''}
    </div>
  `).join('');

  const skillTags = skills.map(s =>
    `<span class="field-list-skill">${escapeHTML(s.name)}</span>`
  ).join('');

  list.innerHTML = `
    <div class="field-list-group">
      <h3 class="field-list-heading">Projects</h3>
      ${projectItems}
    </div>
    <div class="field-list-group">
      <h3 class="field-list-heading">Skills</h3>
      <div class="field-list-skills">${skillTags}</div>
    </div>
  `;
}