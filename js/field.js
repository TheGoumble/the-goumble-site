/* ============================================================
   FIELD (projects + skills)
   ------------------------------------------------------------
   Owns: a still cluster of asteroids, one per project (click one
   to open its detail card), and a row of skill pills beneath.

   Moves on its own: nothing except a slow CSS bob (field.css).

   Depends on: data.projects ({name, description, link}) and
   data.skills ({name}) from data.json. Call after data loads.

   Call: initField(projects, skills)
   ============================================================ */

// which drawing each project gets, in order (3 = the big one)
const ROCK_ORDER = [3, 1, 2, 2, 3, 1];
const ROCK_SIZE  = { 1: 150, 2: 150, 3: 210 };
const ROW_H = 250;
const JITTER = [-10, 14, -4, 12, -14, 6];

function initField(projects, skills) {
  projects = projects || [];
  skills = skills || [];

  renderRocks(projects);
  renderDrift(skills);
  renderFormal(projects, skills);

  // switch between the asteroid view and the formal list
  const toggle = document.getElementById('fieldViewToggle');
  const space = document.getElementById('spaceView');
  const formal = document.getElementById('formalView');
  toggle.addEventListener('click', () => {
    const showFormal = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(showFormal));
    closeCard();
    space.hidden = showFormal;
    formal.hidden = !showFormal;
  });
}

function renderRocks(projects) {
  const cluster = document.getElementById('rockCluster');
  const card = document.getElementById('projectCard');
  cluster.innerHTML = '';
  card.hidden = true;

  const cols = 3;
  const rows = Math.max(1, Math.ceil(projects.length / cols));
  cluster.style.setProperty('--rows', rows);
  cluster.style.setProperty('--row-h', ROW_H + 'px');

  projects.forEach((p, i) => {
    const rock = ROCK_ORDER[i % ROCK_ORDER.length];
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = Math.min(cols, projects.length - row * cols);
    // centre each row's rocks; odd rows shift a little so it feels scattered
    const x = (col + 0.5) * (100 / inRow) + (row % 2 ? 4 : -4);
    const y = row * ROW_H + ROW_H / 2 + JITTER[i % JITTER.length];

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'rock rock-' + rock;
    el.setAttribute('aria-expanded', 'false');
    el.textContent = p.name;
    el.style.setProperty('--s', ROCK_SIZE[rock] + 'px');
    el.style.setProperty('--x', x + '%');
    el.style.setProperty('--y', y + 'px');
    el.style.setProperty('--tilt', (i * 47 % 40 - 20) + 'deg');
    el.style.setProperty('--bob', (6 + (i * 1.3) % 3) + 's');
    el.style.setProperty('--delay', (-i * 1.7) + 's');

    el.addEventListener('click', () => toggleCard(el, p));
    cluster.appendChild(el);
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCard(); });
}

function closeCard() {
  const card = document.getElementById('projectCard');
  card.hidden = true;
  document.querySelectorAll('.rock[aria-expanded="true"]')
    .forEach(r => r.setAttribute('aria-expanded', 'false'));
}

function toggleCard(rockEl, p) {
  const open = rockEl.getAttribute('aria-expanded') === 'true';
  closeCard();
  if (open) return;

  rockEl.setAttribute('aria-expanded', 'true');
  const card = document.getElementById('projectCard');
  card.innerHTML = '';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'card-close';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '×';
  close.addEventListener('click', closeCard);

  const title = document.createElement('h3');
  title.textContent = p.name;

  const text = document.createElement('p');
  text.textContent = p.description || '';

  card.append(close, title, text);

  if (p.link) {
    const a = document.createElement('a');
    a.className = 'resume-btn card-link';
    a.href = p.link;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'view project';
    card.appendChild(a);
  }

  card.hidden = false;
  card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// skills drift across behind the project rocks (decoration only, not clickable)
function renderDrift(skills) {
  const layer = document.getElementById('skillDrift');
  layer.innerHTML = '';
  skills.forEach((s, i) => {
    const el = document.createElement('span');
    el.className = 'drifter rock-' + (1 + (i % 2));
    el.textContent = s.name;
    const dur = 26 + (i * 7) % 14;                 // 26-39s, varied per skill
    el.style.top = (((i * 0.618) % 1) * 82) + '%';  // spread evenly, no clumping
    el.style.animationDuration = dur + 's';
    el.style.animationDelay = (-((i * 0.37) % 1) * dur) + 's'; // start already in motion
    layer.appendChild(el);
  });
}

// formal view: plain project cards + skill pills
function renderFormal(projects, skills) {
  const root = document.getElementById('formalView');
  root.innerHTML = '';

  const heading = text => {
    const h = document.createElement('h3');
    h.className = 'formal-heading';
    h.textContent = text;
    return h;
  };

  root.appendChild(heading('projects'));
  const grid = document.createElement('div');
  grid.className = 'formal-grid';
  projects.forEach(p => {
    const card = document.createElement('article');
    card.className = 'proj-card';
    const t = document.createElement('h3');
    t.textContent = p.name;
    const d = document.createElement('p');
    d.textContent = p.description || '';
    card.append(t, d);
    if (p.link) {
      const a = document.createElement('a');
      a.className = 'resume-btn card-link';
      a.href = p.link;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'view project';
      card.appendChild(a);
    }
    grid.appendChild(card);
  });
  root.appendChild(grid);

  root.appendChild(heading('skills'));
  const pills = document.createElement('ul');
  pills.className = 'skill-pills';
  skills.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s.name;
    pills.appendChild(li);
  });
  root.appendChild(pills);
}