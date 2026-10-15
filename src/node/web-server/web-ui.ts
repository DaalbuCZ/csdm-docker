export const WEB_UI_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>CSDM Stats</title>
<script src="/static/js/chart.umd.min.js"></script>
<style>
:root {
  --bg: #0a0d12; --card: #12161d; --card2: #0e1219; --border: #1f2733;
  --text: #e8ebf1; --muted: #8b94a5; --green: #3fd68c; --red: #f04b5a;
  --yellow: #f0b429; --ct: #4aa8ff; --accent: #3fd68c;
}
* { box-sizing: border-box; }
body { font-family: Inter, -apple-system, 'Segoe UI', Roboto, sans-serif; margin: 0; background: var(--bg); color: var(--text); }
header.top { display: flex; align-items: center; gap: 14px; padding: 12px 24px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: rgba(10,13,18,.95); backdrop-filter: blur(8px); z-index: 10; flex-wrap: wrap; }
.logo { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #3fd68c, #1d9e62); display: flex; align-items: center; justify-content: center; font-weight: 800; color: #06110b; flex: 0 0 auto; }
.brand { font-size: 18px; font-weight: 800; margin-right: 8px; }
.brand span { color: var(--accent); }
nav.main { display: flex; gap: 4px; flex-wrap: wrap; }
nav.main a { color: var(--muted); text-decoration: none; font-size: 14px; font-weight: 600; padding: 8px 14px; border-radius: 999px; }
nav.main a:hover { color: var(--text); background: #1a2130; }
nav.main a.active { color: #06110b; background: var(--accent); }
#queuePill { margin-left: auto; font-size: 12px; color: var(--muted); background: var(--card); border: 1px solid var(--border); border-radius: 999px; padding: 6px 14px; white-space: nowrap; }
main { max-width: 1080px; margin: 0 auto; padding: 20px 24px 60px; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; margin-bottom: 16px; }
.card h2 { margin: 0 0 12px; font-size: 16px; }
.card h3 { margin: 20px 0 8px; font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
input, button, select { font-size: 14px; padding: 9px 13px; border-radius: 9px; border: 1px solid var(--border); font-family: inherit; }
input, select { background: var(--card2); color: var(--text); width: 100%; }
button { background: var(--accent); color: #06110b; cursor: pointer; border: none; font-weight: 700; }
button.ghost { background: transparent; border: 1px solid var(--border); color: var(--text); font-weight: 500; }
button:disabled { opacity: .55; }
.row { display: flex; gap: 8px; flex-wrap: wrap; }
.row > * { flex: 1 1 160px; }
.muted { color: var(--muted); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { text-align: right; padding: 7px 8px; border-bottom: 1px solid var(--border); white-space: nowrap; }
th:first-child, td:first-child { text-align: left; }
th { color: var(--muted); font-weight: 600; font-size: 12px; }
th.sortable { cursor: pointer; user-select: none; }
th.sortable:hover { color: var(--text); }
tr.clickable { cursor: pointer; }
tr.clickable:hover td { background: #1a2130; }
.match, .highlight { border-bottom: 1px solid var(--border); padding: 10px 0; }
.match:last-child, .highlight:last-child { border-bottom: none; }
.score { font-weight: 800; font-size: 15px; }
.team-title { margin: 14px 0 4px; font-size: 13px; color: var(--muted); font-weight: 700; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.stat { background: var(--card2); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; }
.stat span { display: block; font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
.stat strong { font-size: 20px; font-weight: 800; }
.good { color: var(--green); } .bad { color: var(--red); }
.pill { display: inline-block; font-size: 12px; font-weight: 700; border-radius: 999px; padding: 3px 10px; }
.pill.green { background: rgba(63,214,140,.15); color: var(--green); }
.pill.red { background: rgba(240,75,90,.15); color: var(--red); }
.pill.yellow { background: rgba(240,180,41,.15); color: var(--yellow); }
a { color: #7cc4ff; text-decoration: none; } a:hover { text-decoration: underline; }
.match-head { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.match-head .big { font-size: 26px; font-weight: 800; }
canvas.viewer { width: 100%; border-radius: 12px; border: 1px solid var(--border); background: #000; display: block; }
.viewer-controls { display: flex; gap: 8px; align-items: center; margin-top: 10px; flex-wrap: wrap; }
.viewer-controls input[type=range] { flex: 1 1 200px; padding: 0; accent-color: var(--accent); }
.viewer-controls select { flex: 0 1 140px; }
.viewer-controls button { flex: 0 0 auto; }
.killfeed { font-size: 13px; max-height: 150px; overflow-y: auto; margin-top: 8px; }
.killfeed div { padding: 3px 0; border-bottom: 1px solid var(--border); }
.chart-legend { display: flex; gap: 16px; font-size: 12px; color: var(--muted); margin-top: 6px; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 5px; }
svg.chart { width: 100%; height: auto; display: block; }
.search { margin-bottom: 12px; max-width: 340px; }
.dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.dash-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 760px) { .dash-cols { grid-template-columns: 1fr; } }
.see-all { font-size: 13px; }
.feed { display: flex; flex-direction: column; gap: 6px; }
.feed-entry { display: flex; align-items: center; gap: 8px; background: var(--card2); border: 1px solid var(--border); border-radius: 10px; padding: 7px 12px; font-size: 13px; flex-wrap: wrap; }
.feed-entry img.wicon { height: 22px; }
img.wicon, img.micon { filter: invert(1); }
.feed-entry img.micon { height: 15px; opacity: .9; }
.team-ct { color: var(--ct); font-weight: 600; }
.team-t { color: var(--t); font-weight: 600; }
.heat-canvas { width: 100%; border-radius: 12px; border: 1px solid var(--border); background: #000; display: block; }
.acc-bar { height: 6px; border-radius: 3px; background: #222b3a; overflow: hidden; min-width: 80px; }
.acc-bar > div { height: 100%; background: var(--accent); }
.user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
.user-card { background: var(--card2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; }
.user-card h3 { margin: 0 0 4px; font-size: 15px; text-transform: none; letter-spacing: 0; color: var(--text); }
.avatar { width: 44px; height: 44px; border-radius: 10px; background: #222b3a; vertical-align: middle; margin-right: 10px; }
.job { border-bottom: 1px solid var(--border); padding: 8px 0; font-size: 13px; }
textarea { background: var(--card2); color: var(--text); border: 1px solid var(--border); border-radius: 9px; padding: 9px 13px; width: 100%; font-family: monospace; font-size: 13px; }
.dropzone { border: 2px dashed var(--border); border-radius: 14px; padding: 30px 20px; text-align: center; color: var(--muted); cursor: pointer; transition: border-color .15s, background .15s; }
.dropzone.drag { border-color: var(--accent); background: rgba(63,214,140,.06); color: var(--text); }
.dropzone strong { color: var(--text); font-size: 15px; }
.progress { height: 8px; border-radius: 4px; background: #222b3a; overflow: hidden; min-width: 120px; flex: 1 1 140px; }
.progress > div { height: 100%; background: var(--accent); transition: width .2s; }
.upload-job { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; flex-wrap: wrap; }
.upload-job:last-child { border-bottom: none; }
.upload-job .name { flex: 1 1 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.upload-job .msg { flex: 2 1 220px; color: var(--muted); font-size: 12px; }
.match-row { display: flex; align-items: center; gap: 12px; padding: 9px 4px; border-bottom: 1px solid var(--border); cursor: pointer; flex-wrap: wrap; }
.match-row:hover { background: #1a2130; }
.match-row:last-child { border-bottom: none; }
.match-row .map-thumb { width: 52px; height: 30px; border-radius: 6px; object-fit: cover; background: #222b3a; flex: 0 0 auto; }
.match-row .mid { flex: 1 1 200px; min-width: 0; }
.match-row .score { font-weight: 800; font-size: 14px; flex: 0 0 auto; }
.match-row .nums { display: flex; gap: 14px; font-size: 12.5px; color: var(--muted); flex-wrap: wrap; flex: 0 0 auto; }
.match-row .nums b { color: var(--text); }
.hero { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.hero img { width: 56px; height: 56px; border-radius: 14px; }
</style>
</head>
<body>
<header class="top">
<div class="logo">C</div>
<div class="brand">CSDM <span>stats</span></div>
<nav class="main" id="nav">
<a href="#/" data-route="">Dashboard</a>
<a href="#/matches" data-route="matches">Matches</a>
<a href="#/players" data-route="players">Players</a>
<a href="#/users" data-route="users">Users</a>
<a href="#/highlights" data-route="highlights">Highlights</a>
<a href="#/downloads" data-route="downloads">Downloads</a>
<a href="#/upload" data-route="upload">Upload</a>
<a href="#/settings" data-route="settings">Settings</a>
</nav>
<div id="queuePill">connecting…</div>
<div id="authBox"></div>
</header>
<main>
<div id="view"></div>
</main>
<script>
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const num = (v, d=1) => { const n = Number(v); return Number.isFinite(n) ? n.toFixed(d) : '-'; };
const shortDate = (d) => esc(String(d || '').slice(0, 16).replace('T', ' '));
function ratingPill(r) { const n = Number(r); if (!Number.isFinite(n)) return '<span class="pill yellow">-</span>'; const c = n >= 1.1 ? 'green' : (n >= 0.9 ? 'yellow' : 'red'); return '<span class="pill ' + c + '">' + n.toFixed(2) + '</span>'; }
function conn() { try { return JSON.parse(localStorage.getItem('csdm-conn') || '{}'); } catch (e) { return {}; } }
function setConn(patch) { try { localStorage.setItem('csdm-conn', JSON.stringify({ ...conn(), ...patch })); } catch (e) {} }
function base() { return (conn().baseUrl || location.origin).replace(/\\/$/, ''); }
function headers(json) { const h = {}; if (json) h['content-type'] = 'application/json'; const t = (conn().token || '').trim(); if (t) h['authorization'] = 'Bearer ' + t; return h; }
async function get(path) { const res = await fetch(base() + path, { headers: headers() }); const body = await res.json(); if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status)); return body; }
function steamFilter() { const v = (conn().steamId || '').trim(); return v ? '?steamId=' + encodeURIComponent(v) : ''; }
/* Same RoundEndReason values as the desktop app (@akiver/cs-demo-analyzer, sourcemod cstrike.inc) */
const roundEndReasonLabels = { 0: 'In progress', 1: 'Target bombed', 2: 'VIP escaped', 3: 'VIP assassinated', 4: 'Terrorists escaped', 5: 'CTs stopped the escape', 6: 'Terrorists neutralized', 7: 'Bomb defused', 8: 'Counter-Terrorists win', 9: 'Terrorists win', 10: 'Draw', 11: 'Hostages rescued', 12: 'Target saved', 13: 'Hostages not rescued', 14: 'Terrorists did not escape', 15: 'VIP did not escape', 16: 'Game start', 17: 'Terrorists surrender', 18: 'CTs surrender', 19: 'Bomb planted', 20: 'CTs reached the hostage' };
function roundEndReasonLabel(reason) { const n = Number(reason); return roundEndReasonLabels[n] ?? ('Reason ' + reason); }
function sideLabel(side) { const n = Number(side); return n === 3 ? 'CT' : (n === 2 ? 'T' : ''); }
function roundWinnerLabel(r, match) {
  if (r.winnerName) return r.winnerName;
  const side = Number(r.winnerSide);
  let team = '';
  if (match) {
    if (side === Number(r.teamASide)) team = match.teamAName;
    else if (side === Number(r.teamBSide)) team = match.teamBName;
  }
  const s = sideLabel(side);
  if (team && s) return team + ' (' + s + ')';
  return team || s || '-';
}
function sourceLabel(source) { return source ? source.charAt(0).toUpperCase() + source.slice(1) : ''; }
function relDate(d) {
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return esc(String(d || ''));
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 86400 * 30) return Math.floor(s / 86400) + 'd ago';
  return esc(String(d).slice(0, 10));
}
function mapThumb(mapName, game) {
  const map = String(mapName || '').replace(/^de_/, 'de_');
  if (!mapName) return '';
  const url = base() + '/static/radars/' + encodeURIComponent(game || 'cs2') + '/' + encodeURIComponent(mapName) + '.png';
  return '<img class="map-thumb" src="' + url + '" alt="" loading="lazy" onerror="this.remove()" />';
}
/* Leetify-style match row for the signed-in player's recent games. */
function lastMatchRow(m, statsByChecksum) {
  const draw = Number(m.scoreTeamA) === Number(m.scoreTeamB);
  const won = !draw && m.focusTeamName && m.winnerName && m.focusTeamName === m.winnerName;
  const res = '<span class="pill ' + (draw ? 'yellow' : (won ? 'green' : 'red')) + '" style="min-width:34px;text-align:center">' + (draw ? 'D' : (won ? 'W' : 'L')) + '</span>';
  const s = statsByChecksum ? statsByChecksum.get(m.checksum) : null;
  const nums = s
    ? '<div class="nums"><span><b>' + s.killCount + '</b>/' + s.deathCount + '/' + s.assistCount + '</span><span>ADR <b>' + num(s.adr) + '</b></span><span>HS <b>' + num(s.headshotPercentage, 0) + '%</b></span>' + ratingPill(s.rating2) + '</div>'
    : '';
  return '<div class="match-row" data-href="#/matches/' + m.checksum + '">' + res +
    mapThumb(m.mapName, m.game) +
    '<div class="mid"><div><strong>' + esc(String(m.mapName || '?').replace('de_', '')) + '</strong></div>' +
    '<div class="muted" style="font-size:12px">' + esc(m.focusTeamName || '') + (m.game === 'csgo' ? ' · CS:GO' : '') + ' · ' + relDate(m.date) + '</div></div>' +
    '<div class="score">' + (m.scoreTeamA ?? '?') + ' : ' + (m.scoreTeamB ?? '?') + '</div>' + nums + '</div>';
}
/* Stat tile with the delta vs the previous period, like Leetify's overview. */
function deltaStat(label, value, text, previous, digits, higherIsBetter = true) {
  let delta = '';
  if (Number.isFinite(Number(value)) && Number.isFinite(Number(previous)) && Number(previous) !== 0) {
    const diff = Number(value) - Number(previous);
    const better = higherIsBetter ? diff > 0 : diff < 0;
    const color = Math.abs(diff) < 1e-9 ? 'muted' : (better ? 'good' : 'bad');
    const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '';
    delta = ' <span class="' + color + '" style="font-size:12px">' + arrow + ' ' + Math.abs(diff).toFixed(digits) + '</span>';
  }
  return '<div class="stat"><span>' + label + '</span><strong>' + text + '</strong>' + delta + '</div>';
}
/* ---------- router ---------- */
function parseHash() {
  const raw = (location.hash || '#/').replace(/^#\\/?/, '');
  const [pathPart, queryPart] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const query = {};
  if (queryPart) {
    for (const pair of queryPart.split('&')) {
      const [k, v] = pair.split('=');
      if (k) query[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
    }
  }
  return { name: parts[0] || '', param: parts[1] ? decodeURIComponent(parts[1]) : '', sub: parts[2] || '', query };
}
async function router() {
  stopViewer();
  destroyCharts();
  if (viewTimer) { clearInterval(viewTimer); viewTimer = null; }
  const { name, param, sub, query } = parseHash();
  const navFor = name === 'match' ? 'matches' : (name === 'player' || name === 'user' ? 'players' : name);
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.route === navFor));
  const view = $('view');
  try {
    if (name === '') { document.title = 'CSDM Stats'; await renderDashboard(view); }
    else if (name === 'me') { document.title = 'CSDM Stats'; await renderDashboard(view); }
    else if (name === 'matches' && param) { document.title = 'Match · CSDM'; await renderMatch(view, param, sub || 'overview', query); }
    else if (name === 'matches') { document.title = 'Matches · CSDM'; await renderMatches(view); }
    else if (name === 'match' && param) { document.title = 'Match · CSDM'; await renderMatch(view, param, sub || 'overview', query); }
    else if (name === 'players') { document.title = 'Players · CSDM'; await renderPlayers(view); }
    else if (name === 'player' && param) { document.title = 'Player · CSDM'; await renderPlayer(view, param); }
    else if (name === 'users') { document.title = 'Users · CSDM'; await renderUsers(view); }
    else if (name === 'highlights') { document.title = 'Highlights · CSDM'; await renderHighlights(view); }
    else if (name === 'downloads') { document.title = 'Downloads · CSDM'; await renderDownloads(view); }
    else if (name === 'upload') { document.title = 'Upload · CSDM'; renderUpload(view); }
    else if (name === 'settings') { document.title = 'Settings · CSDM'; await renderSettings(view); }
    else { view.innerHTML = '<div class="card"><p class="muted">Unknown page.</p></div>'; }
  } catch (e) { view.innerHTML = '<div class="card"><p class="muted">Failed to load: ' + esc(e.message) + '</p></div>'; }
}
window.addEventListener('hashchange', router);
/* ---------- dashboard ---------- */
/* When signed in, the dashboard is the player's own overview (Leetify-style),
   otherwise it shows a server-wide summary. */
async function renderDashboard(view) {
  view.innerHTML = '<div class="card"><p class="muted">Loading overview…</p></div>';
  const { user } = await get('/api/session').catch(() => ({ user: null }));
  if (user) {
    await renderMyDashboard(view, user);
    return;
  }
  const [{ matches }, { players }, { highlights }, { users }] = await Promise.all([
    get('/api/matches' + steamFilter()), get('/api/players'), get('/api/highlights' + steamFilter()), get('/api/users'),
  ]);
  const rated = [...players].sort((a, b) => Number(b.hltvRating2 || 0) - Number(a.hltvRating2 || 0)).slice(0, 5);
  const totalKills = matches.reduce((s, m) => s + (m.killCount || 0), 0);
  view.innerHTML =
    '<div class="card"><div class="hero"><div><h2 style="margin:0 0 4px">CSDM stats</h2>' +
    '<span class="muted">Log in with Steam to get your personal overview, automatic match imports and per-game stats.</span></div>' +
    '<div style="margin-left:auto"><a href="' + base() + '/auth/steam"><button>Login with Steam</button></a> <a href="#/upload"><button class="ghost">Upload demos</button></a></div></div></div>' +
    '<div class="dash-grid">' +
    '<div class="card"><h2>Matches</h2><div class="stats-grid"><div class="stat"><span>Analyzed (recent)</span><strong>' + matches.length + '</strong></div><div class="stat"><span>Kills tracked</span><strong>' + totalKills + '</strong></div></div></div>' +
    '<div class="card"><h2>Players</h2><div class="stats-grid"><div class="stat"><span>Tracked</span><strong>' + players.length + '</strong></div></div></div>' +
    '<div class="card"><h2>Users</h2><div class="stats-grid"><div class="stat"><span>Linked friends</span><strong>' + users.length + '</strong></div></div><p><a href="#/users">Manage users</a> · <a href="#/downloads">Download from share codes</a></p></div>' +
    '<div class="card"><h2>Highlights</h2><div class="stats-grid"><div class="stat"><span>Clutches & multikills</span><strong>' + highlights.length + '</strong></div></div></div>' +
    '</div><div class="dash-cols"><div>' +
    '<div class="card"><h2>Top players <a class="see-all" href="#/players">see all</a></h2><table><tbody>' +
    rated.map((p, i) => '<tr class="clickable" data-steam="' + p.steamId + '"><td>' + (i + 1) + '. ' + esc(p.name) + '</td><td>' + ratingPill(p.hltvRating2) + '</td></tr>').join('') +
    '</tbody></table></div>' +
    '<div class="card"><h2>Latest highlights <a class="see-all" href="#/highlights">see all</a></h2>' +
    highlights.slice(0, 5).map(h => '<div class="highlight"><span class="pill ' + (h.kind === 'clutch' ? 'green' : 'yellow') + '">' + h.kind + '</span> ' + esc(h.detail) + '<br/><span class="muted">' + esc(h.killerName) + ' · ' + esc(h.mapName) + '</span></div>').join('') + '</div>' +
    '</div><div><div class="card"><h2>Recent matches <a class="see-all" href="#/matches">see all</a></h2><div>' +
    matches.slice(0, 8).map(matchRow).join('') + '</div></div></div></div>';
  view.querySelectorAll('[data-steam]').forEach(el => { el.onclick = () => { location.hash = '#/player/' + el.dataset.steam; }; });
}
async function renderMyDashboard(view, user) {
  const steamId = user.steamId;
  const q = '?steamId=' + encodeURIComponent(steamId);
  const [{ player, lastMatches }, { history }, { highlights }, trackedResult] = await Promise.all([
    get('/api/players/' + encodeURIComponent(steamId)),
    get('/api/players/' + encodeURIComponent(steamId) + '/history?limit=20'),
    get('/api/highlights' + q + '&limit=6'),
    get('/api/tracked-users').catch(() => ({ users: [] })),
  ]);
  const mine = (trackedResult.users || []).find(u => u.steamId === steamId);
  const autoImport = mine
    ? '<span class="pill ' + (mine.status === 'ok' ? 'green' : (mine.status === 'error' ? 'red' : 'yellow')) + '">' + esc(mine.status.replaceAll('_', ' ')) + '</span> <span class="muted" style="font-size:12px">auto-import · last check ' + (mine.lastCheckAt ? relDate(mine.lastCheckAt) : 'never') + (mine.error ? ' · <a href="#/settings">fix in settings</a>' : '') + '</span>'
    : '<span class="muted" style="font-size:12px">Auto-import is off — <a href="#/settings">set it up</a> and new Valve matches appear here by themselves.</span>';
  const kd = Number(player.killDeathRatio || 0);
  const statsByChecksum = new Map(history.map(h => [h.checksum, h]));
  const rows = lastMatches.map(m => lastMatchRow(m, statsByChecksum)).join('');
  const half = Math.floor(history.length / 2);
  const recent = history.slice(half), previous = history.slice(0, half);
  const avg = (list, key) => list.length ? list.reduce((s, h) => s + Number(h[key] || 0), 0) / list.length : NaN;
  const kdOf = (h) => Number(h.killCount || 0) / Math.max(1, Number(h.deathCount || 0));
  const recentKd = avg(recent.map(kdOf), 'x'), previousKd = avg(previous.map(kdOf), 'x');
  const tiles =
    deltaStat('Rating 2.0', avg(recent, 'rating2'), avg(recent, 'rating2').toFixed(2), avg(previous, 'rating2'), 2) +
    deltaStat('ADR', avg(recent, 'adr'), num(avg(recent, 'adr')), avg(previous, 'adr'), 1) +
    deltaStat('KAST', avg(recent, 'kast'), num(avg(recent, 'kast')) + '%', avg(previous, 'kast'), 1) +
    deltaStat('K/D', recentKd, recentKd.toFixed(2), previousKd, 2) +
    deltaStat('HS%', avg(recent, 'headshotPercentage'), num(avg(recent, 'headshotPercentage'), 0) + '%', avg(previous, 'headshotPercentage'), 0) +
    stat('Matches', player.matchCount);
  view.innerHTML =
    '<div class="card"><div class="hero">' +
    (user.avatar ? '<img src="' + esc(user.avatar) + '" alt=""/>' : '') +
    '<div><h2 style="margin:0 0 4px">Welcome back, ' + esc(user.displayName) + '</h2>' + autoImport + '</div>' +
    '<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap"><a href="#/upload"><button>Upload demos</button></a> <a href="#/player/' + steamId + '"><button class="ghost">Full profile</button></a></div></div>' +
    '<div class="stats-grid" style="margin-top:14px">' + tiles + '</div>' +
    (history.length >= 4 ? '<div style="position:relative;height:260px;margin-top:14px" id="dashChartBox"></div>' : '') +
    '</div>' +
    '<div class="dash-cols"><div>' +
    '<div class="card"><h2>Recent matches <a class="see-all" href="#/matches">see all</a></h2><div>' + (rows || '<p class="muted">No matches yet — <a href="#/upload">upload a demo</a> to get started.</p>') + '</div></div>' +
    '</div><div>' +
    '<div class="card"><h2>My highlights <a class="see-all" href="#/highlights">see all</a></h2>' +
    (highlights.slice(0, 8).map(h => '<div class="highlight"><span class="pill ' + (h.kind === 'clutch' ? 'green' : 'yellow') + '">' + h.kind + '</span> ' + esc(h.detail) + ' — <a href="' + highlightViewerLink(h) + '">' + esc(h.mapName) + ' R' + h.roundNumber + '</a></div>').join('') || '<p class="muted">No highlights yet.</p>') + '</div>' +
    '</div></div>';
  if (history.length >= 4) {
    const box = $('dashChartBox');
    if (box) {
      box.innerHTML = '<h3>Form — last ' + history.length + ' matches</h3><div style="position:relative;height:220px"><canvas id="formCanvas"></canvas></div>';
      renderFormChart(history);
    }
  }
  view.querySelectorAll('.match-row[data-href]').forEach(el => { el.onclick = () => { location.hash = el.dataset.href; }; });
}
function matchRow(m) {
  const multis = ((m.threeKillCount || 0) + (m.fourKillCount || 0) + (m.fiveKillCount || 0));
  return '<div class="match"><a href="#/matches/' + m.checksum + '"><strong>' + esc(m.mapName || '?') + '</strong></a> ' +
    '<span class="muted">' + relDate(m.date) + ' · ' + esc(m.game || '') + ' ' + esc(sourceLabel(m.source)) + (multis ? ' · ' + multis + ' multikills' : '') + '</span><br/>' +
    '<span class="score">' + esc(m.teamAName || '?') + ' ' + (m.teamAScore ?? '-') + ' : ' + (m.teamBScore ?? '-') + ' ' + esc(m.teamBName || '?') + '</span></div>';
}
/* ---------- matches ---------- */
let matchesCache = [];
async function renderMatches(view) {
  view.innerHTML = '<div class="card"><h2>Matches</h2>' +
    '<div class="row"><div class="search" style="margin:0;flex:2 1 200px"><input id="mq" placeholder="Search map or team…" /></div>' +
    '<input id="mm" placeholder="Map, e.g. de_mirage" style="flex:1 1 140px" /><input id="mf" type="date" style="flex:1 1 140px" /><input id="mt" type="date" style="flex:1 1 140px" /><button id="mGo" style="flex:0 0 auto">Filter</button></div>' +
    '<div id="mlist" style="margin-top:12px"><p class="muted">Loading…</p></div></div>';
  const load = async () => {
    $('mlist').innerHTML = '<p class="muted">Loading…</p>';
    try {
      const params = new URLSearchParams();
      const steamId = (conn().steamId || '').trim();
      if (steamId) params.set('steamId', steamId);
      if ($('mm').value.trim()) params.set('map', $('mm').value.trim());
      if ($('mf').value) params.set('from', $('mf').value);
      if ($('mt').value) params.set('to', $('mt').value + 'T23:59:59');
      params.set('limit', '100');
      const { matches } = await get('/api/matches?' + params.toString());
      matchesCache = matches;
      draw();
    } catch (e) { $('mlist').innerHTML = '<p class="muted">Failed to load: ' + esc(e.message) + '</p>'; }
  };
  const draw = () => {
    const q = ($('mq').value || '').toLowerCase();
    const list = matchesCache.filter(m => !q || (m.mapName || '').toLowerCase().includes(q) || (m.teamAName || '').toLowerCase().includes(q) || (m.teamBName || '').toLowerCase().includes(q));
    $('mlist').innerHTML = list.map(matchRow).join('') || '<p class="muted">No matches found.</p>';
  };
  $('mq').oninput = draw;
  $('mGo').onclick = load;
  await load();
}
function scoreboard(players, teamName) {
  const rows = players.filter(p => p.teamName === teamName);
  if (!rows.length) return '';
  return '<div class="team-title">' + esc(teamName || '?') + '</div><table><thead><tr><th>Player</th><th>K</th><th>A</th><th>D</th><th>+/-</th><th>HS%</th><th>ADR</th><th>KAST</th><th>3K/4K/5K</th><th>Rating</th></tr></thead><tbody>' +
    rows.map(p => '<tr class="clickable" data-steam="' + p.steamId + '"><td>' + esc(p.name) + '</td><td>' + p.killCount + '</td><td>' + p.assistCount + '</td><td>' + p.deathCount + '</td><td class="' + ((p.killCount - p.deathCount) >= 0 ? 'good' : 'bad') + '">' + (p.killCount - p.deathCount > 0 ? '+' : '') + (p.killCount - p.deathCount) + '</td><td>' + num(p.headshotPercentage) + '</td><td>' + num(p.averageDamagePerRound) + '</td><td>' + num(p.kast) + '</td><td>' + (p.threeKillCount || 0) + '/' + (p.fourKillCount || 0) + '/' + (p.fiveKillCount || 0) + '</td><td>' + ratingPill(p.hltvRating2) + '</td></tr>').join('') +
    '</tbody></table>';
}
let scoreChartInstance = null;
let formChartInstance = null;
function destroyCharts() {
  for (const key of ['scoreChartInstance', 'formChartInstance']) {
    try {
      if (key === 'scoreChartInstance' && scoreChartInstance) scoreChartInstance.destroy();
      if (key === 'formChartInstance' && formChartInstance) formChartInstance.destroy();
    } catch (e) {}
  }
  scoreChartInstance = null;
  formChartInstance = null;
}
function chartDefaults() {
  if (typeof Chart === 'undefined') return false;
  Chart.defaults.color = '#8b94a5';
  Chart.defaults.borderColor = '#1f2733';
  Chart.defaults.font.family = "Inter, -apple-system, 'Segoe UI', Roboto, sans-serif";
  return true;
}
function scoreChartPlaceholder() {
  return '<h3>Score progression</h3><div style="position:relative;height:260px"><canvas id="scoreCanvas"></canvas></div>';
}
function renderScoreChart(rounds, aName, bName) {
  const canvas = $('scoreCanvas');
  if (!canvas) return;
  if (!chartDefaults()) { canvas.outerHTML = '<p class="muted">Chart library failed to load.</p>'; return; }
  if (scoreChartInstance) { try { scoreChartInstance.destroy(); } catch (e) {} }
  const rs = [...rounds].sort((a, b) => a.number - b.number);
  scoreChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: rs.map(r => 'R' + r.number),
      datasets: [
        { label: aName || 'A', data: rs.map(r => r.teamAScore ?? 0), borderColor: '#4aa8ff', backgroundColor: '#4aa8ff', stepped: true, tension: 0, pointRadius: 3, pointHoverRadius: 6 },
        { label: bName || 'B', data: rs.map(r => r.teamBScore ?? 0), borderColor: '#f0b429', backgroundColor: '#f0b429', stepped: true, tension: 0, pointRadius: 3, pointHoverRadius: 6 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#e8ebf1', usePointStyle: true } }, tooltip: { callbacks: { title: (items) => { const r = rs[items[0].dataIndex]; return 'Round ' + r.number + ' — ' + roundWinnerLabel(r, { teamAName: aName, teamBName: bName }); } } } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
}
function isWallbangKill(k) { return (k.penetratedObjects || 0) > 0 || !!k.isWallbang; }
const weaponIcons = { 'AK-47': 'weapons/ak47-icon.svg', 'AUG': 'weapons/aug-icon.svg', 'AWP': 'weapons/awp-icon.svg', 'C4': 'weapons/bomb-icon.svg', 'CZ75 Auto': 'weapons/cz75a-icon.svg', 'Decoy Grenade': 'weapons/decoy-icon.svg', 'Desert Eagle': 'weapons/deagle-icon.svg', 'Defuse Kit': 'weapons/defuser-icon.svg', 'Dual Berettas': 'weapons/dual-elite-icon.svg', 'FAMAS': 'weapons/famas-icon.svg', 'Five-SeveN': 'weapons/five-seven-icon.svg', 'Flashbang': 'weapons/flashbang-icon.svg', 'G3SG1': 'weapons/g3sg1-icon.svg', 'Galil AR': 'weapons/galilar-icon.svg', 'Glock-18': 'weapons/glock-icon.svg', 'HE Grenade': 'weapons/he-grenade-icon.svg', 'Incendiary Grenade': 'weapons/incendiary-grenade-icon.svg', 'Kevlar Vest': 'weapons/kevlar-icon.svg', 'Kevlar + Helmet': 'weapons/helmet-icon.svg', 'Knife': 'weapons/knife-icon.svg', 'M249': 'weapons/m249-icon.svg', 'M4A1': 'weapons/m4a1-icon.svg', 'M4A4': 'weapons/m4a4-icon.svg', 'MAC-10': 'weapons/mac10-icon.svg', 'MAG-7': 'weapons/mag7-icon.svg', 'Molotov': 'weapons/molotov-icon.svg', 'MP5-SD': 'weapons/mp5sd-icon.svg', 'MP7': 'weapons/mp7-icon.svg', 'MP9': 'weapons/mp9-icon.svg', 'Negev': 'weapons/negev-icon.svg', 'Nova': 'weapons/nova-icon.svg', 'P2000': 'weapons/p2000-icon.svg', 'P250': 'weapons/p250-icon.svg', 'P90': 'weapons/p90-icon.svg', 'PP-Bizon': 'weapons/bizon-icon.svg', 'R8 Revolver': 'weapons/revolver-icon.svg', 'Sawed-Off': 'weapons/sawed-off-icon.svg', 'SCAR-20': 'weapons/scar20-icon.svg', 'SSG 08': 'weapons/ssg08-icon.svg', 'SG 553': 'weapons/sg553-icon.svg', 'Smoke Grenade': 'weapons/smoke-grenade-icon.svg', 'Tec-9': 'weapons/tec9-icon.svg', 'UMP-45': 'weapons/ump45-icon.svg', 'USP-S': 'weapons/usps-icon.svg', 'World': 'weapons/world-icon.svg', 'XM1014': 'weapons/xm1014-icon.svg', 'Zeus x27': 'weapons/zeus-icon.svg' };
function weaponImg(name, h) { const f = weaponIcons[name] || 'question-icon.svg'; return '<img class="wicon" style="height:' + (h || 22) + 'px" src="' + base() + '/static/icons/' + f + '" alt="' + esc(name || '?') + '" title="' + esc(name || '?') + '" loading="lazy" />'; }
function modImg(file, title) { return '<img class="micon" src="' + base() + '/static/icons/' + file + '" alt="' + title + '" title="' + title + '" loading="lazy" />'; }
function teamNameHtml(side, name) { const n = Number(side); const c = n === 3 ? 'team-ct' : (n === 2 ? 'team-t' : ''); return '<span class="' + c + '">' + esc(name) + '</span>'; }
function fmtClock(totalSeconds) { const s = Math.max(0, Math.round(Number(totalSeconds) || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function killFeedEntry(k, tickrate, freezeEndTick) {
  const isSuicide = k.killerName === 'World' && k.weaponName === 'World';
  const isBombDeath = Number(k.killerSide) === 0 && k.killerName === 'World';
  let html = '<div class="feed-entry"><span class="muted">R' + k.roundNumber + '</span>';
  if (k.isTradeKill) html += modImg('revenge-icon.svg', 'Trade kill');
  if (k.isKillerBlinded) html += modImg('blind-icon.svg', 'Blinded killer');
  if (isBombDeath) {
    html += modImg('explosion-icon.svg', 'Bomb explosion') + teamNameHtml(k.victimSide, k.victimName);
  } else if (isSuicide) {
    html += teamNameHtml(k.victimSide, k.victimName) + weaponImg(k.weaponName) + '<span class="muted">suicide</span>';
  } else {
    html += teamNameHtml(k.killerSide, k.killerName);
    if (k.assisterName && Number(k.assisterSide) !== 0) {
      html += '<span class="muted">+' + (k.isAssistedFlash ? ' ' + modImg('flashbang-assist-icon.svg', 'Flash assist') : '') + ' ' + esc(k.assisterName) + '</span>';
    }
    if (k.isKillerAirborne) html += modImg('airborne-kill-icon.svg', 'Airborne killer');
    html += weaponImg(k.weaponName);
    if (k.isNoScope) html += modImg('noscope-icon.svg', 'No-scope');
    if (k.isThroughSmoke) html += modImg('through-smoke-kill-icon.svg', 'Through smoke');
    if (isWallbangKill(k)) html += modImg('penetrate-icon.svg', 'Wallbang');
    if (k.isHeadshot) html += modImg('headshot-icon.svg', 'Headshot');
    html += teamNameHtml(k.victimSide, k.victimName);
  }
  if (tickrate && freezeEndTick) html += '<span class="muted" style="margin-left:auto">' + fmtClock((k.tick - freezeEndTick) / tickrate) + '</span>';
  return html + '</div>';
}
function multikillName(count) { return count >= 5 ? 'Ace' : count === 4 ? '4K' : '3K'; }
function computeMatchHighlights(kills, clutches) {
  const groups = new Map();
  for (const k of kills) {
    const key = k.roundNumber + '|' + (k.killerSteamId || k.killerName);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(k);
  }
  const items = [];
  for (const list of groups.values()) {
    if (list.length < 3) continue;
    const weapons = [...new Set(list.map(k => k.weaponName).filter(Boolean))];
    items.push({ sort: 100 + list.length, round: list[0].roundNumber, killer: list[0].killerName, title: 'Round ' + list[0].roundNumber + ' ' + (weapons[0] || '') + ' ' + multikillName(list.length), detail: list.length + ' kills', kind: list.length >= 5 ? 'ace' : 'multi' });
  }
  for (const c of clutches.filter(c => c.won)) {
    items.push({ sort: 90 + c.opponentCount, round: c.roundNumber, killer: c.clutcherName, title: 'Round ' + c.roundNumber + ' 1v' + c.opponentCount + ' clutch', detail: c.clutcherKillCount + ' kills to close it', kind: 'clutch' });
  }
  const specials = kills.filter(k => isWallbangKill(k) || k.isNoScope);
  const seenSpecial = new Set();
  for (const k of specials) {
    const key = k.roundNumber + '|' + (k.killerSteamId || k.killerName);
    if (seenSpecial.has(key)) continue;
    seenSpecial.add(key);
    const how = k.isNoScope && isWallbangKill(k) ? 'no-scope wallbang' : (k.isNoScope ? 'no-scope' : 'wallbang');
    items.push({ sort: 50, round: k.roundNumber, killer: k.killerName, title: 'Round ' + k.roundNumber + ' ' + how + ' kill', detail: esc(k.weaponName || '') + ' on ' + esc(k.victimName), kind: 'special', raw: true });
  }
  items.sort((a, b) => b.sort - a.sort || a.round - b.round);
  return items;
}
function formatDuration(totalSeconds) {
  const s = Math.round(Number(totalSeconds) || 0);
  if (!s) return '';
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
const matchTabs = [['overview', 'Overview'], ['players', 'Players'], ['rounds', 'Rounds'], ['kills', 'Kills'], ['clutches', 'Clutches'], ['heatmap', 'Heatmap'], ['weapons', 'Weapons'], ['duels', 'Duels'], ['grenades', 'Grenades'], ['economy', 'Economy'], ['chat', 'Chat'], ['viewer', '2D Viewer']];
let currentMatch = null;
async function renderMatch(view, checksum, sub, query) {
  sub = sub || 'overview';
  query = query || {};
  if (!currentMatch || currentMatch.checksum !== checksum) {
    view.innerHTML = '<div class="card"><p class="muted">Loading match…</p></div>';
    const data = await get('/api/matches/' + encodeURIComponent(checksum));
    currentMatch = { checksum, ...data };
  }
  const { match, players, rounds, kills, clutches } = currentMatch;
  const teams = [...new Set(players.map(p => p.teamName))];
  const aScore = match.teamAScore ?? 0, bScore = match.teamBScore ?? 0;
  const result = aScore === bScore ? 'Draw' : ((aScore > bScore ? match.teamAName : match.teamBName) + ' wins');
  const mvp = [...players].sort((a, b) => Number(b.hltvRating2 || 0) - Number(a.hltvRating2 || 0))[0];
  const headshots = kills.filter(k => k.isHeadshot).length;
  const highlights = computeMatchHighlights(kills, clutches);
  const multiCount = highlights.filter(h => h.kind === 'multi' || h.kind === 'ace').length;
  const duration = formatDuration(match.duration);
  const tabs = matchTabs.filter(([key]) => key !== 'clutches' || clutches.length > 0);
  view.innerHTML = '<div class="card" id="matchHero"><a href="#/matches">&larr; Matches</a>' +
    '<div class="match-head" style="margin-top:10px;justify-content:space-between"><div><div class="pill ' + (result === 'Draw' ? 'yellow' : 'green') + '">' + esc(result) + '</div>' +
    '<h2 style="margin:6px 0 2px">' + esc(match.mapName || '?') + '</h2><div class="muted">' + shortDate(match.date) + (duration ? ' · ' + duration : '') + ' · ' + esc(match.game || '') + ' ' + esc(sourceLabel(match.source)) + '</div></div>' +
    '<div class="big">' + esc(match.teamAName) + ' ' + aScore + ' : ' + bScore + ' ' + esc(match.teamBName) + '</div></div>' +
    '<div class="tabs" style="margin:16px 0 0">' + tabs.map(([key, label]) => '<a href="#/matches/' + checksum + '/' + key + '" style="text-decoration:none"><button class="' + (sub === key ? 'active' : 'ghost') + '" style="' + (sub === key ? '' : 'background:transparent;border:1px solid var(--border);color:var(--text)') + '">' + label + '</button></a>').join('') + '</div></div>' +
    '<div id="matchTabBody"></div>';
  const hero = document.querySelector ? document.querySelector('#matchHero') : null;
  if (hero) {
    const nav = document.querySelector('header.top');
    const navHeight = nav && nav.getBoundingClientRect ? nav.getBoundingClientRect().height : 0;
    hero.style.position = 'sticky';
    hero.style.top = navHeight + 'px';
    hero.style.zIndex = '5';
  }
  const body = $('matchTabBody');
  if (sub === 'overview') {
    body.innerHTML = '<div class="card"><div class="dash-cols"><div class="card" style="margin:0;background:var(--card2)"><h2>Match MVP</h2>' +
      (mvp ? '<h3 style="margin:0 0 4px;text-transform:none;letter-spacing:0;color:var(--text);font-size:17px"><a href="#/player/' + mvp.steamId + '">' + esc(mvp.name) + '</a></h3><div>' + ratingPill(mvp.hltvRating2) + ' <span class="muted">' + mvp.killCount + 'K / ' + mvp.deathCount + 'D / ' + mvp.assistCount + 'A · ' + num(mvp.averageDamagePerRound) + ' ADR</span></div>' : '<p class="muted">—</p>') + '</div>' +
      '<div class="card" style="margin:0;background:var(--card2)"><h2>Match facts</h2><div class="muted" style="font-size:13px;line-height:1.9">' + kills.length + ' kills · ' + headshots + ' headshots<br/>' + multiCount + ' multikills · ' + clutches.filter(c => c.won).length + ' clutches won<br/>' + rounds.length + ' rounds</div></div></div>' +
      (highlights.length ? '<h3>Highlights</h3>' + highlights.map((h, i) => '<div class="highlight"><span class="pill ' + (h.kind === 'ace' || h.kind === 'clutch' ? 'green' : 'yellow') + '">' + (i + 1) + '</span> <strong>' + esc(h.title) + '</strong> — ' + esc(h.killer) + '<br/><span class="muted">' + (h.raw ? h.detail : esc(h.detail)) + ' · <a href="#/matches/' + checksum + '/viewer?round=' + h.round + '">watch round ' + h.round + '</a></span></div>').join('') : '') +
      '</div>' +
      '<div class="card">' + scoreChartPlaceholder() + '</div>';
    renderScoreChart(rounds, match.teamAName, match.teamBName);
  } else if (sub === 'players') {
    body.innerHTML = '<div class="card"><h2>Scoreboard</h2>' + teams.map(t => scoreboard(players, t)).join('') + '</div>';
    body.querySelectorAll('tr[data-steam]').forEach(tr => { tr.onclick = () => { location.hash = '#/player/' + tr.dataset.steam; }; });
  } else if (sub === 'rounds') {
    body.innerHTML = '<div class="card"><h2>Rounds (' + rounds.length + ')</h2><table><thead><tr><th>#</th><th>Winner</th><th>Score</th><th>Reason</th></tr></thead><tbody>' +
      [...rounds].sort((a, b) => a.number - b.number).map(r => '<tr><td>' + r.number + '</td><td>' + esc(roundWinnerLabel(r, match)) + '</td><td>' + (r.teamAScore ?? '-') + ' : ' + (r.teamBScore ?? '-') + '</td><td>' + esc(roundEndReasonLabel(r.endReason)) + '</td></tr>').join('') +
      '</tbody></table></div>';
  } else if (sub === 'kills') {
    const roundNumbers = [...new Set(kills.map(k => k.roundNumber))].sort((a, b) => a - b);
    body.innerHTML = '<div class="card"><h2>Kills (' + kills.length + ')</h2><div class="search"><select id="kRoundFilter"><option value="">All rounds</option>' + roundNumbers.map(n => '<option value="' + n + '">Round ' + n + '</option>').join('') + '</select></div><div id="killsTable"></div></div>';
    const tickrate = Number(match.tickrate) || 0;
    const freezeByRound = new Map(rounds.map(r => [r.number, r.freezetimeEndTick]));
    const drawKills = () => {
      const f = $('kRoundFilter').value;
      const list = f === '' ? kills : kills.filter(k => String(k.roundNumber) === f);
      $('killsTable').innerHTML = '<div class="feed">' +
        list.map(k => killFeedEntry(k, tickrate, freezeByRound.get(k.roundNumber))).join('') +
        '</div>';
    };
    $('kRoundFilter').onchange = drawKills;
    drawKills();
  } else if (sub === 'clutches') {
    body.innerHTML = '<div class="card"><h2>Clutches (' + clutches.length + ')</h2>' +
      (clutches.length ? clutches.map(c => '<div class="highlight"><span class="pill ' + (c.won ? 'green' : 'red') + '">1v' + c.opponentCount + '</span> ' + esc(c.clutcherName) + ' <span class="muted">round ' + c.roundNumber + ' · tick ' + c.tick + (c.won ? ' · won' : ' · lost') + '</span></div>').join('') : '<p class="muted">No clutches this match.</p>') + '</div>';
  } else if (sub === 'heatmap') {
    body.innerHTML = '<div class="card"><h2>Kill heatmap</h2><div class="viewer-controls"><select id="hSide"><option value="">Kills + deaths</option><option value="kills">Kills only</option><option value="deaths">Deaths only</option></select><select id="hTeam"><option value="">Both teams</option><option value="3">CT only</option><option value="2">T only</option></select></div><canvas id="hCanvas" class="heat-canvas" width="640" height="640"></canvas><p class="muted" id="hMsg">Loading…</p></div>';
    initHeatmap(checksum, match.mapName, match.game);
  } else if (sub === 'weapons') {
    body.innerHTML = '<div class="card"><h2>Weapons</h2><div id="wBody"><p class="muted">Loading…</p></div></div>';
    initWeaponsTab(checksum);
  } else if (sub === 'duels') {
    body.innerHTML = '<div class="card"><h2>Duels matrix</h2><p class="muted">Kills — deaths for every cross-team pairing. Click a player to open their profile.</p><div id="dBody"><p class="muted">Loading…</p></div></div>';
    initDuelsTab(checksum);
  } else if (sub === 'grenades') {
    body.innerHTML = '<div class="card"><h2>Grenades thrown</h2><div id="gBody"><p class="muted">Loading…</p></div></div>';
    initGrenadesTab(checksum);
  } else if (sub === 'economy') {
    body.innerHTML = '<div class="card"><h2>Economy</h2>' + economyTable(rounds, match) + '</div>';
  } else if (sub === 'chat') {
    body.innerHTML = '<div class="card"><h2>Match chat</h2><div id="cBody"><p class="muted">Loading…</p></div></div>';
    initChatTab(checksum);
  } else if (sub === 'viewer') {
    body.innerHTML = '<div class="card"><h2>2D Viewer</h2><div id="viewerBox"><p class="muted">Loading viewer…</p></div></div>';
    initViewer(checksum, match.mapName, match.game, rounds, kills, Number(query.round) || 0, query.steamId || '');
  } else {
    body.innerHTML = '<div class="card"><p class="muted">Unknown tab.</p></div>';
  }
}
/* ---------- players ---------- */
let playersCache = [];
let playerSort = { key: 'hltvRating2', dir: -1 };
const playerCols = [['name', 'Player'], ['matchCount', 'Matches'], ['killCount', 'K'], ['deathCount', 'D'], ['killDeathRatio', 'K/D'], ['headshotPercentage', 'HS%'], ['averageDamagePerRound', 'ADR'], ['hltvRating2', 'Rating']];
async function renderPlayers(view) {
  view.innerHTML = '<div class="card"><h2>Players</h2><div class="search"><input id="pq" placeholder="Search player…" /></div><div id="plist"><p class="muted">Loading…</p></div></div>';
  const { players } = await get('/api/players');
  playersCache = players;
  const draw = () => {
    const q = ($('pq').value || '').toLowerCase();
    const list = playersCache.filter(p => !q || (p.name || '').toLowerCase().includes(q) || p.steamId.includes(q));
    const { key, dir } = playerSort;
    list.sort((a, b) => {
      const av = key === 'name' ? String(a.name || '') : Number(a[key] || 0);
      const bv = key === 'name' ? String(b.name || '') : Number(b[key] || 0);
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });
    const arrow = (k) => playerSort.key === k ? (playerSort.dir === 1 ? ' ▲' : ' ▼') : '';
    $('plist').innerHTML = '<table><thead><tr>' + playerCols.map(([k, label]) => '<th class="sortable" data-sort="' + k + '">' + label + arrow(k) + '</th>').join('') + '</tr></thead><tbody>' +
      list.map(p => '<tr class="clickable" data-steam="' + p.steamId + '"><td>' + esc(p.name) + '</td><td>' + p.matchCount + '</td><td>' + p.killCount + '</td><td>' + p.deathCount + '</td><td>' + num(p.killDeathRatio, 2) + '</td><td>' + num(p.headshotPercentage) + '</td><td>' + num(p.averageDamagePerRound) + '</td><td>' + ratingPill(p.hltvRating2) + '</td></tr>').join('') + '</tbody></table>';
    $('plist').querySelectorAll('th[data-sort]').forEach(th => { th.onclick = () => { const k = th.dataset.sort; if (playerSort.key === k) playerSort.dir *= -1; else playerSort = { key: k, dir: k === 'name' ? 1 : -1 }; draw(); }; });
    $('plist').querySelectorAll('tr[data-steam]').forEach(tr => { tr.onclick = () => { location.hash = '#/player/' + tr.dataset.steam; }; });
  };
  $('pq').oninput = draw;
  draw();
}
function stat(label, value, cls) { return '<div class="stat"><span>' + label + '</span><strong class="' + (cls || '') + '">' + esc(value ?? '-') + '</strong></div>'; }
function trendChartPlaceholder(history) {
  if (!history.length) return '';
  return '<h3>Form — last ' + history.length + ' matches</h3><div style="position:relative;height:260px"><canvas id="formCanvas"></canvas></div>';
}
function renderFormChart(history) {
  const canvas = $('formCanvas');
  if (!canvas || !history.length) return;
  if (!chartDefaults()) { canvas.outerHTML = '<p class="muted">Chart library failed to load.</p>'; return; }
  if (formChartInstance) { try { formChartInstance.destroy(); } catch (e) {} }
  formChartInstance = new Chart(canvas, {
    data: {
      labels: history.map(h => h.mapName.replace('de_', '') + ' ' + h.date.slice(5, 10)),
      datasets: [
        { type: 'bar', label: 'ADR', data: history.map(h => h.adr), backgroundColor: 'rgba(63,214,140,.55)', borderRadius: 3, yAxisID: 'y' },
        { type: 'line', label: 'Rating 2.0', data: history.map(h => h.rating2), borderColor: '#f0b429', backgroundColor: '#f0b429', tension: .25, pointRadius: 3, pointHoverRadius: 6, yAxisID: 'y1' },
        { type: 'line', label: 'KAST %', data: history.map(h => h.kast), borderColor: '#7cc4ff', backgroundColor: '#7cc4ff', tension: .25, pointRadius: 0, pointHoverRadius: 5, hidden: true, yAxisID: 'y1' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#e8ebf1', usePointStyle: true }, onClick: (e, item, legend) => { const i = item.datasetIndex; const chart = legend.chart; chart.setDatasetVisibility(i, !chart.isDatasetVisible(i)); chart.update(); } },
        tooltip: { callbacks: { title: (items) => history[items[0].dataIndex].mapName + ' · ' + history[items[0].dataIndex].date.slice(0, 10) + ' · K/D ' + history[items[0].dataIndex].killCount + '/' + history[items[0].dataIndex].deathCount } },
      },
      scales: {
        y: { title: { display: true, text: 'ADR' } },
        y1: { position: 'right', title: { display: true, text: 'Rating / KAST' }, grid: { drawOnChartArea: false } },
      },
    },
  });
}
function periodSummary(history) {
  if (history.length < 2) return '';
  const avg = (list, key) => list.reduce((s, h) => s + Number(h[key] || 0), 0) / Math.max(1, list.length);
  const mid = Math.floor(history.length / 2);
  const first = history.slice(0, mid), second = history.slice(mid);
  const rows = [['ADR', 'adr', 1], ['Rating 2.0', 'rating2', 2], ['KAST %', 'kast', 1], ['HS%', 'headshotPercentage', 1]];
  const delta = (a, b, d) => {
    const diff = b - a;
    const cls = diff >= 0 ? 'good' : 'bad';
    const sign = diff > 0 ? '+' : '';
    return '<span class="' + cls + '">' + sign + diff.toFixed(d) + '</span>';
  };
  return '<h3>Progress — first half vs second half (' + history.length + ' matches)</h3>' +
    '<table><thead><tr><th>Stat</th><th>First</th><th>Recent</th><th>Trend</th></tr></thead><tbody>' +
    rows.map(([label, key, d]) => '<tr><td>' + label + '</td><td>' + avg(first, key).toFixed(d) + '</td><td>' + avg(second, key).toFixed(d) + '</td><td>' + delta(avg(first, key), avg(second, key), d) + '</td></tr>').join('') +
    '</tbody></table>';
}
async function renderCompareTable(el, steamId, otherId) {
  try {
    const { players } = await get('/api/players/compare?steamId=' + encodeURIComponent(steamId) + '&steamId=' + encodeURIComponent(otherId));
    const rows = [['Matches', 'matchCount', 0], ['K/D', 'killDeathRatio', 2], ['HS%', 'headshotPercentage', 1], ['ADR', 'averageDamagePerRound', 1], ['KAST %', 'kast', 1], ['Rating 2.0', 'hltvRating2', 2]];
    el.innerHTML = '<table><thead><tr><th>Stat</th>' + players.map(p => '<th>' + esc(p.player.name || p.steamId) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(([label, key, d]) => {
        const vals = players.map(p => Number(p.player[key] || 0));
        const best = Math.max(...vals);
        return '<tr><td>' + label + '</td>' + vals.map(v => '<td class="' + (v === best ? 'good' : '') + '">' + (d === 0 ? Math.round(v) : v.toFixed(d)) + (key === 'kast' || key === 'headshotPercentage' ? '%' : '') + '</td>').join('') + '</tr>';
      }).join('') + '</tbody></table>';
  } catch (e) { el.innerHTML = '<p class="muted">Compare failed: ' + esc(e.message) + '</p>'; }
}
async function renderPlayer(view, steamId) {
  view.innerHTML = '<div class="card"><p class="muted">Loading player…</p></div>';
  const [{ player, lastMatches }, { history }] = await Promise.all([
    get('/api/players/' + encodeURIComponent(steamId)),
    get('/api/players/' + encodeURIComponent(steamId) + '/history?limit=60'),
  ]);
  const kd = Number(player.killDeathRatio || 0);
  view.innerHTML = '<div class="card"><a href="#/players">&larr; Players</a><h2 style="margin:8px 0 2px">' + esc(player.name || steamId) + '</h2><div class="muted" style="margin-bottom:12px">' + esc(steamId) + '</div>' +
    '<div class="stats-grid">' +
    stat('Matches', player.matchCount) + stat('K / D / A', player.killCount + ' / ' + player.deathCount + ' / ' + player.assistCount) +
    stat('K/D', kd.toFixed(2), kd >= 1 ? 'good' : 'bad') + stat('HS%', num(player.headshotPercentage) + '%') +
    stat('ADR', num(player.averageDamagePerRound)) + stat('KAST', num(player.kast) + '%') +
    '<div class="stat"><span>Rating 2.0</span><strong>' + ratingPill(player.hltvRating2) + '</strong></div>' + stat('MVPs', player.mvpCount) +
    stat('3k / 4k / 5k', player.threeKillCount + ' / ' + player.fourKillCount + ' / ' + player.fiveKillCount) +
    stat('Entry kills', player.firstKillCount) + stat('Bombs planted', player.bombPlantedCount) + stat('Bombs defused', player.bombDefusedCount) +
    '</div>' +
    '<h3>Form filters</h3><div class="row"><input id="phMap" placeholder="Map, e.g. de_mirage" /><input id="phFrom" type="date" /><input id="phTo" type="date" /><button id="phGo" style="flex:0 0 auto">Apply</button></div>' +
    '<div id="phBody">' + trendChartPlaceholder(history) + periodSummary(history) + '</div>' +
    '<h3>Compare with a friend</h3><div class="row"><input id="cmpId" placeholder="Friend Steam ID" /><button id="cmpGo" class="ghost" style="flex:0 0 auto">Compare</button></div><div id="cmpBody" style="margin-top:8px"></div>' +
    '<h3>Last matches</h3>' +
    (lastMatches || []).map(m => '<div class="match"><a href="#/matches/' + (m.checksum || m.matchChecksum) + '"><strong>' + esc(m.mapName || '?') + '</strong></a> <span class="muted">' + esc(String(m.date || '').slice(0, 10)) + ' · ' + esc(m.focusTeamName || '') + ' ' + (m.scoreTeamA ?? '?') + ':' + (m.scoreTeamB ?? '?') + '</span></div>').join('') + '</div>';
  renderFormChart(history);
  $('phGo').onclick = async () => {
    $('phBody').innerHTML = '<p class="muted">Loading…</p>';
    try {
      const params = new URLSearchParams({ limit: '60' });
      if ($('phMap').value.trim()) params.set('map', $('phMap').value.trim());
      if ($('phFrom').value) params.set('from', $('phFrom').value);
      if ($('phTo').value) params.set('to', $('phTo').value + 'T23:59:59');
      const { history: filtered } = await get('/api/players/' + encodeURIComponent(steamId) + '/history?' + params.toString());
      $('phBody').innerHTML = trendChartPlaceholder(filtered) + periodSummary(filtered);
      renderFormChart(filtered);
    } catch (e) { $('phBody').innerHTML = '<p class="muted">Failed to load: ' + esc(e.message) + '</p>'; }
  };
  $('cmpGo').onclick = () => {
    const other = $('cmpId').value.trim();
    if (!other) return;
    $('cmpBody').innerHTML = '<p class="muted">Loading…</p>';
    renderCompareTable($('cmpBody'), steamId, other);
  };
}
/* ---------- users ---------- */
async function renderUsers(view) {
  view.innerHTML = '<div class="card"><h2>Linked users</h2><p class="muted">Link your friends\u2019 Steam IDs so their matches and highlights are one click away. Names and avatars resolve automatically once they have analyzed matches.</p>' +
    '<div class="row"><input id="uSteam" placeholder="Steam ID, e.g. 76561198000000000" /><input id="uName" placeholder="Display name (optional)" /><button id="uLink" style="flex:0 0 auto">Link user</button></div>' +
    '<p id="uMsg" class="muted"></p><div id="ulist" class="user-grid"><p class="muted">Loading…</p></div></div>';
  const draw = async () => {
    const { users } = await get('/api/users');
    $('ulist').innerHTML = users.map(u =>
      '<div class="user-card"><h3>' + (u.avatar ? '<img class="avatar" src="' + esc(u.avatar) + '" alt="" />' : '') + esc(u.displayName) + '</h3>' +
      '<div class="muted" style="font-size:12px;margin-bottom:8px">' + esc(u.steamId) + '</div>' +
      '<div>' + ratingPill(u.rating2) + ' <span class="muted">' + u.matchCount + ' matches' + (u.lastMatchDate ? ' · last ' + esc(u.lastMatchDate.slice(0, 10)) : '') + '</span></div>' +
      '<p style="margin:8px 0 0"><a href="#/player/' + u.steamId + '">View profile</a> · <a href="#" data-unlink="' + u.steamId + '">Unlink</a></p></div>'
    ).join('') || '<p class="muted">No linked users yet. Link your first friend above.</p>';
    $('ulist').querySelectorAll('[data-unlink]').forEach(a => {
      a.onclick = async (e) => {
        e.preventDefault();
        await fetch(base() + '/api/users/' + encodeURIComponent(a.dataset.unlink), { method: 'DELETE', headers: headers() });
        draw().catch(err => { $('uMsg').textContent = err.message; });
      };
    });
  };
  $('uLink').onclick = async () => {
    $('uMsg').textContent = 'Linking…';
    try {
      const res = await fetch(base() + '/api/users', { method: 'POST', headers: headers(true), body: JSON.stringify({ steamId: $('uSteam').value.trim(), displayName: $('uName').value.trim() }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status));
      $('uSteam').value = ''; $('uName').value = '';
      $('uMsg').textContent = 'Linked.';
      const { users } = body;
      $('ulist').innerHTML = users.map(u =>
        '<div class="user-card"><h3>' + esc(u.displayName) + '</h3><div class="muted" style="font-size:12px;margin-bottom:8px">' + esc(u.steamId) + '</div>' +
        '<div>' + ratingPill(u.rating2) + ' <span class="muted">' + u.matchCount + ' matches</span></div>' +
        '<p style="margin:8px 0 0"><a href="#/player/' + u.steamId + '">View profile</a></p></div>'
      ).join('');
      draw().catch(() => {});
    } catch (e) { $('uMsg').textContent = e.message; }
  };
  await draw();
}
/* ---------- downloads (share codes) ---------- */
let viewTimer = null;
async function renderDownloads(view) {
  const storedSteamId = (conn().steamId || '');
  view.innerHTML = '<div class="card"><h2>Download from share codes</h2>' +
    '<p class="muted">Paste Valve match share codes (one per line). Automatic per-user tracking lives in <a href="#/settings">Settings → Automatic match tracking</a>.</p>' +
    '<textarea id="dCodes" rows="4" placeholder="CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"></textarea>' +
    '<div class="row" style="margin-top:8px"><input id="dSteam" placeholder="Attribute to Steam ID (optional)" value="' + esc(storedSteamId) + '" /><button id="dGo" style="flex:0 0 auto">Download & analyze</button></div>' +
    '<p id="dMsg" class="muted"></p></div>' +
    '<div class="card"><h2>Download queue</h2><button id="dRetry" class="ghost">Retry failed downloads</button><div id="djobs"><p class="muted">Loading…</p></div></div>';
  const drawJobs = async () => {
    try {
      const { jobs } = await get('/api/share-codes');
      const el = $('djobs');
      if (!el) return;
      el.innerHTML = jobs.map(j =>
        '<div class="job"><span class="pill ' + (j.status === 'completed' ? 'green' : (j.status === 'failed' ? 'red' : 'yellow')) + '">' + j.status + '</span> ' +
        '<code>' + esc(j.shareCode) + '</code>' + (j.steamId ? ' <span class="muted">→ <a href="#/player/' + j.steamId + '">' + esc(j.steamId) + '</a></span>' : '') +
        (j.error ? '<br/><span class="bad">' + esc(j.error) + '</span>' : '') +
        (j.demoPath ? '<br/><span class="muted">' + esc(j.demoPath.split('/').pop()) + '</span>' : '') + '</div>'
      ).join('') || '<p class="muted">Queue is empty.</p>';
    } catch (e) { /* view may have changed */ }
  };
  $('dRetry').onclick = async () => {
    const res = await fetch(base() + '/api/share-codes/retry', { method: 'POST', headers: headers(true) });
    if (!res.ok) { $('dMsg').textContent = 'Could not retry downloads.'; return; }
    await drawJobs();
  };
  $('dGo').onclick = async () => {
    const codes = $('dCodes').value.split(/\\s+/).map(s => s.trim()).filter(Boolean);
    if (!codes.length) { $('dMsg').textContent = 'Paste at least one share code.'; return; }
    $('dMsg').textContent = 'Queueing ' + codes.length + ' code(s)…';
    try {
      const res = await fetch(base() + '/api/share-codes', { method: 'POST', headers: headers(true), body: JSON.stringify({ shareCodes: codes, steamId: $('dSteam').value.trim() || undefined }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status));
      $('dCodes').value = '';
      $('dMsg').textContent = 'Queued. Downloads run one at a time.';
      drawJobs().catch(() => {});
    } catch (e) { $('dMsg').textContent = e.message; }
  };
  await drawJobs();
  viewTimer = setInterval(drawJobs, 5000);
}
/* ---------- highlights / upload ---------- */
function highlightViewerLink(h) {
  const steam = h.killerSteamId ? '&steamId=' + encodeURIComponent(h.killerSteamId) : '';
  return '#/matches/' + h.matchChecksum + '/viewer?round=' + h.roundNumber + steam;
}
async function renderHighlights(view) {
  view.innerHTML = '<div class="card"><h2>Highlights</h2><p class="muted">Clutches and 3+ kill rounds. Watch plays the highlight window in 2D. Record .webm saves it in your browser; Render video queues a 1080p in-game MP4 on the Linux worker.</p>' +
    '<div class="row"><select id="hlKind"><option value="">Clutches + multikills</option><option value="clutch">Clutches only</option><option value="multi-kill">Multikills only</option></select>' +
    '<input id="hlMap" placeholder="Map, e.g. de_mirage" /><input id="hlLimit" type="number" min="1" max="200" value="50" style="flex:0 1 110px" /><button id="hlGo" style="flex:0 0 auto">Filter</button></div>' +
    '<div id="hl"><p class="muted">Loading…</p></div></div><div class="card"><h2>Rendered videos</h2><div id="renderJobs">Loading…</div></div>';
  const draw = async () => {
    const params = new URLSearchParams();
    const steamId = (conn().steamId || '').trim();
    if (steamId) params.set('steamId', steamId);
    if ($('hlKind').value) params.set('kind', $('hlKind').value);
    if ($('hlMap').value.trim()) params.set('map', $('hlMap').value.trim());
    params.set('limit', String(Math.min(200, Math.max(1, Number($('hlLimit').value) || 50))));
    try {
      const { highlights } = await get('/api/highlights?' + params.toString());
      $('hl').innerHTML = highlights.map(h =>
        '<div class="highlight"><span class="pill ' + (h.kind === 'clutch' ? 'green' : 'yellow') + '">' + h.kind + '</span> ' + esc(h.detail) + ' — <a href="#/matches/' + h.matchChecksum + '">' + esc(h.mapName) + ' R' + h.roundNumber + '</a><br/><span class="muted">' + esc(h.killerName) + ' · tick ' + h.tick + ' · ' + esc(String(h.date || '').slice(0, 10)) + '</span><br/>' +
        '<span style="font-size:12px"><a href="' + highlightViewerLink(h) + '">Watch</a> · <a href="#" data-clip="' + h.matchChecksum + '|' + h.roundNumber + '|' + esc(h.killerSteamId || '') + '">Clip ticks</a> · <a href="' + base() + '/api/matches/' + h.matchChecksum + '/clips/export">Video config</a> · <a href="#" data-render="' + h.matchChecksum + '|' + h.roundNumber + '|' + esc(h.killerSteamId || '') + '">Render video</a></span><span class="muted" data-clipmsg style="font-size:12px"></span></div>'
      ).join('') || '<p class="muted">No highlights yet.</p>';
      $('hl').querySelectorAll('[data-render]').forEach(a => {
        a.onclick = async (e) => {
          e.preventDefault();
          const [checksum, round, steamId] = a.dataset.render.split('|');
          const msg = a.parentElement.parentElement.querySelector('[data-clipmsg]');
          try {
            const res = await fetch(base() + '/api/render-jobs', { method: 'POST', headers: headers(true), body: JSON.stringify({ checksum, roundNumber: Number(round), steamId }) });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Could not queue video.');
            if (msg) msg.textContent = ' Video queued. The Linux Steam worker must be running and logged in.';
            await drawRenderJobs();
          } catch (err) { if (msg) msg.textContent = ' ' + err.message; }
        };
      });
      $('hl').querySelectorAll('[data-clip]').forEach(a => {
        a.onclick = async (e) => {
          e.preventDefault();
          const [checksum, round, steam] = a.dataset.clip.split('|');
          const msg = a.parentElement.parentElement.querySelector('[data-clipmsg]');
          if (msg) msg.textContent = ' loading clip…';
          try {
            const { clip } = await get('/api/matches/' + encodeURIComponent(checksum) + '/rounds/' + round + '/clip?steamId=' + encodeURIComponent(steam));
            if (msg) msg.textContent = ' ticks ' + clip.startTick + '–' + clip.endTick + ' (' + Math.round((clip.endTick - clip.startTick) / clip.tickrate) + 's) — open Watch, then Record .webm.';
          } catch (err) { if (msg) msg.textContent = ' ' + err.message; }
        };
      });
    } catch (e) { $('hl').innerHTML = '<p class="muted">Failed to load: ' + esc(e.message) + '</p>'; }
  };
  const drawRenderJobs = async () => {
    const el = $('renderJobs');
    if (!el) return;
    try {
      const { jobs } = await get('/api/render-jobs');
      if (!el.isConnected) return;
      el.innerHTML = jobs.map(job => '<div class="job"><span class="pill">' + esc(job.status) + '</span> Round ' + job.round_number +
        (job.error ? '<p class="bad">' + esc(job.error) + '</p>' : '') +
        (job.status === 'completed' ? '<p><a href="' + base() + '/api/render-jobs/' + job.id + '/video" target="_blank" rel="noopener">Play / download MP4</a></p>' : '') + '</div>').join('') || '<p class="muted">No rendered videos yet.</p>';
    } catch (e) { if (el.isConnected) el.textContent = e.message; }
  };
  $('hlGo').onclick = draw;
  await draw();
  await drawRenderJobs();
  viewTimer = setInterval(drawRenderJobs, 5000);
}
/* ---------- upload (Leetify-style auto-import hub) ---------- */
const uploadJobs = [];
function renderUpload(view) {
  view.innerHTML = '<div class="card"><h2>Upload demos</h2>' +
    '<div id="dropzone" class="dropzone"><strong>Drop .dem files here</strong><br/>or click to choose — demos are analyzed with positions so the 2D viewer and highlights work</div>' +
    '<input id="file" type="file" accept=".dem" multiple hidden />' +
    '<div id="upJobs" style="margin-top:12px"></div>' +
    '<p class="muted" style="font-size:12px">You can also copy files into <code>inbox/&lt;steam-id&gt;/</code> on the server, or let auto-import fetch your Valve matches automatically (<a href="#/settings">Settings → Automatic match tracking</a>).</p></div>';
  const dz = $('dropzone');
  const fileInput = $('file');
  dz.onclick = () => fileInput.click();
  dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('drag'); };
  dz.ondragleave = () => dz.classList.remove('drag');
  dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('drag'); handleUploadFiles(e.dataTransfer.files); };
  fileInput.onchange = () => { handleUploadFiles(fileInput.files); fileInput.value = ''; };
  drawUploadJobs();
  viewTimer = setInterval(pollUploadQueue, 2000);
}
function handleUploadFiles(fileList) {
  const steamId = (conn().steamId || '').trim();
  const query = steamId ? '?steamId=' + encodeURIComponent(steamId) : '';
  const files = [...fileList].filter((f) => f.name.toLowerCase().endsWith('.dem'));
  if (!files.length) return;
  for (const file of files) {
    const job = { name: file.name, status: 'uploading', progress: 0, demoPath: null, error: '', checksum: null };
    uploadJobs.unshift(job);
    void uploadDemoFile(job, file, query);
  }
  if (uploadJobs.length > 30) uploadJobs.length = 30;
  drawUploadJobs();
}
function uploadDemoFile(job, file, query) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', base() + '/api/demos/upload' + query);
    // Percent-encode the filename so non ASCII characters (é, ě, 체…) survive the HTTP header.
    xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));
    const token = (conn().token || '').trim();
    if (token) xhr.setRequestHeader('authorization', 'Bearer ' + token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        job.progress = Math.round((e.loaded / e.total) * 100);
        drawUploadJobs();
      }
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status === 201) {
          job.demoPath = body.demoPath;
          job.status = 'queued';
        } else {
          job.status = 'failed';
          job.error = body.error || ('HTTP ' + xhr.status);
        }
      } catch (e) {
        job.status = 'failed';
        job.error = 'Unexpected server response (HTTP ' + xhr.status + ')';
      }
      drawUploadJobs();
      resolve();
    };
    xhr.onerror = () => {
      job.status = 'failed';
      job.error = 'Network error during upload — check the server address and your connection.';
      drawUploadJobs();
      resolve();
    };
    xhr.send(file);
  });
}
function drawUploadJobs() {
  const el = $('upJobs');
  if (!el) return;
  const labels = { uploading: 'uploading', queued: 'queued', processing: 'analyzing', analyzed: 'analyzed', failed: 'failed' };
  el.innerHTML = uploadJobs.map((job, index) => {
    let status;
    let msg = job.error ? '<span class="bad">' + esc(job.error) + '</span>' : '';
    if (job.status === 'uploading') {
      status = '<div class="progress"><div style="width:' + job.progress + '%"></div></div>';
      msg = '<span class="msg">' + job.progress + '%</span>';
    } else {
      const cls = job.status === 'analyzed' ? 'green' : (job.status === 'failed' ? 'red' : 'yellow');
      status = '<span class="pill ' + cls + '">' + (labels[job.status] || job.status) + '</span>';
      if (job.status === 'analyzed' && job.checksum) {
        msg = '<span class="msg"><a href="#/matches/' + job.checksum + '">open match</a></span>';
      } else if (job.status === 'failed' && !job.error) {
        msg = '<span class="msg">Analysis failed — see the queue status in Settings.</span>';
      } else {
        msg = '<span class="msg">' + msg + '</span>';
      }
    }
    return '<div class="upload-job" data-job="' + index + '"><span class="name">' + esc(job.name) + '</span>' + status + msg + '</div>';
  }).join('') || '<p class="muted">No uploads yet — drop your first demo above.</p>';
}
async function pollUploadQueue() {
  if (!uploadJobs.some((j) => j.demoPath && (j.status === 'queued' || j.status === 'processing'))) return;
  try {
    const details = await get('/api/queue');
    const byPath = new Map(details.jobs.map((j) => [j.demoPath, j]));
    let changed = false;
    for (const job of uploadJobs) {
      if (!job.demoPath || job.status === 'analyzed' || job.status === 'failed') continue;
      if (details.processing === job.demoPath) {
        if (job.status !== 'processing') { job.status = 'processing'; changed = true; }
        continue;
      }
      const detail = byPath.get(job.demoPath);
      if (detail && detail.status !== 'queued') {
        const next = detail.status;
        if (next !== job.status || (detail.checksum && detail.checksum !== job.checksum) || (detail.error && detail.error !== job.error)) {
          job.status = next;
          if (detail.checksum) job.checksum = detail.checksum;
          if (detail.error) job.error = detail.error;
          changed = true;
        }
      } else if (details.pending.includes(job.demoPath) && job.status !== 'queued') {
        job.status = 'queued';
        changed = true;
      }
    }
    if (changed) drawUploadJobs();
  } catch (e) { /* transient */ }
}
/* ---- match extra tabs ---- */
async function initHeatmap(checksum, mapName, game) {
  const canvas = $('hCanvas');
  const msg = $('hMsg');
  try {
    const [{ points }, { map }] = await Promise.all([
      get('/api/matches/' + encodeURIComponent(checksum) + '/heatmap'),
      get('/api/maps?game=' + encodeURIComponent(game || 'cs2') + '&name=' + encodeURIComponent(mapName || '')),
    ]);
    if (!points.length) { if (msg) msg.textContent = 'No kills recorded.'; return; }
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = base() + map.radarUrl; });
    const draw = () => {
      if (!$('hCanvas')) return;
      const kind = $('hSide').value;
      const team = $('hTeam').value;
      const list = points.filter(p => (kind === '' || p.kind === kind) && (team === '' || String(p.side) === team));
      const ctx = canvas.getContext('2d');
      const S = 640;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, S, S);
      ctx.drawImage(img, 0, 0, S, S);
      for (const p of list) {
        const px = ((p.x - map.posX) / map.scale) * S / map.radarSize;
        const py = ((map.posY - p.y) / map.scale) * S / map.radarSize;
        ctx.beginPath();
        ctx.arc(px, py, p.kind === 'kill' ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = p.kind === 'kill' ? (p.side === 3 ? 'rgba(74,168,255,.8)' : 'rgba(240,180,41,.8)') : 'rgba(240,75,90,.7)';
        ctx.fill();
      }
      if (msg) msg.textContent = list.length + ' of ' + points.length + ' events shown.';
    };
    $('hSide').onchange = draw;
    $('hTeam').onchange = draw;
    draw();
  } catch (e) { if (msg) msg.textContent = 'Heatmap unavailable: ' + e.message; }
}
async function initWeaponsTab(checksum) {
  const el = $('wBody');
  try {
    const { weapons } = await get('/api/matches/' + encodeURIComponent(checksum) + '/weapons');
    const byPlayer = new Map();
    for (const w of weapons) {
      if (!byPlayer.has(w.steamId)) byPlayer.set(w.steamId, { name: w.name, steamId: w.steamId, rows: [] });
      byPlayer.get(w.steamId).rows.push(w);
    }
    el.innerHTML = [...byPlayer.values()].map(p =>
      '<div class="team-title"><a href="#/player/' + p.steamId + '">' + esc(p.name) + '</a></div>' +
      '<table><thead><tr><th>Weapon</th><th>Shots</th><th>Hits</th><th>Accuracy</th><th>Kills</th><th>HS</th><th>Damage</th></tr></thead><tbody>' +
      p.rows.map(w => '<tr><td>' + weaponImg(w.weapon, 18) + ' ' + esc(w.weapon) + '</td><td>' + w.shots + '</td><td>' + w.hits + '</td><td><div class="acc-bar"><div style="width:' + Math.min(100, w.accuracy) + '%"></div></div> ' + w.accuracy + '%</td><td>' + w.kills + '</td><td>' + w.headshots + '</td><td>' + w.damage + '</td></tr>').join('') +
      '</tbody></table>'
    ).join('') || '<p class="muted">No weapon data.</p>';
  } catch (e) { el.innerHTML = '<p class="muted">Weapons unavailable: ' + esc(e.message) + '</p>'; }
}
async function initDuelsTab(checksum) {
  const el = $('dBody');
  try {
    const { duels } = await get('/api/matches/' + encodeURIComponent(checksum) + '/duels');
    const killers = [...new Map(duels.map(d => [d.killerSteamId, d.killerName])).entries()];
    const victims = [...new Map(duels.map(d => [d.victimSteamId, d.victimName])).entries()];
    const cell = new Map(duels.map(d => [d.killerSteamId + '|' + d.victimSteamId, d]));
    el.innerHTML = '<div style="overflow-x:auto"><table><thead><tr><th>Killer / Victim</th>' + victims.map(([id, name]) => '<th><a href="#/player/' + id + '">' + esc(name) + '</a></th>').join('') + '</tr></thead><tbody>' +
      killers.map(([kid, kname]) => '<tr><td><a href="#/player/' + kid + '">' + esc(kname) + '</a></td>' + victims.map(([vid]) => {
        const d = cell.get(kid + '|' + vid);
        if (!d || (d.killCount === 0 && d.deathCount === 0)) return '<td class="muted">–</td>';
        const diff = d.killCount - d.deathCount;
        return '<td class="' + (diff > 0 ? 'good' : (diff < 0 ? 'bad' : '')) + '">' + d.killCount + '–' + d.deathCount + '</td>';
      }).join('') + '</tr>').join('') + '</tbody></table></div>';
  } catch (e) { el.innerHTML = '<p class="muted">Duels unavailable: ' + esc(e.message) + '</p>'; }
}
async function initGrenadesTab(checksum) {
  const el = $('gBody');
  try {
    const { grenades } = await get('/api/matches/' + encodeURIComponent(checksum) + '/grenades');
    el.innerHTML = '<table><thead><tr><th>Player</th><th>Smokes</th><th>Flashes</th><th>HE</th><th>Molotovs</th><th>Decoys</th><th>Total</th></tr></thead><tbody>' +
      grenades.map(g => '<tr class="clickable" data-steam="' + g.steamId + '"><td>' + esc(g.name) + '</td><td>' + g.smokes + '</td><td>' + g.flashes + '</td><td>' + g.hes + '</td><td>' + g.molotovs + '</td><td>' + g.decoys + '</td><td><strong>' + (g.smokes + g.flashes + g.hes + g.molotovs + g.decoys) + '</strong></td></tr>').join('') +
      '</tbody></table>';
    el.querySelectorAll('tr[data-steam]').forEach(tr => { tr.onclick = () => { location.hash = '#/player/' + tr.dataset.steam; }; });
  } catch (e) { el.innerHTML = '<p class="muted">Grenades unavailable: ' + esc(e.message) + '</p>'; }
}
function economyTable(rounds, match) {
  const rs = [...rounds].sort((a, b) => a.number - b.number);
  let aSpent = 0, bSpent = 0;
  const rows = rs.map(r => {
    aSpent += Number(r.teamAMoneySpent) || 0;
    bSpent += Number(r.teamBMoneySpent) || 0;
    return '<tr><td>' + r.number + '</td><td>' + esc(roundWinnerLabel(r, match)) + '</td>' +
      '<td>' + (r.teamAStartMoney ?? '-') + '</td><td>' + (r.teamAMoneySpent ?? '-') + '</td><td>' + esc(r.teamAEconomyType || '-') + '</td>' +
      '<td>' + (r.teamBStartMoney ?? '-') + '</td><td>' + (r.teamBMoneySpent ?? '-') + '</td><td>' + esc(r.teamBEconomyType || '-') + '</td></tr>';
  }).join('');
  return '<table><thead><tr><th>R</th><th>Winner</th><th>' + esc(match.teamAName) + ' $</th><th>Spent</th><th>Type</th><th>' + esc(match.teamBName) + ' $</th><th>Spent</th><th>Type</th></tr></thead><tbody>' + rows +
    '</tbody></table><p class="muted">Total spent — ' + esc(match.teamAName) + ': $' + aSpent.toLocaleString() + ' · ' + esc(match.teamBName) + ': $' + bSpent.toLocaleString() + '</p>';
}
async function initChatTab(checksum) {
  const el = $('cBody');
  try {
    const { messages } = await get('/api/matches/' + encodeURIComponent(checksum) + '/chat');
    el.innerHTML = messages.map(m =>
      '<div class="highlight"><span class="muted">R' + m.roundNumber + ' · tick ' + m.tick + '</span> <strong>' + esc(m.senderName) + '</strong>' + (m.senderIsAlive ? '' : ' <span class="muted">†</span>') + ': ' + esc(m.message) + '</div>'
    ).join('') || '<p class="muted">No chat messages recorded.</p>';
  } catch (e) { el.innerHTML = '<p class="muted">Chat unavailable: ' + esc(e.message) + '</p>'; }
}
/* ---------- 2D viewer ---------- */
/* ---- 2D viewer ---- */
let viewer = null;
let viewerRecorder = null;
function stopViewer() {
  if (viewerRecorder) { try { viewerRecorder.stop(); } catch (e) {} viewerRecorder = null; }
  if (!viewer) return;
  pauseViewer();
  if (viewer.resizeHandler) window.removeEventListener('resize', viewer.resizeHandler);
  viewer = null;
}
async function initViewer(checksum, mapName, game, rounds, kills, initialRound, clipSteamId) {
  const box = $('viewerBox');
  if (!box) return;
  stopViewer();
  const sorted = [...rounds].sort((a, b) => a.number - b.number);
  box.innerHTML = '<div class="viewer-controls"><select id="vRound">' + sorted.map(r => '<option value="' + r.number + '">Round ' + r.number + '</option>').join('') + '</select>' +
    '<button id="vPlay">Play</button><input id="vSlider" type="range" min="0" max="0" value="0" /><select id="vSpeed"><option value="1">1x</option><option value="2">2x</option><option value="4">4x</option><option value="0.5">0.5x</option></select>' +
    '<button id="vRecord" class="ghost" title="Record this round from the 2D viewer as a .webm clip">Record .webm</button>' +
    '<span id="vTick" class="muted"></span></div><canvas id="vCanvas" class="viewer"></canvas><div id="vFeed" class="killfeed"></div><p class="muted" id="vClipMsg" style="font-size:12px"></p>';
  viewer = { checksum, mapName, game, clipSteamId, loadId: 0, rounds: sorted, kills, img: null, transform: null, byTick: new Map(), ticks: [], tickFloat: 0, playing: false, raf: 0, lastTs: 0, speed: 1, tickrate: 64, grenades: null, roundNumber: 0, startTick: 0, endTick: 0, resizeHandler: null };
  if (!viewer.bombImgCached && typeof Image !== 'undefined') { viewer.bombImgCached = new Image(); viewer.bombImgCached.src = base() + '/static/icons/weapons/bomb-icon.svg'; }
  viewer.bombImg = viewer.bombImgCached;
  $('vRound').onchange = () => loadViewerRound(Number($('vRound').value));
  $('vPlay').onclick = toggleViewerPlay;
  $('vRecord').onclick = toggleViewerRecording;
  $('vSpeed').onchange = () => { if (viewer) viewer.speed = Number($('vSpeed').value); };
  $('vSlider').oninput = () => { if (!viewer) return; pauseViewer(); const b = $('vPlay'); if (b) b.textContent = 'Play'; viewer.tickFloat = viewer.startTick + Number($('vSlider').value); drawViewerFrame(); };
  viewer.resizeHandler = () => { fitViewerCanvas(); drawViewerFrame(); };
  window.addEventListener('resize', viewer.resizeHandler);
  const firstRound = sorted.some(r => r.number === initialRound) ? initialRound : (sorted.length ? sorted[0].number : 1);
  $('vRound').value = String(firstRound);
  await loadViewerRound(firstRound);
}
function toggleViewerRecording() {
  if (!viewer || !viewer.ticks.length || !viewer.transform) return;
  const btn = $('vRecord');
  const msg = $('vClipMsg');
  if (viewerRecorder) { viewerRecorder.stop(); return; }
  const canvas = $('vCanvas');
  if (!canvas || !canvas.captureStream || typeof MediaRecorder === 'undefined') {
    if (msg) msg.textContent = 'Recording is not supported in this browser.';
    return;
  }
  const roundNumber = viewer.roundNumber;
  const checksum = viewer.checksum;
  const chunks = [];
  let stream;
  let rec;
  try {
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mime) throw new Error('WebM recording is not supported in this browser.');
    pauseViewer();
    viewer.tickFloat = viewer.startTick;
    viewer.speed = 1;
    $('vSpeed').value = '1';
    drawViewerFrame();
    stream = canvas.captureStream(30);
    rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 });
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
      if (viewerRecorder === rec) viewerRecorder = null;
      if (btn && btn.isConnected) btn.textContent = 'Record .webm';
      if (msg && msg.isConnected) msg.textContent = chunks.length ? 'Clip saved.' : 'No video frames were recorded.';
      if (!chunks.length) return;
      const blob = new Blob(chunks, { type: rec.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'csdm-' + checksum + '-round-' + roundNumber + '.webm';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
    rec.onerror = () => { if (msg) msg.textContent = 'Video recording failed.'; if (rec.state !== 'inactive') rec.stop(); };
    viewerRecorder = rec;
    rec.start(250);
    if (btn) btn.textContent = 'Stop & save';
    if (msg) msg.textContent = 'Recording round ' + roundNumber + '… saves automatically at the end.';
    toggleViewerPlay();
  } catch (e) {
    viewerRecorder = null;
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (msg) msg.textContent = 'Could not start recording: ' + e.message;
  }
}
function fitViewerCanvas() {
  if (!viewer) return 640;
  const canvas = $('vCanvas');
  if (!canvas || !canvas.parentElement) return 640;
  const cssWidth = Math.max(320, Math.min(960, canvas.parentElement.clientWidth || 640));
  const dpr = Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const size = Math.min(2048, Math.round(cssWidth * dpr));
  canvas.width = size;
  canvas.height = size;
  canvas.style.aspectRatio = '1 / 1';
  return size;
}
async function loadViewerRound(roundNumber) {
  if (!viewer) return;
  pauseViewer();
  if (viewerRecorder && viewerRecorder.state !== 'inactive') viewerRecorder.stop();
  const current = viewer;
  const loadId = ++current.loadId;
  current.ticks = [];
  current.byTick = new Map();
  current.transform = null;
  current.grenades = null;
  const box = $('viewerBox');
  try {
    const [{ positions, tickrate, grenades, shots }, { map }] = await Promise.all([
      get('/api/matches/' + encodeURIComponent(viewer.checksum) + '/positions?round=' + roundNumber),
      get('/api/maps?game=' + encodeURIComponent(viewer.game || 'cs2') + '&name=' + encodeURIComponent(viewer.mapName || '')),
    ]);
    if (viewer !== current || current.loadId !== loadId) return;
    if (!map) throw new Error('Map radar or transform is unavailable.');
    viewer.shots = shots || [];
    viewer.tracerSeen = new Set();
    viewer.tracers = [];
    if (!positions.length) { const f = box.querySelector('#vFeed'); if (f) f.innerHTML = '<p class="muted">No position data for this round (demo analyzed without positions).</p>'; viewer.byTick = new Map(); viewer.ticks = []; drawViewerFrame(); return; }
    viewer.transform = map;
    viewer.roundNumber = roundNumber;
    viewer.tickrate = Number(tickrate) || 64;
    viewer.grenades = grenades;
    viewer.byTick = new Map();
    for (const p of positions) { if (!viewer.byTick.has(p.tick)) viewer.byTick.set(p.tick, []); viewer.byTick.get(p.tick).push(p); }
    viewer.ticks = [...viewer.byTick.keys()].sort((a, b) => a - b);
    const round = viewer.rounds.find(r => r.number === roundNumber);
    viewer.startTick = viewer.ticks[0];
    viewer.endTick = (round && (round.endOfficiallyTick || round.endTick)) || viewer.ticks[viewer.ticks.length - 1];
    if (viewer.clipSteamId) {
      const { clip } = await get('/api/matches/' + encodeURIComponent(viewer.checksum) + '/rounds/' + roundNumber + '/clip?steamId=' + encodeURIComponent(viewer.clipSteamId));
      if (viewer !== current || current.loadId !== loadId) return;
      viewer.startTick = Math.max(viewer.startTick, clip.startTick);
      viewer.endTick = Math.min(viewer.endTick, clip.endTick);
    }
    viewer.tickFloat = viewer.startTick;
    const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = base() + map.radarUrl; });
    if (viewer !== current || current.loadId !== loadId) return;
    viewer.img = image;
    fitViewerCanvas();
    const sl = $('vSlider'); if (sl) { sl.max = String(Math.max(0, viewer.endTick - viewer.startTick)); sl.value = '0'; }
    const b = $('vPlay'); if (b) b.textContent = 'Play';
    drawViewerFrame();
  } catch (e) { if (viewer !== current || current.loadId !== loadId) return; const f = box.querySelector('#vFeed'); if (f) f.innerHTML = '<p class="muted">Viewer unavailable: ' + esc(e.message) + '</p>'; }
}
function viewerXY(x, y, S) {
  const t = viewer.transform;
  return [((x - t.posX) / t.scale) * S / t.radarSize, ((t.posY - y) / t.scale) * S / t.radarSize];
}
function viewerSnapshot() {
  const tf = viewer.tickFloat;
  const ticks = viewer.ticks;
  if (!ticks.length) return [];
  let lo = 0;
  while (lo < ticks.length - 1 && ticks[lo + 1] <= tf) lo++;
  const a = viewer.byTick.get(ticks[lo]) || [];
  const bTick = ticks[lo + 1];
  if (bTick === undefined || bTick === ticks[lo]) return a.map(p => ({ ...p }));
  const frac = Math.min(1, Math.max(0, (tf - ticks[lo]) / (bTick - ticks[lo])));
  const bMap = new Map((viewer.byTick.get(bTick) || []).map(p => [p.steamId, p]));
  return a.map(p => {
    const q = bMap.get(p.steamId);
    if (!q) return { ...p };
    let dyaw = q.yaw - p.yaw;
    while (dyaw > 180) dyaw -= 360;
    while (dyaw < -180) dyaw += 360;
    return { ...p, x: p.x + (q.x - p.x) * frac, y: p.y + (q.y - p.y) * frac, yaw: p.yaw + dyaw * frac, health: frac < 1 ? p.health : q.health, isAlive: p.isAlive && q.isAlive };
  });
}
function drawViewerFrame() {
  if (!viewer || !viewer.transform) return;
  const canvas = $('vCanvas');
  if (!canvas || !canvas.getContext) return;
  const S = canvas.width || 640;
  const u = S / 640;
  const ctx = canvas.getContext('2d');
  const tf = viewer.tickFloat;
  const tr = viewer.tickrate;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, S, S);
  if (viewer.img) ctx.drawImage(viewer.img, 0, 0, S, S);
  const g = viewer.grenades;
  if (g) {
    for (const s of g.smokes) {
      const age = (tf - s.tick) / tr;
      if (age < 0 || age > 18) continue;
      const [px, py] = viewerXY(s.x, s.y, S);
      const r = Math.min(1, age / 1.2) * 46 * u;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(160,170,185,' + (age > 12 ? (0.55 * (1 - (age - 12) / 6)).toFixed(2) : 0.55) + ')';
      ctx.fill();
    }
    const grenadeColorFor = (name) => {
      const n = String(name || '').toLowerCase();
      if (n.includes('smoke')) return '#737373';
      if (n.includes('flash')) return '#f9a43f';
      if (n.includes('molotov') || n.includes('incendiary')) return '#da7b11';
      if (n.includes('he')) return '#268e6c';
      if (n.includes('decoy')) return '#f76d74';
      return '#ffffff';
    };
    for (const t of (g.trajectories || [])) {
      const pts = t.points.filter(p => p.tick <= tf);
      if (pts.length === 0) continue;
      const lastTick = pts[pts.length - 1].tick;
      if (tf - lastTick > 2 * tr) continue;
      const landed = tf - lastTick > 0.25 * tr;
      const color = grenadeColorFor(t.name);
      if (pts.length > 1) {
        ctx.beginPath();
        const [sx, sy] = viewerXY(pts[0].x, pts[0].y, S);
        ctx.moveTo(sx, sy);
        for (let i = 1; i < pts.length; i++) {
          const [px, py] = viewerXY(pts[i].x, pts[i].y, S);
          ctx.lineTo(px, py);
        }
        ctx.lineWidth = 1.5 * u;
        ctx.strokeStyle = color;
        ctx.globalAlpha = landed ? 0.35 : 0.85;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (!landed) {
        const [hx, hy] = viewerXY(pts[pts.length - 1].x, pts[pts.length - 1].y, S);
        ctx.beginPath(); ctx.arc(hx, hy, 3.5 * u, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1.5 * u; ctx.strokeStyle = '#fff'; ctx.stroke();
      }
    }
    const fires = new Map();
    for (const f of g.infernos) {
      if (f.tick > tf) continue;
      const prev = fires.get(f.id);
      if (!prev || prev.tick < f.tick) fires.set(f.id, f);
    }
    for (const f of fires.values()) {
      if (tf - f.tick > tr) continue;
      const hull = f.hull || [];
      if (hull.length >= 6) {
        ctx.beginPath();
        const [hx0, hy0] = viewerXY(hull[0], hull[1], S);
        ctx.moveTo(hx0, hy0);
        for (let i = 2; i + 1 < hull.length; i += 2) {
          const [hx, hy] = viewerXY(hull[i], hull[i + 1], S);
          ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        const flicker = 0.45 + Math.sin(tf * 0.45 + f.x * 0.02) * 0.07;
        ctx.fillStyle = 'rgba(218,123,17,' + flicker.toFixed(2) + ')';
        ctx.shadowColor = 'rgba(255,110,30,.8)';
        ctx.shadowBlur = 14 * u;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.5 * u;
        ctx.strokeStyle = '#da7b11';
        ctx.stroke();
      } else {
        const [px, py] = viewerXY(f.x, f.y, S);
        ctx.beginPath(); ctx.arc(px, py, 9 * u, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(218,123,17,.5)';
        ctx.fill();
        ctx.lineWidth = 1.5 * u; ctx.strokeStyle = '#da7b11'; ctx.stroke();
      }
    }
    for (const f of g.flashes) {
      const age = (tf - f.tick) / tr;
      if (age < 0 || age > 0.5) continue;
      const [px, py] = viewerXY(f.x, f.y, S);
      ctx.beginPath(); ctx.arc(px, py, 26 * u * (1 - age), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.8 * (1 - age * 2)).toFixed(2) + ')';
      ctx.fill();
    }
    for (const h of g.hes) {
      const age = (tf - h.tick) / tr;
      if (age < 0 || age > 0.6) continue;
      const [px, py] = viewerXY(h.x, h.y, S);
      ctx.beginPath(); ctx.arc(px, py, (8 + age * 90) * u, 0, Math.PI * 2);
      ctx.lineWidth = 3 * u; ctx.strokeStyle = 'rgba(255,120,40,' + (0.9 * (1 - age / 0.6)).toFixed(2) + ')';
      ctx.stroke();
    }
    const BOMB_FUSE_SECONDS = 40;
    if (g.planted && g.planted.started && tf >= g.planted.started && tf < g.planted.tick) {
      const [px, py] = viewerXY(g.planted.x, g.planted.y, S);
      const total = Math.max(1, g.planted.tick - g.planted.started);
      const done = Math.min(1, Math.max(0, (tf - g.planted.started) / total));
      const rr = 18 * u;
      ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2);
      ctx.lineWidth = 4 * u; ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * done);
      ctx.lineWidth = 4 * u; ctx.strokeStyle = '#f0b429'; ctx.stroke();
      ctx.font = 'bold ' + Math.round(12 * u) + 'px Inter, sans-serif'; ctx.fillStyle = '#f0b429';
      ctx.fillText('PLANTING ' + fmtClock((g.planted.tick - tf) / tr) + (g.planted.planter ? ' · ' + g.planted.planter : ''), px + 26 * u, py - 16 * u);
    }
    if (g.planted && tf >= g.planted.tick && (!g.defused || tf < g.defused.tick) && (!g.exploded || tf < g.exploded.tick)) {
      const [px, py] = viewerXY(g.planted.x, g.planted.y, S);
      const fuseTicks = (g.exploded && g.exploded.tick > g.planted.tick) ? (g.exploded.tick - g.planted.tick) : BOMB_FUSE_SECONDS * tr;
      const elapsed = (tf - g.planted.tick) / tr;
      const progress = Math.min(1, Math.max(0, (tf - g.planted.tick) / fuseTicks));
      const beepInterval = 1.2 - 0.95 * progress;
      const beepOn = (elapsed % beepInterval) < Math.min(0.15, beepInterval * 0.6);
      const rr = 20 * u;
      ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2);
      ctx.lineWidth = 4 * u; ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - progress));
      ctx.lineWidth = 4 * u; ctx.strokeStyle = '#ff6b35'; ctx.stroke();
      const is = 24 * u;
      if (viewer.bombImg && viewer.bombImg.complete && viewer.bombImg.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = beepOn ? 1 : 0.15;
        ctx.filter = 'invert(1)';
        ctx.drawImage(viewer.bombImg, px - is / 2, py - is / 2, is, is);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(px, py, 8 * u, 0, Math.PI * 2);
        ctx.fillStyle = beepOn ? '#ff6b35' : 'rgba(255,107,53,.2)';
        ctx.fill();
      }
      ctx.font = 'bold ' + Math.round(12 * u) + 'px Inter, sans-serif'; ctx.fillStyle = '#ff6b35';
      ctx.fillText(fmtClock(Math.max(0, fuseTicks / tr - elapsed)) + (g.planted.site ? ' · site ' + g.planted.site : ''), px + 26 * u, py - 16 * u);
    }
    if (g.exploded && tf >= g.exploded.tick && tf - g.exploded.tick < tr) {
      const [px, py] = viewerXY(g.exploded.x, g.exploded.y, S);
      const age = (tf - g.exploded.tick) / tr;
      ctx.beginPath(); ctx.arc(px, py, (20 + age * 260) * u, 0, Math.PI * 2);
      ctx.lineWidth = 6 * u; ctx.strokeStyle = 'rgba(255,140,40,' + (0.9 * (1 - age)).toFixed(2) + ')'; ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, (10 + age * 120) * u, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,180,80,' + (0.7 * (1 - age)).toFixed(2) + ')'; ctx.fill();
    }
    if (g.defused && g.defused.started && tf >= g.defused.started && tf < g.defused.tick) {
      const [px, py] = viewerXY(g.defused.x, g.defused.y, S);
      const total = Math.max(1, g.defused.tick - g.defused.started);
      const done = Math.min(1, Math.max(0, (tf - g.defused.started) / total));
      const rr = 18 * u;
      ctx.beginPath(); ctx.arc(px, py, rr, 0, Math.PI * 2);
      ctx.lineWidth = 4 * u; ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * done);
      ctx.lineWidth = 4 * u; ctx.strokeStyle = '#3fd68c'; ctx.stroke();
      ctx.font = 'bold ' + Math.round(12 * u) + 'px Inter, sans-serif'; ctx.fillStyle = '#3fd68c';
      ctx.fillText('DEFUSING ' + fmtClock((g.defused.tick - tf) / tr) + (g.defused.defuser ? ' · ' + g.defused.defuser : ''), px + 24 * u, py - 16 * u);
    }
    if (g.defused && tf >= g.defused.tick) {
      const [px, py] = viewerXY(g.defused.x, g.defused.y, S);
      ctx.beginPath(); ctx.arc(px, py, 14 * u, 0, Math.PI * 2);
      ctx.lineWidth = 3 * u; ctx.strokeStyle = '#3fd68c'; ctx.stroke();
      ctx.font = 'bold ' + Math.round(13 * u) + 'px Inter, sans-serif'; ctx.fillStyle = '#3fd68c';
      ctx.fillText('DEFUSED', px + 18 * u, py - 12 * u);
    }
  }
  const recentKills = (viewer.kills || []).filter(k => k.roundNumber === viewer.roundNumber && k.tick <= tf && tf - k.tick < 3 * tr);
  for (const k of recentKills) {
    if (k.victimX === undefined) continue;
    const [px, py] = viewerXY(k.victimX, k.victimY, S);
    const alpha = Math.max(0.15, 1 - (tf - k.tick) / (3 * tr));
    ctx.lineWidth = 3 * u; ctx.strokeStyle = 'rgba(240,75,90,' + alpha.toFixed(2) + ')';
    const r = 8 * u;
    ctx.beginPath();
    ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
    ctx.moveTo(px + r, py - r); ctx.lineTo(px - r, py + r);
    ctx.stroke();
  }
  if (!viewer.tracerSeen) { viewer.tracerSeen = new Set(); viewer.tracers = []; viewer.lastTf = tf; }
  if (tf < viewer.lastTf - tr) { viewer.tracerSeen = new Set(); viewer.tracers = []; }
  viewer.lastTf = tf;
  const nowTs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const frameDt = Math.min(0.1, (nowTs - (viewer.lastTracerTs || nowTs)) / 1000);
  viewer.lastTracerTs = nowTs;
  const allShots = viewer.shots || [];
  for (let si = 0; si < allShots.length; si++) {
    const sh = allShots[si];
    if (sh.tick <= tf && !viewer.tracerSeen.has(si)) {
      viewer.tracerSeen.add(si);
      viewer.tracers.push({ tick: sh.tick, x: sh.x, y: sh.y, yaw: sh.yaw, side: sh.side, life: 0 });
    }
  }
  viewer.tracers = viewer.tracers.filter(t => t.life < 1);
  for (const t of viewer.tracers) {
    t.life += frameDt * 5;
    const [sx, sy] = viewerXY(t.x, t.y, S);
    const ang = -t.yaw * Math.PI / 180;
    const len = 80 * u * Math.min(1, t.life);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + len * Math.cos(ang), sy + len * Math.sin(ang));
    ctx.lineWidth = Math.max(1, 1.5 * u);
    ctx.strokeStyle = t.side === 3 ? '#4aa8ff' : '#f0b429';
    ctx.globalAlpha = Math.max(0, 0.9 * (1 - t.life));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const list = viewerSnapshot();
  for (const p of list) {
    if (!p.isAlive) continue;
    const [px, py] = viewerXY(p.x, p.y, S);
    const color = p.side === 3 ? '#4aa8ff' : '#f0b429';
    const pr = 9 * u;
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = 2 * u; ctx.strokeStyle = '#fff'; ctx.stroke();
    const ang = -p.yaw * Math.PI / 180;
    const ll = 16 * u;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + ll * Math.cos(ang), py + ll * Math.sin(ang)); ctx.lineWidth = 2 * u; ctx.strokeStyle = '#fff'; ctx.stroke();
    if (p.health < 100) { ctx.beginPath(); ctx.arc(px, py, 6 * u, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (p.health / 100)); ctx.lineTo(px, py); ctx.fillStyle = 'rgba(240,75,90,.6)'; ctx.fill(); }
    if (p.hasBomb) { ctx.beginPath(); ctx.arc(px, py, 13 * u, 0, Math.PI * 2); ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 2.5 * u; ctx.stroke(); }
    ctx.font = Math.round(11 * u) + 'px Inter, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(String(p.name).slice(0, 12), px - 20 * u, py + 24 * u);
  }
  const alive = list.filter(p => p.isAlive);
  const vt = $('vTick');
  if (vt) vt.textContent = fmtClock((tf - viewer.startTick) / tr) + ' · ' + alive.length + ' alive';
  const sl = $('vSlider');
  if (sl) sl.value = String(Math.round(tf - viewer.startTick));
  const feed = (viewer.kills || []).filter(k => k.roundNumber === viewer.roundNumber && k.tick <= tf).slice(-6).reverse();
  const f = $('vFeed');
  if (f) f.innerHTML = feed.map(k => '<div><span class="muted">R' + k.roundNumber + ' · ' + fmtClock((k.tick - viewer.startTick) / tr) + '</span> <strong>' + esc(k.killerName) + '</strong> → ' + esc(k.victimName) + ' <span class="muted">' + esc(k.weaponName || '') + (k.isHeadshot ? ' · HS' : '') + '</span></div>').join('');
}
function viewerLoop(ts) {
  if (!viewer || !viewer.playing) return;
  if (!viewer.lastTs) viewer.lastTs = ts;
  const dt = Math.min(100, ts - viewer.lastTs);
  viewer.lastTs = ts;
  viewer.tickFloat += (dt / 1000) * viewer.tickrate * viewer.speed;
  if (viewer.tickFloat >= viewer.endTick) {
    viewer.tickFloat = viewer.endTick;
    drawViewerFrame();
    pauseViewer();
    const b = $('vPlay'); if (b) b.textContent = 'Replay';
    if (viewerRecorder && viewerRecorder.state !== 'inactive') viewerRecorder.stop();
    return;
  }
  drawViewerFrame();
  viewer.raf = requestAnimationFrame(viewerLoop);
}
function toggleViewerPlay() {
  if (!viewer || !viewer.ticks.length || !viewer.transform) return;
  const b = $('vPlay');
  if (viewer.playing) { pauseViewer(); if (b) b.textContent = 'Play'; return; }
  if (viewer.tickFloat >= viewer.endTick - 1) viewer.tickFloat = viewer.startTick;
  viewer.playing = true;
  viewer.lastTs = 0;
  if (b) b.textContent = 'Pause';
  if (typeof requestAnimationFrame !== 'undefined') viewer.raf = requestAnimationFrame(viewerLoop);
  else {
    viewer.timerFallback = setInterval(() => {
      if (!viewer || !viewer.playing) return;
      viewer.tickFloat += viewer.tickrate / 8 * viewer.speed;
      if (viewer.tickFloat >= viewer.endTick) { viewer.tickFloat = viewer.endTick; pauseViewer(); const bb = $('vPlay'); if (bb) bb.textContent = 'Replay'; }
      drawViewerFrame();
    }, 125);
  }
}
function pauseViewer() {
  if (!viewer) return;
  viewer.playing = false;
  if (viewer.raf && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(viewer.raf);
  viewer.raf = 0;
  if (viewer.timerFallback) { clearInterval(viewer.timerFallback); viewer.timerFallback = null; }
}


/* ---------- settings ---------- */
async function renderSettings(view) {
  const c = conn();
  view.innerHTML = '<div class="card"><h2>Server</h2>' +
    '<div class="row"><input id="setBase" placeholder="Server address" value="' + esc(c.baseUrl || '') + '" /><input id="setToken" placeholder="Server API token (if required)" value="' + esc(c.token || '') + '" /><input id="setSteam" placeholder="Browse as Steam ID (auto-filled on login)" value="' + esc(c.steamId || '') + '" /></div>' +
    '<p class="muted" style="font-size:12px">Server address = which backend to query (defaults to this page\u2019s host). API token = shared password, only needed if the owner started the server with --token. Steam ID = whose stats you browse as and who your uploads get attributed to.</p>' +
    '<p><button id="setSave">Save</button> <span id="setMsg" class="muted"></span></p></div>' +
    '<div class="card"><h2>My account</h2><div id="setAccount"><p class="muted">Loading…</p></div></div>' +
    '<div class="card"><h2>Automatic match tracking</h2><div id="setTracking"><p class="muted">Loading…</p></div></div>';
  $('setSave').onclick = () => {
    setConn({ baseUrl: $('setBase').value.trim(), token: $('setToken').value.trim(), steamId: $('setSteam').value.trim() });
    $('setMsg').textContent = 'Saved.';
    refreshStatus();
    router().catch(() => {});
  };
  get('/api/status').then(s => {
    const el = $('setMsg');
    if (el) el.textContent = (s.discord ? 'Discord notifications on. ' : 'Discord notifications off (set DISCORD_WEBHOOK_URL). ') + (s.pending ? s.pending + ' demo(s) queued.' : 'Queue empty.');
  }).catch(() => {});
  const { user } = await get('/api/session').catch(() => ({ user: null }));
  const acc = $('setAccount');
  const trk = $('setTracking');
  if (!user) {
    acc.innerHTML = '<p class="muted">Not logged in.</p><p><a href="' + base() + '/auth/steam"><button>Login with Steam</button></a></p>';
    trk.innerHTML = '<p class="muted">Log in with Steam to set up automatic tracking for your account.</p>';
    return;
  }
  acc.innerHTML = '<p>' + (user.avatar ? '<img src="' + esc(user.avatar) + '" alt="" style="width:44px;height:44px;border-radius:10px;vertical-align:middle;margin-right:10px"/>' : '') +
    '<strong>' + esc(user.displayName) + '</strong><br/><span class="muted">' + esc(user.steamId) + '</span></p>' +
    '<p><a href="#/me"><button class="ghost">My stats</button></a> <a href="#/player/' + user.steamId + '"><button class="ghost">Public profile</button></a> <button class="ghost" id="setLogout">Logout</button></p>';
  $('setLogout').onclick = async () => {
    await fetch(base() + '/auth/logout', { method: 'POST', headers: headers() });
    sessionUser = null;
    await refreshSession().catch(() => {});
    router().catch(() => {});
  };
  const { users } = await get('/api/tracked-users');
  const mine = users.find(u => u.steamId === user.steamId);
  trk.innerHTML = '<p class="muted">Leetify-style: paste your <strong>match history authentication code</strong> (one-time, from Valve\u2019s <a href="https://help.steampowered.com/en/wizard/HelpWithGameIssue/?appid=730&issueid=128" target="_blank" rel="noreferrer">account data tool</a>) plus a recent <strong>share code</strong> (CS2 → Watch → Your Matches). The server then finds and downloads your newer matches automatically. Codes expire after 30 days without Matchmaking — paste a fresh share code if tracking goes stale. Note: demo downloads need Steam running and logged in on the server machine.</p>' +
    (mine ? '<p><span class="pill ' + (mine.status === 'ok' ? 'green' : (mine.status === 'error' ? 'red' : 'yellow')) + '">' + esc(mine.status.replaceAll('_', ' ')) + '</span> ' +
      '<span class="muted">last checked ' + (mine.lastCheckAt ? esc(mine.lastCheckAt.slice(0, 16).replace('T', ' ')) : 'never') + (mine.newMatchesFound ? ' · +' + mine.newMatchesFound + ' new' : '') + '</span></p>' +
      (mine.error ? '<p class="bad">' + esc(mine.error) + '</p>' : '') : '<p class="muted">Not tracking yet.</p>') +
    '<div class="row"><input id="setSteamId" placeholder="Steam ID to track (defaults to your account)" value="' + esc(user.steamId) + '" /><input id="setAuth" placeholder="Authentication code (XXXX-XXXXX-XXXX)" /><input id="setCode" placeholder="Latest share code (CSGO-…)" /><button id="setTrack" style="flex:0 0 auto">Save & track</button></div>' +
    '<p><button class="ghost" id="setCheck">Check now</button> <label class="muted" style="font-size:13px"><input id="setAuto" type="checkbox"' + (mine && mine.autoDownload ? ' checked' : '') + ' style="width:auto" /> auto-download new matches</label> <span id="setTMsg" class="muted"></span></p>';
  $('setTrack').onclick = async () => {
    const m = $('setTMsg');
    m.textContent = 'Saving…';
    try {
      const steamId = ($('setSteamId').value.trim() || user.steamId).replace(/[^0-9]/g, '');
      const res = await fetch(base() + '/api/tracked-users', { method: 'POST', headers: headers(true), body: JSON.stringify({ steamId, authCode: $('setAuth').value.trim(), shareCode: $('setCode').value.trim() }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status));
      m.textContent = 'Tracking saved — checking Steam for newer matches right now…';
      router().catch(() => {});
    } catch (e) { m.textContent = e.message; }
  };
  $('setCheck').onclick = async () => {
    const m = $('setTMsg');
    m.textContent = 'Checking Steam…';
    try {
      const steamId = ($('setSteamId').value.trim() || user.steamId).replace(/[^0-9]/g, '');
      const res = await fetch(base() + '/api/tracked-users/' + encodeURIComponent(steamId) + '/check', { method: 'POST', headers: headers() });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || ('HTTP ' + res.status));
      m.textContent = body.newCodes.length ? ('Found ' + body.newCodes.length + ' new match(es), queued for download.') : 'No new matches found.';
      router().catch(() => {});
    } catch (e) { m.textContent = e.message; }
  };
  const auto = $('setAuto');
  if (auto) {
    auto.onchange = async () => {
      const steamId = ($('setSteamId').value.trim() || user.steamId).replace(/[^0-9]/g, '');
      await fetch(base() + '/api/tracked-users/' + encodeURIComponent(steamId) + '/auto-download', { method: 'POST', headers: headers(true), body: JSON.stringify({ enabled: auto.checked }) });
    };
  }
}
async function refreshStatus() { try { const s = await get('/api/status'); $('queuePill').textContent = s.pending + ' queued' + (s.processing ? ' · ' + String(s.processing).split('/').pop() : '') + (s.lastError ? ' · error' : ''); } catch (e) { $('queuePill').textContent = 'offline'; } }
let sessionUser = null;
async function refreshSession() {
  const box = $('authBox');
  try {
    const { user } = await get('/api/session');
    sessionUser = user;
    if (user) {
      const nameHtml = user.avatar
        ? '<img src="' + esc(user.avatar) + '" alt="" style="width:22px;height:22px;border-radius:6px;vertical-align:-6px;margin-right:6px"/>' + esc(user.displayName)
        : '<a href="#/player/' + user.steamId + '" style="color:var(--muted);font-size:13px">' + esc(user.displayName) + '</a>';
      box.innerHTML = '<a href="#/player/' + user.steamId + '" style="color:var(--muted);font-size:13px">' + nameHtml + '</a> <button class="ghost" id="logoutBtn" style="padding:6px 12px;font-size:13px">Logout</button>';
      $('logoutBtn').onclick = async () => {
        await fetch(base() + '/auth/logout', { method: 'POST', headers: headers() });
        sessionUser = null;
        refreshSession().catch(() => {});
        router().catch(() => {});
      };
      if (!(conn().steamId || '').trim()) {
        setConn({ steamId: user.steamId });
        router().catch(() => {});
      }
    } else {
      box.innerHTML = '<a href="' + base() + '/auth/steam"><button style="padding:8px 14px">Login with Steam</button></a>';
    }
  } catch (e) { box.innerHTML = ''; }
}
refreshStatus();
refreshSession().catch(() => {});
router();
setInterval(refreshStatus, 5000);
</script>
</body>
</html>`;
