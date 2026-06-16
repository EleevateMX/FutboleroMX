// Auth — LocalStorage based (no backend)
const Auth = {
  getUser() {
    try { return JSON.parse(localStorage.getItem('fmx_user')); } catch { return null; }
  },
  getUsers() {
    try { return JSON.parse(localStorage.getItem('fmx_users')) || []; } catch { return []; }
  },
  saveUsers(users) {
    localStorage.setItem('fmx_users', JSON.stringify(users));
  },
  register(name, email, password) {
    const users = this.getUsers();
    if (users.find(u => u.email === email)) return { ok: false, msg: 'Ya existe una cuenta con ese correo.' };
    if (password.length < 6) return { ok: false, msg: 'La contraseña debe tener al menos 6 caracteres.' };
    const user = { id: Date.now(), name, email, pts: 0, picks: {}, joined: new Date().toISOString() };
    users.push({ ...user, password });
    this.saveUsers(users);
    localStorage.setItem('fmx_user', JSON.stringify(user));
    return { ok: true, user };
  },
  login(email, password) {
    const users = this.getUsers();
    const found = users.find(u => u.email === email && u.password === password);
    if (!found) return { ok: false, msg: 'Correo o contraseña incorrectos.' };
    const { password: _, ...user } = found;
    localStorage.setItem('fmx_user', JSON.stringify(user));
    return { ok: true, user };
  },
  logout() {
    localStorage.removeItem('fmx_user');
  },
  savePick(matchId, pick) {
    const user = this.getUser();
    if (!user) return;
    user.picks = user.picks || {};
    user.picks[matchId] = pick;
    localStorage.setItem('fmx_user', JSON.stringify(user));
    // update in users list too
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx > -1) { users[idx].picks = user.picks; this.saveUsers(users); }
  },
  getPick(matchId) {
    const user = this.getUser();
    return user?.picks?.[matchId] || null;
  },
};
