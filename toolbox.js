/**
 * toolbox.js — Logique des 11 outils développeur
 * 100% côté client, aucune dépendance externe
 */

'use strict';

// Appelé depuis script.js au DOMContentLoaded
function initToolbox() {
  startTimestampClock();
  initColorPicker();
}

// ════════════════════════════════════════════════════════════
// 1. JSON FORMATTER
// ════════════════════════════════════════════════════════════

function formatJson() {
  const input = document.getElementById('json-input').value.trim();
  const output = document.getElementById('json-output');
  if (!input) { output.textContent = 'Entrez du JSON ci-dessus.'; return; }
  try {
    output.textContent = JSON.stringify(JSON.parse(input), null, 2);
    output.style.color = 'var(--text-code)';
  } catch (e) {
    output.textContent = `❌ Erreur : ${e.message}`;
    output.style.color = 'var(--accent-red)';
  }
}

function minifyJson() {
  const input = document.getElementById('json-input').value.trim();
  const output = document.getElementById('json-output');
  if (!input) { output.textContent = 'Entrez du JSON ci-dessus.'; return; }
  try {
    output.textContent = JSON.stringify(JSON.parse(input));
    output.style.color = 'var(--text-code)';
  } catch (e) {
    output.textContent = `❌ Erreur : ${e.message}`;
    output.style.color = 'var(--accent-red)';
  }
}

function validateJson() {
  const input = document.getElementById('json-input').value.trim();
  const output = document.getElementById('json-output');
  if (!input) { output.textContent = 'Entrez du JSON ci-dessus.'; return; }
  try {
    const parsed = JSON.parse(input);
    const keys = countJsonKeys(parsed);
    output.textContent = `✅ JSON valide\n\nClés totales : ${keys}\nType racine : ${Array.isArray(parsed) ? 'Array' : 'Object'}\nTaille : ${new TextEncoder().encode(input).length} octets`;
    output.style.color = 'var(--accent-green)';
  } catch (e) {
    const match = e.message.match(/position (\d+)/);
    const pos = match ? parseInt(match[1]) : null;
    let hint = '';
    if (pos !== null) {
      hint = `\n\nContexte : ...${input.slice(Math.max(0, pos - 10), pos)}>${input.slice(pos, pos + 10)}...`;
    }
    output.textContent = `❌ JSON invalide\n${e.message}${hint}`;
    output.style.color = 'var(--accent-red)';
  }
}

function countJsonKeys(obj, depth = 0) {
  if (depth > 6 || typeof obj !== 'object' || obj === null) return 0;
  return Object.keys(obj).length +
    Object.values(obj).reduce((s, v) => s + countJsonKeys(v, depth + 1), 0);
}

// ════════════════════════════════════════════════════════════
// 2. UUID GENERATOR
// ════════════════════════════════════════════════════════════

function generateUUID(format = 'default') {
  const raw = crypto.randomUUID();
  const results = {
    default:      raw,
    uppercase:    raw.toUpperCase(),
    'no-hyphens': raw.replaceAll('-', ''),
    braces:       `{${raw}}`,
  };
  const el = document.getElementById('uuid-display');
  el.style.fontSize = '0.9rem';
  el.style.textAlign = 'center';
  el.textContent = results[format] ?? raw;
}

function generateMultipleUUIDs() {
  const el = document.getElementById('uuid-display');
  el.textContent = Array.from({ length: 5 }, () => crypto.randomUUID()).join('\n');
  el.style.fontSize = '0.72rem';
  el.style.textAlign = 'left';
}

// ════════════════════════════════════════════════════════════
// 3. BASE64
// ════════════════════════════════════════════════════════════

function encodeBase64() {
  const input = document.getElementById('b64-input').value;
  const output = document.getElementById('b64-output');
  if (!input) { output.textContent = 'Entrez du texte ci-dessus.'; return; }
  try {
    output.textContent = btoa(unescape(encodeURIComponent(input)));
    output.style.color = 'var(--text-code)';
  } catch (e) {
    output.textContent = `❌ ${e.message}`; output.style.color = 'var(--accent-red)';
  }
}

function decodeBase64() {
  const input = document.getElementById('b64-input').value.trim();
  const output = document.getElementById('b64-output');
  if (!input) { output.textContent = 'Entrez du Base64 ci-dessus.'; return; }
  try {
    output.textContent = decodeURIComponent(escape(atob(input)));
    output.style.color = 'var(--text-code)';
  } catch (e) {
    output.textContent = `❌ Base64 invalide : ${e.message}`; output.style.color = 'var(--accent-red)';
  }
}

function encodeUrlSafe() {
  const input = document.getElementById('b64-input').value;
  const output = document.getElementById('b64-output');
  if (!input) { output.textContent = 'Entrez du texte ci-dessus.'; return; }
  try {
    output.textContent = btoa(unescape(encodeURIComponent(input)))
      .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    output.style.color = 'var(--text-code)';
  } catch (e) {
    output.textContent = `❌ ${e.message}`; output.style.color = 'var(--accent-red)';
  }
}

// ════════════════════════════════════════════════════════════
// 4. REGEX TESTER
// ════════════════════════════════════════════════════════════

const REGEX_PRESETS = {
  email: { pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}', flags: 'gi' },
  url:   { pattern: 'https?:\\/\\/[^\\s/$.?#].[^\\s]*', flags: 'gi' },
  ip:    { pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', flags: 'g' },
  phone: { pattern: '(?:\\+33|0)[1-9](?:[\\s.\\-]?\\d{2}){4}', flags: 'g' },
  date:  { pattern: '\\d{4}[-/]\\d{2}[-/]\\d{2}', flags: 'g' },
  hex:   { pattern: '#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b', flags: 'gi' },
};

function setRegexPreset(name) {
  const p = REGEX_PRESETS[name];
  if (!p) return;
  document.getElementById('regex-pattern').value = p.pattern;
  document.getElementById('regex-flags').value = p.flags;
  testRegex();
}

function testRegex() {
  const pattern = document.getElementById('regex-pattern').value;
  const flags   = document.getElementById('regex-flags').value || 'g';
  const text    = document.getElementById('regex-text').value;
  const output  = document.getElementById('regex-output');
  const countEl = document.getElementById('regex-count');

  if (!pattern || !text) {
    output.textContent = 'Entrez un pattern et un texte.';
    countEl.textContent = 'Matches : -';
    return;
  }
  try {
    const safeFlags = flags.includes('g') ? flags : flags + 'g';
    const matches = [...text.matchAll(new RegExp(pattern, safeFlags))];
    countEl.textContent = `Matches : ${matches.length}`;
    if (!matches.length) {
      output.textContent = 'Aucune correspondance';
      output.style.color = 'var(--accent-orange)';
      return;
    }
    output.style.color = 'var(--text-code)';
    output.textContent = matches.slice(0, 20).map((m, i) =>
      `[${i + 1}] pos ${m.index} : "${m[0]}"` +
      (m.length > 1 ? `\n    groupes : ${m.slice(1).join(' | ')}` : '')
    ).join('\n') + (matches.length > 20 ? `\n...+${matches.length - 20} autres` : '');
  } catch (e) {
    output.textContent = `❌ Regex invalide : ${e.message}`;
    output.style.color = 'var(--accent-red)';
    countEl.textContent = 'Matches : -';
  }
}

// ════════════════════════════════════════════════════════════
// 5. TIMESTAMP
// ════════════════════════════════════════════════════════════

function convertTimestamp() {
  const val = document.getElementById('ts-input').value;
  if (!val) return;
  let ms = parseInt(val);
  if (ms < 1e12) ms *= 1000;
  const d = new Date(ms);
  if (isNaN(d)) { document.getElementById('ts-utc').textContent = 'Invalide'; return; }
  document.getElementById('ts-utc').textContent      = d.toUTCString();
  document.getElementById('ts-local').textContent    = d.toLocaleString('fr-FR');
  document.getElementById('ts-iso').textContent      = d.toISOString();
  document.getElementById('ts-relative').textContent = relativeTime(d);
}

function convertDate() {
  const val = document.getElementById('date-input').value;
  const out = document.getElementById('date-output');
  if (!val) { out.textContent = '-'; return; }
  const d = new Date(val);
  if (isNaN(d)) { out.textContent = 'Date invalide'; return; }
  out.textContent = `${Math.floor(d.getTime() / 1000)} (s)\n${d.getTime()} (ms)`;
}

function relativeTime(date) {
  const diff = Date.now() - date.getTime();
  const abs  = Math.abs(diff);
  const f    = diff < 0;
  const units = [['an',3.156e10],['mois',2.628e9],['jour',8.64e7],['heure',3.6e6],['min',6e4],['s',1e3]];
  for (const [label, ms] of units) {
    const v = Math.floor(abs / ms);
    if (v >= 1) {
      const p = v > 1 && !['mois','min'].includes(label) ? 's' : '';
      return f ? `Dans ${v} ${label}${p}` : `Il y a ${v} ${label}${p}`;
    }
  }
  return "A l'instant";
}

function startTimestampClock() {
  const tick = () => {
    const el = document.getElementById('ts-live');
    if (el) el.textContent = Math.floor(Date.now() / 1000).toLocaleString('fr-FR');
  };
  tick();
  setInterval(tick, 1000);
}

// ════════════════════════════════════════════════════════════
// 6. URL ENCODER / PARSER
// ════════════════════════════════════════════════════════════

function encodeUrl() {
  const input = document.getElementById('url-input').value.trim();
  const out   = document.getElementById('url-output');
  if (!input) { out.textContent = 'Entrez une URL ou un texte.'; return; }
  try {
    out.textContent = encodeURI(input);
    out.style.color = 'var(--text-code)';
  } catch (e) {
    out.textContent = `❌ ${e.message}`; out.style.color = 'var(--accent-red)';
  }
}

function decodeUrl() {
  const input = document.getElementById('url-input').value.trim();
  const out   = document.getElementById('url-output');
  if (!input) { out.textContent = 'Entrez une URL encodee.'; return; }
  try {
    out.textContent = decodeURIComponent(input);
    out.style.color = 'var(--text-code)';
  } catch (e) {
    out.textContent = `❌ Encodage invalide : ${e.message}`; out.style.color = 'var(--accent-red)';
  }
}

function parseUrl() {
  const input = document.getElementById('url-input').value.trim();
  const out   = document.getElementById('url-output');
  if (!input) { out.textContent = 'Entrez une URL complete.'; return; }
  try {
    const u = new URL(input);
    const params = [...u.searchParams.entries()];
    out.textContent = [
      `Protocole  : ${u.protocol}`,
      `Hote       : ${u.hostname}`,
      `Port       : ${u.port || '(defaut)'}`,
      `Chemin     : ${u.pathname}`,
      `Hash       : ${u.hash || '(aucun)'}`,
      '',
      `Parametres (${params.length}) :`,
      ...params.map(([k, v]) => `  ${k} = ${decodeURIComponent(v)}`),
    ].join('\n');
    out.style.color = 'var(--text-code)';
  } catch {
    try {
      out.textContent = `Encode  : ${encodeURIComponent(input)}\nDecode  : ${decodeURIComponent(input)}`;
      out.style.color = 'var(--text-code)';
    } catch (e) {
      out.textContent = `❌ ${e.message}`; out.style.color = 'var(--accent-red)';
    }
  }
}

// ════════════════════════════════════════════════════════════
// 7. GENERATEUR DE MOT DE PASSE
// ════════════════════════════════════════════════════════════

const CHARSET = {
  upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:   'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?',
};

function buildCharset() {
  let chars = '';
  if (document.getElementById('pwd-upper').checked)   chars += CHARSET.upper;
  if (document.getElementById('pwd-lower').checked)   chars += CHARSET.lower;
  if (document.getElementById('pwd-numbers').checked) chars += CHARSET.numbers;
  if (document.getElementById('pwd-symbols').checked) chars += CHARSET.symbols;
  return chars || CHARSET.lower + CHARSET.numbers;
}

function generatePassword() {
  const len   = parseInt(document.getElementById('pwd-length').value);
  const chars = buildCharset();
  const arr   = crypto.getRandomValues(new Uint32Array(len));
  const pwd   = Array.from(arr, n => chars[n % chars.length]).join('');
  const el    = document.getElementById('pwd-display');
  el.style.fontSize = '0.9rem';
  el.style.textAlign = 'center';
  el.textContent = pwd;
  showPasswordStrength(pwd);
}

function generateMultiplePasswords() {
  const len   = parseInt(document.getElementById('pwd-length').value);
  const chars = buildCharset();
  const el    = document.getElementById('pwd-display');
  el.style.fontSize = '0.72rem';
  el.style.textAlign = 'left';
  el.textContent = Array.from({ length: 5 }, () => {
    const arr = crypto.getRandomValues(new Uint32Array(len));
    return Array.from(arr, n => chars[n % chars.length]).join('');
  }).join('\n');
  document.getElementById('pwd-strength').innerHTML = '';
}

function showPasswordStrength(pwd) {
  const bar = document.getElementById('pwd-strength');
  let score = 0;
  if (pwd.length >= 12) score++;
  if (pwd.length >= 16) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const levels = [
    { label: 'Tres faible', color: '#ef4444', w: 16 },
    { label: 'Faible',      color: '#f97316', w: 33 },
    { label: 'Moyen',       color: '#eab308', w: 50 },
    { label: 'Bon',         color: '#84cc16', w: 66 },
    { label: 'Fort',        color: '#22c55e', w: 83 },
    { label: 'Tres fort',   color: '#34d399', w: 100 },
  ];
  const lvl = levels[Math.min(score, levels.length - 1)];
  bar.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:0.7rem;margin-bottom:3px">
      <span style="color:var(--text-muted)">Force</span>
      <span style="color:${lvl.color};font-weight:600">${lvl.label}</span>
    </div>
    <div style="height:4px;background:var(--bg-surface);border-radius:2px;overflow:hidden">
      <div style="height:100%;width:${lvl.w}%;background:${lvl.color};border-radius:2px;transition:width 0.4s ease"></div>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// 8. CONVERTISSEUR DE COULEURS
// ════════════════════════════════════════════════════════════

function initColorPicker() {
  updateColorFromHex('#38bdf8');
}

function onColorPickerChange() {
  updateColorFromHex(document.getElementById('color-picker').value);
}

function convertFromHex() {
  const hex = document.getElementById('color-hex').value.trim();
  if (/^#?[0-9a-fA-F]{3,8}$/.test(hex)) {
    updateColorFromHex(hex.startsWith('#') ? hex : '#' + hex);
  }
}

function convertFromRgb() {
  const parts = document.getElementById('color-rgb').value.match(/(\d+)/g);
  if (parts && parts.length >= 3) {
    const [r, g, b] = parts.map(Number);
    if ([r, g, b].every(n => n >= 0 && n <= 255)) updateColorFromHex(rgbToHex(r, g, b));
  }
}

function convertFromHsl() {
  const parts = document.getElementById('color-hsl').value.match(/([\d.]+)/g);
  if (parts && parts.length >= 3) {
    updateColorFromHex(rgbToHex(...hslToRgb(...parts.map(Number))));
  }
}

function updateColorFromHex(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return;
  const { r, g, b } = rgb;
  const hsl = rgbToHsl(r, g, b);
  const hexVal = rgbToHex(r, g, b);
  document.getElementById('color-hex').value    = hexVal;
  document.getElementById('color-rgb').value    = `${r}, ${g}, ${b}`;
  document.getElementById('color-hsl').value    = `${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%`;
  document.getElementById('color-css').value    = `rgb(${r}, ${g}, ${b})`;
  document.getElementById('color-swatch').style.background = hexVal;
  document.getElementById('color-picker').value = hexVal;
  document.getElementById('color-name').textContent = nearestColorName(r, g, b);
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full  = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean.slice(0, 6);
  const n = parseInt(full, 16);
  if (isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

const COLOR_NAMES = [
  [[255,0,0],'Rouge'],[[255,165,0],'Orange'],[[255,255,0],'Jaune'],
  [[0,128,0],'Vert'],[[0,255,255],'Cyan'],[[0,0,255],'Bleu'],
  [[128,0,128],'Violet'],[[255,192,203],'Rose'],[[165,42,42],'Marron'],
  [[0,0,0],'Noir'],[[255,255,255],'Blanc'],[[128,128,128],'Gris'],
  [[56,189,248],'Sky Blue'],[[129,140,248],'Indigo clair'],[[52,211,153],'Emeraude'],
];

function nearestColorName(r, g, b) {
  let best = COLOR_NAMES[0][1], minD = Infinity;
  for (const [[cr, cg, cb], name] of COLOR_NAMES) {
    const d = (r-cr)**2 + (g-cg)**2 + (b-cb)**2;
    if (d < minD) { minD = d; best = name; }
  }
  return best;
}

function copyField(id) {
  const el = document.getElementById(id);
  const val = el?.value ?? el?.textContent;
  if (val) copyToClipboard(val.trim(), 'Copie !');
}

// ════════════════════════════════════════════════════════════
// 9. COMPTEUR DE TEXTE
// ════════════════════════════════════════════════════════════

function analyzeText() {
  const text = document.getElementById('text-input').value;
  const words     = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const sentences = (text.match(/[.!?]+/g) || []).length;
  const readSec   = Math.ceil(words / 3.5);
  document.getElementById('tc-chars').textContent     = text.length;
  document.getElementById('tc-nospace').textContent   = text.replace(/\s/g, '').length;
  document.getElementById('tc-words').textContent     = words;
  document.getElementById('tc-lines').textContent     = text === '' ? 0 : text.split('\n').length;
  document.getElementById('tc-sentences').textContent = sentences;
  document.getElementById('tc-read').textContent      = readSec < 60 ? `${readSec}s` : `${Math.floor(readSec/60)}m${readSec%60}s`;
}

function textToUpper()     { transformText(t => t.toUpperCase()); }
function textToLower()     { transformText(t => t.toLowerCase()); }
function textToTitleCase() { transformText(t => t.replace(/\b\w/g, c => c.toUpperCase())); }
function trimText()        { transformText(t => t.trim().replace(/[ \t]+/g, ' ')); }

function transformText(fn) {
  const el = document.getElementById('text-input');
  el.value = fn(el.value);
  analyzeText();
}

// ════════════════════════════════════════════════════════════
// 10. FORMATEUR DE NOMBRES
// ════════════════════════════════════════════════════════════

function formatNumber() {
  const raw = document.getElementById('num-input').value;
  if (raw === '') { clearNumberResults(); return; }
  const n = parseFloat(raw);
  if (isNaN(n)) { clearNumberResults(); return; }
  const int = Math.trunc(n);
  const safe = int >= 0 && int < 2**53;
  document.getElementById('nf-fr').textContent       = n.toLocaleString('fr-FR');
  document.getElementById('nf-en').textContent       = n.toLocaleString('en-US');
  document.getElementById('nf-bin').textContent      = safe ? int.toString(2) : 'trop grand';
  document.getElementById('nf-hex').textContent      = safe ? '0x' + int.toString(16).toUpperCase() : 'trop grand';
  document.getElementById('nf-oct').textContent      = safe ? '0o' + int.toString(8) : 'trop grand';
  document.getElementById('nf-bytes').textContent    = formatBytes(int);
  document.getElementById('nf-duration').textContent = formatDuration(int);
  document.getElementById('nf-sci').textContent      = n.toExponential(4);
}

function clearNumberResults() {
  ['nf-fr','nf-en','nf-bin','nf-hex','nf-oct','nf-bytes','nf-duration','nf-sci']
    .forEach(id => { document.getElementById(id).textContent = '-'; });
}

function formatBytes(bytes) {
  if (bytes < 0) return '-';
  const units = ['B','KB','MB','GB','TB'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(2) : v.toFixed(1)} ${units[i]}`;
}

function formatDuration(sec) {
  if (sec < 0) return '-';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (d) parts.push(`${d}j`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || !parts.length) parts.push(`${s}s`);
  return parts.join(' ');
}

// ════════════════════════════════════════════════════════════
// 11. DIFF TEXTE
// ════════════════════════════════════════════════════════════

function runDiff() {
  const a = document.getElementById('diff-a').value;
  const b = document.getElementById('diff-b').value;
  const out = document.getElementById('diff-output');
  const stats = document.getElementById('diff-stats');
  if (!a && !b) { out.textContent = 'Entrez du texte dans les deux colonnes.'; return; }

  const result = diffLines(a.split('\n'), b.split('\n'));
  let added = 0, removed = 0;
  out.innerHTML = '';

  for (const { type, line } of result) {
    const div = document.createElement('div');
    div.className = 'diff-line diff-' + type;
    div.textContent = (type === 'add' ? '+ ' : type === 'remove' ? '- ' : '  ') + line;
    out.appendChild(div);
    if (type === 'add') added++;
    if (type === 'remove') removed++;
  }

  stats.textContent = `+${added} ajout${added>1?'s':''} / -${removed} suppression${removed>1?'s':''}`;
}

function diffLines(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);

  const result = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) {
      result.unshift({ type: 'same', line: a[i-1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      result.unshift({ type: 'add', line: b[j-1] }); j--;
    } else {
      result.unshift({ type: 'remove', line: a[i-1] }); i--;
    }
  }
  return result;
}

function swapDiff() {
  const a = document.getElementById('diff-a');
  const b = document.getElementById('diff-b');
  [a.value, b.value] = [b.value, a.value];
  runDiff();
}

// ════════════════════════════════════════════════════════════
// HELPERS PARTAGES
// ════════════════════════════════════════════════════════════

function clearTool(inputId, outputId) {
  const input = document.getElementById(inputId);
  const output = document.getElementById(outputId);
  if (input) input.value = '';
  if (output) { output.textContent = '-'; output.style.color = ''; }
  if (inputId === 'text-input') analyzeText();
}

function copyToolOutput(outputId) {
  const el = document.getElementById(outputId);
  if (!el) return;
  const text = (el.value !== undefined ? el.value : el.textContent).trim();
  if (!text || text === '-') { showToast('Rien a copier'); return; }
  copyToClipboard(text, 'Copie !');
}

// ════════════════════════════════════════════════════════════
// 12. QR CODE GENERATOR (SVG pur, sans lib externe)
// ════════════════════════════════════════════════════════════

let _qrType = 'url';

function setQrType(type) {
  _qrType = type;
  document.querySelectorAll('[id^="qr-type-"]').forEach(b => b.classList.remove('primary'));
  document.getElementById('qr-type-' + type).classList.add('primary');
  document.getElementById('qr-wifi-fields').style.display  = type === 'wifi'  ? 'flex' : 'none';
  document.getElementById('qr-email-fields').style.display = type === 'email' ? 'flex' : 'none';
  document.getElementById('qr-fields').style.display       = ['url','text','tel'].includes(type) ? 'block' : 'none';
  const placeholders = { url:'https://example.com', text:'Mon texte ici', tel:'+33 6 12 34 56 78' };
  const inp = document.getElementById('qr-input');
  if (inp) inp.placeholder = placeholders[type] || '';
  generateQR();
}

function getQrContent() {
  switch (_qrType) {
    case 'wifi': {
      const ssid = document.getElementById('qr-wifi-ssid').value;
      const pass = document.getElementById('qr-wifi-pass').value;
      const enc  = document.getElementById('qr-wifi-enc').value;
      if (!ssid) return '';
      return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
    }
    case 'email': {
      const to      = document.getElementById('qr-email-to').value;
      const subject = encodeURIComponent(document.getElementById('qr-email-subject').value);
      const body    = encodeURIComponent(document.getElementById('qr-email-body').value);
      if (!to) return '';
      return `mailto:${to}?subject=${subject}&body=${body}`;
    }
    case 'tel': {
      const v = document.getElementById('qr-input').value.replace(/\s/g,'');
      return v ? `tel:${v}` : '';
    }
    default:
      return document.getElementById('qr-input').value.trim();
  }
}

function generateQR() {
  const content = getQrContent();
  const wrap = document.getElementById('qr-canvas-wrap');
  const ph   = document.getElementById('qr-placeholder');
  if (!content) {
    wrap.innerHTML = '<div id="qr-placeholder">Entrez du contenu pour générer le QR Code</div>';
    return;
  }
  const size = parseInt(document.getElementById('qr-size').value) || 200;
  const svg  = buildQRSvg(content, size);
  wrap.innerHTML = svg;
}

function downloadQR() {
  const svg = document.querySelector('#qr-canvas-wrap svg');
  if (!svg) { showToast('Générez d\'abord un QR Code'); return; }
  const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'qrcode.svg';
  a.click();
  URL.revokeObjectURL(a.href);
}

function copyQRSvg() {
  const svg = document.querySelector('#qr-canvas-wrap svg');
  if (!svg) { showToast('Générez d\'abord un QR Code'); return; }
  copyToClipboard(svg.outerHTML, 'SVG copie !');
}

/* ---- QR Code encoder (Reed-Solomon + matrice) ---- */
// Implémentation QR simplifiée : mode octet, niveau de correction M
// Basé sur la spec ISO/IEC 18004

function buildQRSvg(text, sizePx) {
  try {
    const matrix = qrEncode(text);
    const n      = matrix.length;
    const cell   = Math.floor(sizePx / (n + 8));
    const margin = Math.floor((sizePx - cell * n) / 2);
    const total  = cell * n + margin * 2;
    let rects = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c]) {
          const x = margin + c * cell;
          const y = margin + r * cell;
          rects += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="#0f172a"/>`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" style="background:#e2e8f0;border-radius:8px">${rects}</svg>`;
  } catch {
    return `<div style="color:var(--accent-red);font-size:0.78rem;padding:1rem">Texte trop long pour le QR Code</div>`;
  }
}

// Encodeur QR minimal (version 1-10, mode octet, ECC-M)
function qrEncode(text) {
  const bytes = [...new TextEncoder().encode(text)];
  const len   = bytes.length;

  // Choisit la version selon la longueur (ECC M)
  const CAPS = [0,14,26,42,62,84,106,122,154,182,216,254];
  let version = 1;
  while (version <= 10 && CAPS[version] < len) version++;
  if (version > 10) throw new Error('too long');

  // Paramètres ECC-M par version (codewords totaux, data codewords)
  const PARAMS = [[0,0],[26,16],[44,28],[70,44],[100,64],[134,86],[172,108],[196,124],[242,154],[292,182],[346,216]];
  const [totalCW, dataCW] = PARAMS[version];

  // Encode header (mode octet = 0100)
  let bits = '0100';
  bits += len.toString(2).padStart(8, '0');
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');

  // Padding
  bits += '0000';
  while (bits.length % 8) bits += '0';
  const paddingBytes = ['11101100','00010001'];
  let pi = 0;
  while (bits.length < dataCW * 8) { bits += paddingBytes[pi++ % 2]; }

  // Data codewords
  const cws = [];
  for (let i = 0; i < bits.length; i += 8) cws.push(parseInt(bits.slice(i, i+8), 2));

  // Reed-Solomon ECC
  const eccCW = totalCW - dataCW;
  const ecc   = rsEncode(cws, eccCW);
  const all   = [...cws, ...ecc];

  // Construit la matrice
  const size = version * 4 + 17;
  const mat  = Array.from({ length: size }, () => new Array(size).fill(null));

  // Finder patterns
  addFinder(mat, 0, 0);
  addFinder(mat, 0, size - 7);
  addFinder(mat, size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    mat[6][i] = mat[i][6] = (i % 2 === 0) ? 1 : 0;
  }

  // Dark module
  mat[size - 8][8] = 1;

  // Alignment patterns (version >= 2)
  if (version >= 2) {
    const ALN = [[],[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,28,46],[6,32,50]];
    const pos  = ALN[version];
    for (const r of pos) for (const c of pos) {
      if (mat[r][c] === null) addAlignment(mat, r, c);
    }
  }

  // Format info (masque 0 + ECC-M = 101)
  const fmtBits = getFormatBits(1, 0); // ECC-M=01, mask=000 → index=0b01_000
  placeFormat(mat, fmtBits, size);

  // Place data
  placeData(mat, all, size);

  // Applique masque 0 : (r+c) % 2 == 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (mat[r][c] !== null && mat[r][c] < 2 && (r + c) % 2 === 0) {
        mat[r][c] ^= 1;
      }
    }
  }

  return mat.map(row => row.map(v => v === 1 || v === 3));
}

function addFinder(mat, row, col) {
  const pattern = [[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,0,0,0,0,1],[1,1,1,1,1,1,1]];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    if (row+r < mat.length && col+c < mat.length) mat[row+r][col+c] = pattern[r][c] ? 3 : 2;
  }
  // Separators
  for (let i = -1; i <= 7; i++) {
    if (row-1 >= 0 && col+i >= 0 && col+i < mat.length && mat[row-1][col+i] === null) mat[row-1][col+i] = 2;
    if (row+7 < mat.length && col+i >= 0 && col+i < mat.length && mat[row+7][col+i] === null) mat[row+7][col+i] = 2;
    if (col-1 >= 0 && row+i >= 0 && row+i < mat.length && mat[row+i][col-1] === null) mat[row+i][col-1] = 2;
    if (col+7 < mat.length && row+i >= 0 && row+i < mat.length && mat[row+i][col+7] === null) mat[row+i][col+7] = 2;
  }
}

function addAlignment(mat, row, col) {
  const p = [[-2,-2],[-2,-1],[-2,0],[-2,1],[-2,2],[-1,-2],[-1,2],[0,-2],[0,2],[1,-2],[1,2],[2,-2],[2,-1],[2,0],[2,1],[2,2]];
  mat[row][col] = 3;
  for (const [dr,dc] of p) { if (mat[row+dr][col+dc] === null) mat[row+dr][col+dc] = 0; }
  for (const dr of [-1,0,1]) for (const dc of [-1,0,1]) { if (dr||dc) mat[row+dr][col+dc] = (Math.abs(dr)===1&&Math.abs(dc)===1)?3:2; }
}

function getFormatBits(eccLevel, mask) {
  const data = (eccLevel << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) ? 0x537 : 0);
  const raw = ((data << 10) | rem) ^ 0x5412;
  const bits = [];
  for (let i = 14; i >= 0; i--) bits.push((raw >> i) & 1);
  return bits;
}

function placeFormat(mat, bits, size) {
  const positions = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
  for (let i = 0; i < 15; i++) {
    const [r,c] = positions[i];
    mat[r][c] = bits[i] ? 3 : 2;
    const r2 = i < 7 ? size-1-i : (i < 9 ? size-15+i : size-15+i);
    const c2 = i < 8 ? size-8+i : (i < 9 ? size-8+i-7 : 8);
    if (i < 7)      { mat[size-1-i][8] = bits[i] ? 3 : 2; }
    else if (i < 8) { mat[size-8][8] = bits[i] ? 3 : 2; }
    else            { mat[8][size-15+i] = bits[i] ? 3 : 2; }
  }
}

function placeData(mat, cws, size) {
  let idx = 0, bitIdx = 7;
  for (let c = size-1; c >= 1; c -= 2) {
    if (c === 6) c--;
    for (let r2 = 0; r2 < size; r2++) {
      const r = (Math.floor(c / 2) % 2 === 0) ? size-1-r2 : r2;
      for (let ci = 0; ci < 2; ci++) {
        const col = c - ci;
        if (mat[r][col] === null) {
          const bit = idx < cws.length ? (cws[idx] >> bitIdx) & 1 : 0;
          mat[r][col] = bit;
          bitIdx--;
          if (bitIdx < 0) { bitIdx = 7; idx++; }
        }
      }
    }
  }
}

// Reed-Solomon GF(256) encoder
function rsEncode(data, eccCount) {
  const GEN = rsGenerator(eccCount);
  const msg = [...data, ...new Array(eccCount).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef) for (let j = 0; j < GEN.length; j++) msg[i+j] ^= gfMul(GEN[j], coef);
  }
  return msg.slice(data.length);
}

const GF_EXP = new Uint8Array(512), GF_LOG = new Uint8Array(256);
(function() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x; GF_LOG[x] = i;
    x = (x << 1) ^ (x & 0x80 ? 0x11D : 0);
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i-255];
})();

function gfMul(a, b) { return (a && b) ? GF_EXP[GF_LOG[a] + GF_LOG[b]] : 0; }
function gfPow(x, p) { return GF_EXP[(GF_LOG[x] * p) % 255]; }

function rsGenerator(n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const t = [1, gfPow(2, i)];
    const r = new Array(g.length + t.length - 1).fill(0);
    for (let a = 0; a < g.length; a++) for (let b = 0; b < t.length; b++) r[a+b] ^= gfMul(g[a],t[b]);
    g = r;
  }
  return g;
}

// ════════════════════════════════════════════════════════════
// 13. CSV <-> JSON CONVERTER
// ════════════════════════════════════════════════════════════

function csvToJson() {
  const raw  = document.getElementById('csv-input').value.trim();
  const out  = document.getElementById('csv-output');
  const sep  = document.getElementById('csv-sep').value || ',';
  const hasH = document.getElementById('csv-header').checked;

  if (!raw) { out.textContent = 'Entrez du CSV ci-dessus.'; return; }

  try {
    const lines   = raw.split(/\r?\n/).filter(l => l.trim());
    const headers = hasH ? parseCsvLine(lines[0], sep) : lines[0].split(sep).map((_,i) => `col${i+1}`);
    const start   = hasH ? 1 : 0;
    const data    = lines.slice(start).map(line => {
      const vals = parseCsvLine(line, sep);
      const obj  = {};
      headers.forEach((h, i) => obj[h.trim()] = vals[i]?.trim() ?? '');
      return obj;
    });

    out.textContent = JSON.stringify(data, null, 2);
    out.style.color = 'var(--text-code)';
    renderCsvTable(headers, data);
  } catch (e) {
    out.textContent = `Erreur : ${e.message}`; out.style.color = 'var(--accent-red)';
  }
}

function jsonToCsv() {
  const raw = document.getElementById('csv-input').value.trim();
  const out = document.getElementById('csv-output');
  const sep = document.getElementById('csv-sep').value || ',';

  if (!raw) { out.textContent = 'Entrez du JSON ci-dessus.'; return; }
  try {
    const data = JSON.parse(raw);
    const arr  = Array.isArray(data) ? data : [data];
    const headers = [...new Set(arr.flatMap(o => Object.keys(o)))];
    const lines = [
      headers.join(sep),
      ...arr.map(o => headers.map(h => {
        const v = String(o[h] ?? '');
        return v.includes(sep) || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v;
      }).join(sep))
    ];
    out.textContent = lines.join('\n');
    out.style.color = 'var(--text-code)';
    renderCsvTable(headers, arr);
  } catch (e) {
    out.textContent = `Erreur : ${e.message}`; out.style.color = 'var(--accent-red)';
  }
}

function parseCsvLine(line, sep) {
  const result = [], re = new RegExp(`(?:^|${sep === ',' ? ',' : sep})("(?:[^"]*(?:""[^"]*)*)")|([^${sep}]*)`, 'g');
  let m;
  while ((m = re.exec(line)) !== null) {
    if (m[0] === '') continue;
    result.push(m[1] ? m[1].slice(1,-1).replace(/""/g,'"') : (m[2] ?? ''));
  }
  return result;
}

function renderCsvTable(headers, rows) {
  const wrap  = document.getElementById('csv-table-wrap');
  const table = document.getElementById('csv-table');
  if (rows.length > 100) { wrap.style.display = 'none'; return; }
  const head  = `<thead><tr>${headers.map(h => `<th>${escHtmlT(h)}</th>`).join('')}</tr></thead>`;
  const body  = `<tbody>${rows.slice(0, 20).map(r =>
    `<tr>${headers.map(h => `<td>${escHtmlT(String(r[h]??''))}</td>`).join('')}</tr>`
  ).join('')}</tbody>`;
  table.innerHTML = head + body;
  wrap.style.display = 'block';
}

function escHtmlT(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ════════════════════════════════════════════════════════════
// 14. HASH CALCULATOR (Web Crypto API)
// ════════════════════════════════════════════════════════════

async function computeHashes() {
  const text = document.getElementById('hash-input').value;
  if (!text) { ['h-sha1','h-sha256','h-sha512'].forEach(id => document.getElementById(id).textContent = '-'); return; }
  const buf  = new TextEncoder().encode(text);
  await Promise.all([
    hashBuffer(buf, 'SHA-1',   'h-sha1'),
    hashBuffer(buf, 'SHA-256', 'h-sha256'),
    hashBuffer(buf, 'SHA-512', 'h-sha512'),
  ]);
  checkHash();
}

async function hashBuffer(buf, algo, id) {
  const hash   = await crypto.subtle.digest(algo, buf);
  const hexStr = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
  document.getElementById(id).textContent = hexStr;
}

function toggleHashFileMode() {
  const fileMode = document.getElementById('hash-file-mode').checked;
  document.getElementById('hash-input').style.display   = fileMode ? 'none' : 'block';
  document.getElementById('hash-file-btn').style.display = fileMode ? 'inline-flex' : 'none';
  if (!fileMode) computeHashes();
}

async function hashFile() {
  const file = document.getElementById('hash-file').files[0];
  if (!file) return;
  const buf = await file.arrayBuffer();
  await Promise.all([
    hashBuffer(buf, 'SHA-1',   'h-sha1'),
    hashBuffer(buf, 'SHA-256', 'h-sha256'),
    hashBuffer(buf, 'SHA-512', 'h-sha512'),
  ]);
}

function checkHash() {
  const input  = document.getElementById('hash-check').value.trim().toLowerCase();
  const result = document.getElementById('hash-check-result');
  if (!input) { result.textContent = ''; return; }
  const hashes = ['h-sha1','h-sha256','h-sha512'].map(id => document.getElementById(id).textContent.toLowerCase());
  const match  = hashes.includes(input);
  result.textContent = match ? '✅ Match' : '❌ Non';
  result.style.color = match ? 'var(--accent-green)' : 'var(--accent-red)';
}

function copyField2(id) {
  const val = document.getElementById(id)?.textContent?.trim();
  if (val && val !== '-') copyToClipboard(val, 'Hash copie !');
}

// ════════════════════════════════════════════════════════════
// 15. MARKDOWN PREVIEW
// ════════════════════════════════════════════════════════════

let _mdView = 'split';

function toggleMdView(mode) {
  _mdView = mode;
  const editor  = document.getElementById('md-input');
  const preview = document.getElementById('md-preview');
  const wrap    = document.getElementById('md-wrap');
  document.querySelectorAll('[id^="md-btn-"]').forEach(b => b.classList.remove('primary'));
  document.getElementById('md-btn-' + mode).classList.add('primary');
  wrap.className   = 'md-editor-wrap md-' + mode;
  editor.style.display  = mode === 'preview' ? 'none' : 'flex';
  preview.style.display = mode === 'editor'  ? 'none' : 'block';
}

function renderMarkdown() {
  const raw     = document.getElementById('md-input').value;
  const preview = document.getElementById('md-preview');
  preview.innerHTML = markdownToHtml(raw);
}

function markdownToHtml(md) {
  let html = md
    // Code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code class="lang-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^#{6} (.+)$/gm, '<h6>$1</h6>')
    .replace(/^#{5} (.+)$/gm, '<h5>$1</h5>')
    .replace(/^#{4} (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr/>')
    // Links & images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Unordered list
    .replace(/^\s*[-*+] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Ordered list
    .replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>')
    .replace(/(<oli>.*<\/oli>\n?)+/g, m => '<ol>' + m.replace(/<\/?oli>/g, m2 => m2.replace('oli','li')) + '</ol>')
    // Paragraphs
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');
  return `<p>${html}</p>`;
}

function insertMd(before, after) {
  const ta    = document.getElementById('md-input');
  const start = ta.selectionStart, end = ta.selectionEnd;
  const sel   = ta.value.slice(start, end);
  ta.value    = ta.value.slice(0, start) + before + sel + after + ta.value.slice(end);
  ta.setSelectionRange(start + before.length, end + before.length);
  ta.focus();
  renderMarkdown();
}

function insertMdLine(prefix) {
  const ta  = document.getElementById('md-input');
  const pos = ta.selectionStart;
  const ls  = ta.value.lastIndexOf('\n', pos - 1) + 1;
  ta.value  = ta.value.slice(0, ls) + prefix + ta.value.slice(ls);
  ta.setSelectionRange(pos + prefix.length, pos + prefix.length);
  ta.focus();
  renderMarkdown();
}

function copyMdHtml() {
  const md  = document.getElementById('md-input').value;
  const html = markdownToHtml(md);
  copyToClipboard(html, 'HTML copie !');
}

// ════════════════════════════════════════════════════════════
// 16. FAKE DATA GENERATOR
// ════════════════════════════════════════════════════════════

const FAKE = {
  firstNames: ['Alice','Bob','Charlie','Diane','Ethan','Fatima','Gabriel','Hannah','Ivan','Julie','Kevin','Laura','Mehdi','Nina','Oscar','Pauline','Quentin','Rosa','Samuel','Tina','Ugo','Vera','William','Xia','Yann','Zoe'],
  lastNames:  ['Martin','Bernard','Dubois','Thomas','Robert','Petit','Richard','Simon','Laurent','Michel','Lefevre','Dupont','Moreau','Girard','Andre','Fontaine','Rousseau','Blanc','Guerin','Faure'],
  cities:     ['Paris','Lyon','Marseille','Toulouse','Nice','Nantes','Strasbourg','Montpellier','Bordeaux','Lille','Rennes','Reims','Saint-Etienne','Toulon','Grenoble','Dijon','Angers','Nimes','Villeurbanne','Clermont-Ferrand'],
  streets:    ['Rue de la Paix','Avenue des Fleurs','Boulevard Haussmann','Rue du Commerce','Allée des Roses','Chemin des Lilas','Impasse du Moulin','Place de la Republique','Rue Victor Hugo','Avenue Jean Jaures'],
  companies:  ['TechCorp','DevLabs','PixelStudio','DataWave','CodeForge','NovaSoft','ByteWorks','CloudNine','NextGen','OpenStack','WebFlow','Agile++'],
  jobs:       ['Developpeur Frontend','Developpeur Backend','DevOps Engineer','Chef de Projet','UX Designer','Data Scientist','Product Manager','QA Engineer','Architecte Logiciel','CTO','Scrum Master','Tech Lead'],
  domains:    ['gmail.com','outlook.com','yahoo.fr','protonmail.com','icloud.com','hotmail.fr'],
  tlds:       ['fr','com','io','dev','tech','net'],
};

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function fakePerson() {
  const first = rnd(FAKE.firstNames);
  const last  = rnd(FAKE.lastNames);
  const obj   = {};

  if (document.getElementById('fk-name').checked)
    obj.nom = `${first} ${last}`;
  if (document.getElementById('fk-email').checked)
    obj.email = `${first.toLowerCase()}.${last.toLowerCase()}${rndInt(1,99)}@${rnd(FAKE.domains)}`;
  if (document.getElementById('fk-phone').checked)
    obj.telephone = `+33 ${rndInt(6,7)} ${Array.from({length:4},()=>String(rndInt(10,99))).join(' ')}`;
  if (document.getElementById('fk-address').checked)
    obj.adresse = `${rndInt(1,200)} ${rnd(FAKE.streets)}, ${rndInt(10,95)}${rndInt(0,9)}00 ${rnd(FAKE.cities)}`;
  if (document.getElementById('fk-company').checked)
    obj.entreprise = rnd(FAKE.companies);
  if (document.getElementById('fk-job').checked)
    obj.poste = rnd(FAKE.jobs);
  if (document.getElementById('fk-dob').checked) {
    const y = rndInt(1960,2002), m = String(rndInt(1,12)).padStart(2,'0'), d = String(rndInt(1,28)).padStart(2,'0');
    obj.dateNaissance = `${y}-${m}-${d}`;
  }
  if (document.getElementById('fk-uuid').checked)
    obj.id = crypto.randomUUID();
  if (document.getElementById('fk-ip').checked)
    obj.ip = `${rndInt(1,255)}.${rndInt(0,255)}.${rndInt(0,255)}.${rndInt(1,254)}`;
  if (document.getElementById('fk-website').checked)
    obj.site = `https://${rnd(FAKE.companies).toLowerCase()}.${rnd(FAKE.tlds)}`;

  return obj;
}

function generateFakeData() {
  const count  = parseInt(document.getElementById('fk-count').value);
  const format = document.getElementById('fk-format').value;
  const out    = document.getElementById('fake-output');
  const data   = Array.from({ length: count }, fakePerson);

  if (!data[0] || Object.keys(data[0]).length === 0) {
    out.textContent = 'Selectionnez au moins un champ.'; return;
  }

  if (format === 'json') {
    out.textContent = JSON.stringify(data, null, 2);
  } else if (format === 'csv') {
    const headers = Object.keys(data[0]);
    const lines   = [headers.join(','), ...data.map(r => headers.map(h => `"${(r[h]??'').replace(/"/g,'""')}"`).join(','))];
    out.textContent = lines.join('\n');
  } else if (format === 'sql') {
    const headers = Object.keys(data[0]);
    const table   = 'users';
    const inserts = data.map(r =>
      `INSERT INTO ${table} (${headers.join(', ')}) VALUES (${headers.map(h => `'${(r[h]??'').replace(/'/g,"''")}'`).join(', ')});`
    );
    out.textContent = inserts.join('\n');
  }
  out.style.color = 'var(--text-code)';
}
