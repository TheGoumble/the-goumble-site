initStarfield();
initTether();

loadData(data => {
  initNav(data.nav);
  initField(data.projects, data.skills);
  initContact(data.profile.email);
});