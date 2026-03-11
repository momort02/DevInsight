/**
 * script.js — Version GitHub Pages (100% frontend)
 * Appelle l'API GitHub REST directement depuis le navigateur
 * Limite : 60 req/heure sans token (token optionnel via localStorage)
 */

'use strict';

// ── État global ──────────────────────────────────────────────
let currentAnalysis = null;
let graphSimulation  = null;
let svgZoom          = null;

// ── Config API GitHub ────────────────────────────────────────

function getGhHeaders() {
  const token = localStorage.getItem('gh_token');
  const h = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'DevInsight/1.0'
  };
  if (token) h['Authorization'] = `token ${token}`;
  return h;
}

async function ghFetch(url) {
  const res = await fetch(url, { headers: getGhHeaders() });
  if (res.status === 403) {
    const reset = res.headers.get('X-RateLimit-Reset');
    const date  = reset ? new Date(reset * 1000).toLocaleTimeString('fr-FR') : '?';
    throw new Error(`Rate limit GitHub atteint. Réessayez après ${date} ou ajoutez un token (bouton ⚙ en haut à droite).`);
  }
  if (res.status === 404) throw new Error('Repository introuvable ou privé.');
  if (!res.ok) throw new Error(`Erreur GitHub API : ${res.status}`);
  return res.json();
}

function parseGitHubUrl(url) {
  const match = url.trim().match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
  if (!match) throw new Error('URL GitHub invalide. Format : https://github.com/owner/repo');
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

// ── Navigation ──────────────────────────────────────────────

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById(`view-${viewId}`).classList.add('active');
  const navEl = document.getElementById(`nav-${viewId}`);
  if (navEl) navEl.classList.add('active');
  if (viewId === 'arch' && currentAnalysis) {
    setTimeout(() => drawGraph(currentAnalysis.graphData), 100);
  }
}

function fillExample(url) {
  document.getElementById('repo-url').value = url;
  document.getElementById('repo-url').focus();
}

// ── Analyse principale ───────────────────────────────────────

async function analyzeRepo() {
  const url = document.getElementById('repo-url').value.trim();
  if (!url) { showError('Veuillez entrer une URL GitHub.'); return; }

  hideError();
  showLoader();
  hideResults();

  const btn = document.getElementById('analyze-btn');
  btn.disabled = true;
  document.getElementById('btn-text').textContent = 'Analyse…';

  try {
    animateLoaderSteps([
      'Connexion à l\'API GitHub…',
      'Récupération du repository…',
      'Analyse de l\'arborescence…',
      'Calcul du score de qualité…',
      'Préparation des visualisations…',
    ]);

    const { owner, repo } = parseGitHubUrl(url);

    // Appels parallèles à l'API GitHub
    const [repoInfo, languages, treeData, commits, contributors] = await Promise.all([
      ghFetch(`https://api.github.com/repos/${owner}/${repo}`),
      ghFetch(`https://api.github.com/repos/${owner}/${repo}/languages`),
      ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${await getDefaultBranch(owner, repo)}?recursive=1`),
      ghFetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`).catch(() => []),
      ghFetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=10`).catch(() => []),
    ]);

    const tree  = treeData.tree || [];
    const analysis = analyzeRepository(tree, languages, repoInfo);

    currentAnalysis = {
      repo: {
        owner, name: repo,
        fullName:  repoInfo.full_name,
        description: repoInfo.description,
        url:       repoInfo.html_url,
        avatarUrl: repoInfo.owner?.avatar_url,
        topics:    repoInfo.topics || [],
        license:   repoInfo.license?.name || null,
        defaultBranch: repoInfo.default_branch,
      },
      analysis,
      commits: commits.slice(0, 5).map(c => ({
        sha:    c.sha?.substring(0, 7),
        message: c.commit?.message?.split('\n')[0] || '',
        author:  c.commit?.author?.name || 'Unknown',
        date:    c.commit?.author?.date,
      })),
      contributors: contributors.slice(0, 8).map(c => ({
        login: c.login, avatarUrl: c.avatar_url,
        contributions: c.contributions, url: c.html_url,
      })),
      graphData: buildGraphData(tree),
    };

    hideLoader();
    renderResults(currentAnalysis);
    showResults();
    updateRateLimit();

  } catch (err) {
    hideLoader();
    showError(err.message || 'Erreur lors de l\'analyse');
  } finally {
    btn.disabled = false;
    document.getElementById('btn-text').textContent = 'Analyser';
  }
}

async function getDefaultBranch(owner, repo) {
  // On a déjà repoInfo dans la Promise.all mais on en a besoin avant
  // Utilise main/master comme fallback rapide
  try {
    const info = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`);
    return info.default_branch || 'main';
  } catch { return 'main'; }
}

// ── Analyse locale (logique portée depuis analyzer.js) ───────

const LANGUAGE_EXTENSIONS = {
  JavaScript:['.js','.mjs','.cjs'], TypeScript:['.ts','.tsx'],
  Python:['.py','.pyw'], Java:['.java'], 'C/C++':['.c','.cpp','.h','.hpp'],
  'C#':['.cs'], Ruby:['.rb'], Go:['.go'], Rust:['.rs'], PHP:['.php'],
  Swift:['.swift'], Kotlin:['.kt'], Dart:['.dart'], HTML:['.html','.htm'],
  CSS:['.css','.scss','.sass','.less'], Vue:['.vue'], Svelte:['.svelte'],
  Shell:['.sh','.bash'], YAML:['.yml','.yaml'], JSON:['.json'],
  Markdown:['.md','.mdx'], SQL:['.sql'],
};

const QUALITY_INDICATORS = {
  hasReadme:  ['readme.md','readme.txt','readme'],
  hasLicense: ['license','license.md','license.txt'],
  hasGitignore:['.gitignore'],
  hasTests:   ['test','tests','__tests__','spec'],
  hasCI:      ['.github','.gitlab-ci.yml','.travis.yml','.circleci'],
  hasDocs:    ['docs','documentation'],
  hasConfig:  ['package.json','cargo.toml','pyproject.toml','go.mod'],
  hasDocker:  ['dockerfile','docker-compose.yml'],
};

function analyzeRepository(tree, languages, repoInfo) {
  const files = tree.filter(i => i.type === 'blob');
  const dirs  = tree.filter(i => i.type === 'tree');

  return {
    summary: {
      totalFiles:      files.length,
      totalDirectories: dirs.length,
      estimatedLOC:    Math.round(Object.values(languages).reduce((s,b) => s+b, 0) / 50),
      primaryLanguage: getPrimaryLanguage(languages),
      projectType:     detectProjectType(files, languages),
      stars:           repoInfo.stargazers_count || 0,
      forks:           repoInfo.forks_count || 0,
      openIssues:      repoInfo.open_issues_count || 0,
      defaultBranch:   repoInfo.default_branch || 'main',
    },
    languages:    formatLanguages(languages),
    qualityScore: computeQualityScore(files, dirs, repoInfo, languages),
    structure:    buildStructureTree(tree),
  };
}

function formatLanguages(langs) {
  const total = Object.values(langs).reduce((s,b) => s+b, 0);
  if (!total) return [];
  return Object.entries(langs)
    .map(([name, bytes]) => ({ name, bytes, percentage: Math.round(bytes/total*1000)/10 }))
    .sort((a,b) => b.bytes - a.bytes).slice(0, 10);
}

function getPrimaryLanguage(langs) {
  const e = Object.entries(langs);
  return e.length ? e.sort((a,b) => b[1]-a[1])[0][0] : null;
}

function buildStructureTree(tree) {
  const root = {};
  for (const item of tree) {
    const parts = item.path.split('/');
    if (parts.length > 3) continue;
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (i === parts.length - 1) { if (!cur[p]) cur[p] = item.type === 'tree' ? {} : null; }
      else { if (!cur[p]) cur[p] = {}; cur = cur[p]; }
    }
  }
  return root;
}

function computeQualityScore(files, dirs, repoInfo, languages) {
  const all   = [...files,...dirs].map(f => f.path.toLowerCase());
  const roots = all.filter(p => !p.includes('/'));
  let org = 0, maint = 0, deploy = 0;
  if (hasAny(roots, QUALITY_INDICATORS.hasReadme))   org += 10;
  if (hasAny(roots, QUALITY_INDICATORS.hasLicense))  org += 5;
  if (hasAny(roots, QUALITY_INDICATORS.hasGitignore))org += 5;
  if (hasAny(all,   QUALITY_INDICATORS.hasDocs))     org += 5;
  if (hasAny(roots, QUALITY_INDICATORS.hasConfig))   org += 5;
  if (hasAny(all,   QUALITY_INDICATORS.hasTests))    maint += 15;
  if (hasAny(all,   QUALITY_INDICATORS.hasCI))       maint += 10;
  if (hasAny(all,   QUALITY_INDICATORS.hasDocker))   deploy += 10;
  if (repoInfo.has_wiki)                             deploy += 5;
  const deep     = files.filter(f => f.path.split('/').length > 5).length;
  const complex  = Math.round((1 - (files.length ? deep/files.length : 0)) * 20);
  const diversite= Math.min(Object.keys(languages).length * 2, 10);
  const details  = { organisation: Math.min(org,30), maintenabilite: Math.min(maint,25), complexite: Math.max(complex,0), diversite, deploiement: Math.min(deploy,15) };
  const total    = Object.values(details).reduce((a,b) => a+b, 0);
  return { total, details, grade: getGrade(total) };
}

function detectProjectType(files, languages) {
  const paths = files.map(f => f.path.toLowerCase());
  if (hasAny(paths,['next.config.js','next.config.ts','next.config.mjs'])) return 'Next.js App';
  if (hasAny(paths,['nuxt.config.js','nuxt.config.ts'])) return 'Nuxt.js App';
  if (hasAny(paths,['vite.config.js','vite.config.ts'])) return 'Vite App';
  if (hasAny(paths,['angular.json'])) return 'Angular App';
  if (hasAny(paths,['manage.py']))    return 'Django App';
  if (hasAny(paths,['cargo.toml']))   return 'Rust Project';
  if (hasAny(paths,['go.mod']))       return 'Go Project';
  if (hasAny(paths,['package.json'])) return 'Node.js Project';
  const p = getPrimaryLanguage(languages);
  return p ? `${p} Project` : 'Unknown Project';
}

function buildGraphData(tree) {
  const nodes = [], links = [], nodeMap = {};
  const selected = [...tree.filter(i=>i.type==='tree'), ...tree.filter(i=>i.type==='blob'&&i.path.split('/').length<=3)].slice(0,80);
  for (const item of selected) {
    const parts = item.path.split('/');
    const node  = { id: item.path, name: parts[parts.length-1], type: item.type, depth: parts.length-1, ext: parts[parts.length-1].includes('.')?parts[parts.length-1].split('.').pop():null };
    nodes.push(node); nodeMap[item.path] = node;
  }
  for (const node of nodes) {
    const parts = node.id.split('/');
    if (parts.length > 1) {
      const parentId = parts.slice(0,-1).join('/');
      if (nodeMap[parentId]) links.push({ source: parentId, target: node.id });
    }
  }
  const rootChildren = nodes.filter(n => !n.id.includes('/'));
  if (rootChildren.length) {
    nodes.unshift({ id:'__root__', name:'/', type:'root', depth:-1 });
    rootChildren.forEach(c => links.push({ source:'__root__', target:c.id }));
  }
  return { nodes, links };
}

function hasAny(paths, targets) {
  return targets.some(t => paths.some(p => p === t || p.endsWith('/'+t) || p.includes('/'+t+'/')));
}

function getGrade(score) {
  if (score >= 85) return { letter:'A', label:'Excellent', color:'#22c55e' };
  if (score >= 70) return { letter:'B', label:'Bon',       color:'#84cc16' };
  if (score >= 55) return { letter:'C', label:'Moyen',     color:'#eab308' };
  if (score >= 40) return { letter:'D', label:'Faible',    color:'#f97316' };
  return { letter:'F', label:'Insuffisant', color:'#ef4444' };
}

// ── Rate limit & Token UI ────────────────────────────────────

async function updateRateLimit() {
  try {
    const data = await ghFetch('https://api.github.com/rate_limit');
    const { remaining, limit, reset } = data.rate;
    const statusEl = document.getElementById('api-status');
    statusEl.textContent = `${remaining}/${limit} req restantes`;
    statusEl.style.color = remaining < 10 ? 'var(--accent-red)' : remaining < 20 ? 'var(--accent-orange)' : 'var(--accent-green)';
  } catch {}
}

function openTokenModal() {
  const modal = document.getElementById('token-modal');
  const input = document.getElementById('token-input');
  const status = document.getElementById('token-status');
  const current = localStorage.getItem('gh_token') || '';
  input.value = current;
  input.type  = 'password';
  status.textContent = current ? '✓ Token actuellement configuré' : '';
  status.className   = current ? 'token-status valid' : 'token-status';
  modal.classList.add('open');
  setTimeout(() => input.focus(), 100);
  updateTokenButton();
}

function closeTokenModal(event) {
  if (event && event.target !== document.getElementById('token-modal')) return;
  document.getElementById('token-modal').classList.remove('open');
}

function toggleTokenVisibility() {
  const input = document.getElementById('token-input');
  input.type  = input.type === 'password' ? 'text' : 'password';
}

async function saveToken() {
  const input  = document.getElementById('token-input');
  const status = document.getElementById('token-status');
  const token  = input.value.trim();

  if (!token) { clearToken(); return; }

  // Validation rapide du format
  if (!token.startsWith('ghp_') && !token.startsWith('github_pat_') && token.length < 20) {
    status.textContent = '✗ Format invalide (doit commencer par ghp_ ou github_pat_)';
    status.className   = 'token-status invalid';
    return;
  }

  status.textContent = '⏳ Vérification…';
  status.className   = 'token-status checking';

  try {
    const res = await fetch('https://api.github.com/rate_limit', {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (res.status === 401) {
      status.textContent = '✗ Token invalide ou expiré';
      status.className   = 'token-status invalid';
      return;
    }
    const data = await res.json();
    const limit = data?.rate?.limit || 0;
    localStorage.setItem('gh_token', token);
    status.textContent = `✓ Token valide — ${limit} req/h disponibles`;
    status.className   = 'token-status valid';
    updateTokenButton();
    updateRateLimit();
    setTimeout(() => {
      document.getElementById('token-modal').classList.remove('open');
      showToast('✓ Token enregistré — 5000 req/h');
    }, 1200);
  } catch {
    status.textContent = '✗ Impossible de vérifier (réseau ?)';
    status.className   = 'token-status invalid';
  }
}

function clearToken() {
  localStorage.removeItem('gh_token');
  document.getElementById('token-input').value = '';
  const status = document.getElementById('token-status');
  status.textContent = 'Token supprimé';
  status.className   = 'token-status';
  updateTokenButton();
  updateRateLimit();
  showToast('Token supprimé — 60 req/h');
}

function updateTokenButton() {
  const btn = document.querySelector('.btn-token');
  if (!btn) return;
  const has = !!localStorage.getItem('gh_token');
  btn.classList.toggle('has-token', has);
  btn.innerHTML = has ? '🔑 Token ✓' : '⚙ Token';
}

// Ferme la modale avec Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('token-modal')?.classList.remove('open');
});

// ── DOMContentLoaded ─────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('repo-url').addEventListener('keydown', e => {
    if (e.key === 'Enter') analyzeRepo();
  });
  updateRateLimit();
  updateTokenButton();
  if (typeof initToolbox === 'function') initToolbox();
});

// ── Navigation mobile ────────────────────────────────────────

function setMobileNav(viewId) {
  document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
  const el = document.getElementById(`mnav-${viewId}`);
  if (el) el.classList.add('active');
}

// ── Rendu des résultats ──────────────────────────────────────

function renderResults(data) {
  const { repo, analysis, commits, contributors } = data;
  const { summary, languages, qualityScore, structure } = analysis;

  document.getElementById('r-avatar').src              = repo.avatarUrl || '';
  document.getElementById('r-fullname').textContent    = repo.fullName;
  document.getElementById('r-desc').textContent        = repo.description || 'Aucune description';
  document.getElementById('r-type').textContent        = summary.projectType || '–';
  document.getElementById('r-branch').textContent      = `branch: ${summary.defaultBranch}`;
  document.getElementById('r-license').textContent     = repo.license ? `📄 ${repo.license}` : '';
  document.getElementById('r-topics').innerHTML        = (repo.topics||[]).slice(0,6).map(t=>`<span class="topic-tag">${t}</span>`).join('');
  document.getElementById('s-files').textContent       = formatNum(summary.totalFiles);
  document.getElementById('s-dirs').textContent        = formatNum(summary.totalDirectories);
  document.getElementById('s-loc').textContent         = formatNum(summary.estimatedLOC);
  document.getElementById('s-lang').textContent        = languages.length;
  document.getElementById('s-stars').textContent       = formatNum(summary.stars);
  document.getElementById('s-forks').textContent       = formatNum(summary.forks);

  renderLanguages(languages);
  renderQualityScore(qualityScore);
  renderTree(structure);
  renderCommits(commits);
  renderContributors(contributors);
  document.getElementById('arch-hint').textContent = `${summary.totalFiles} fichiers · ${summary.totalDirectories} dossiers`;
}

// ── Langages ─────────────────────────────────────────────────

const LANG_COLORS = {
  JavaScript:'#f7df1e', TypeScript:'#3178c6', Python:'#3776ab', Java:'#b07219',
  'C/C++':'#555555', 'C#':'#178600', Ruby:'#701516', Go:'#00add8', Rust:'#dea584',
  PHP:'#4f5d95', Swift:'#fa7343', Kotlin:'#a97bff', Dart:'#00b4ab', HTML:'#e34c26',
  CSS:'#563d7c', Vue:'#42b883', Svelte:'#ff3e00', Shell:'#89e051', YAML:'#cb171e',
  JSON:'#f8c300', Markdown:'#0866d3', SQL:'#e97b00',
};

function renderLanguages(languages) {
  const el = document.getElementById('lang-list');
  el.innerHTML = languages.slice(0,8).map(lang => {
    const color = LANG_COLORS[lang.name] || '#64748b';
    return `<div class="lang-item">
      <div class="lang-info"><span class="lang-name" style="color:${color}">${lang.name}</span><span class="lang-pct">${lang.percentage}%</span></div>
      <div class="lang-bar-bg"><div class="lang-bar" style="width:0%;background:${color}" data-width="${lang.percentage}%"></div></div>
    </div>`;
  }).join('');
  requestAnimationFrame(() => el.querySelectorAll('.lang-bar').forEach(b => b.style.width = b.dataset.width));
}

// ── Score qualité ────────────────────────────────────────────

const SCORE_LABELS = { organisation:'Organisation', maintenabilite:'Maintenabilité', complexite:'Complexité', diversite:'Diversité', deploiement:'Déploiement' };
const SCORE_MAX    = { organisation:30, maintenabilite:25, complexite:20, diversite:10, deploiement:15 };

function renderQualityScore(qs) {
  const circle = document.getElementById('score-circle');
  circle.style.borderColor = qs.grade.color;
  document.getElementById('score-grade').style.color  = qs.grade.color;
  document.getElementById('score-grade').textContent  = qs.grade.letter;
  document.getElementById('score-total').textContent  = `${qs.total} / 100`;
  document.getElementById('q-label').textContent      = qs.grade.label;
  document.getElementById('score-details').innerHTML  = Object.entries(qs.details).map(([key,val]) => {
    const max = SCORE_MAX[key]||10, pct = Math.round(val/max*100);
    return `<div class="score-row">
      <span class="score-row-label">${SCORE_LABELS[key]||key}</span>
      <div class="score-mini-bar"><div class="score-mini-fill" style="width:0%" data-width="${pct}%"></div></div>
      <span class="score-num">${val}/${max}</span>
    </div>`;
  }).join('');
  requestAnimationFrame(() => document.querySelectorAll('.score-mini-fill').forEach(b => b.style.width = b.dataset.width));
}

// ── Structure arborescente ───────────────────────────────────

function renderTree(structure, container=null, depth=0) {
  const el = container || document.getElementById('tree-container');
  if (!container) el.innerHTML = '';
  for (const [name, children] of Object.entries(structure)) {
    const isDir  = children !== null && typeof children === 'object';
    const item   = document.createElement('div');
    item.className = `tree-item ${isDir?'is-dir':'is-file'}`;
    const indent = '  '.repeat(depth);
    const connector = depth > 0 ? '├─ ' : '';
    item.innerHTML = `<span style="color:var(--text-muted);font-size:0.7rem">${indent}${connector}</span><span>${isDir?'📂':getFileIcon(name)}</span><span>${name}</span>`;
    el.appendChild(item);
    if (isDir && depth < 2) renderTree(children, el, depth+1);
  }
}

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  const icons = { js:'🟨',ts:'🔷',jsx:'⚛️',tsx:'⚛️',py:'🐍',rb:'💎',go:'🐹',rs:'🦀',java:'☕',php:'🐘',cs:'💜',html:'🌐',css:'🎨',scss:'🎨',json:'📋',yaml:'📋',yml:'📋',md:'📄',txt:'📄',dockerfile:'🐳',sh:'⚡',png:'🖼',jpg:'🖼',svg:'🖼' };
  return icons[ext] || '📄';
}

// ── Commits & Contributeurs ──────────────────────────────────

function renderCommits(commits) {
  const el = document.getElementById('commit-list');
  if (!commits?.length) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem">Aucun commit récupéré</div>'; return; }
  el.innerHTML = commits.map(c => `<div class="commit-item">
    <span class="commit-sha">${c.sha}</span>
    <span class="commit-msg" title="${escHtml(c.message)}">${escHtml(c.message)}</span>
    <span class="commit-author">${escHtml(c.author)}</span>
  </div>`).join('');
}

function renderContributors(contributors) {
  const el = document.getElementById('contributors-list');
  if (!contributors?.length) { el.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem">Aucun contributeur</div>'; return; }
  el.innerHTML = contributors.map(c => `<a class="contributor-chip" href="${c.url}" target="_blank" rel="noopener">
    <img class="contributor-avatar" src="${c.avatarUrl}" alt="${c.login}" loading="lazy"/>
    <span>${c.login}</span>
    <span style="color:var(--text-muted);font-size:0.68rem">(${c.contributions})</span>
  </a>`).join('');
}

// ── Graphe D3 ────────────────────────────────────────────────

function drawGraph(graphData) {
  const placeholder = document.getElementById('graph-placeholder');
  if (!graphData?.nodes?.length) { if (placeholder) placeholder.style.display='flex'; return; }
  if (placeholder) placeholder.style.display = 'none';
  const container = document.getElementById('graph-container');
  const svg = d3.select('#graph-canvas');
  svg.selectAll('*').remove();
  const W = container.clientWidth, H = container.clientHeight;
  const g = svg.append('g');
  svgZoom = d3.zoom().scaleExtent([0.1,4]).on('zoom', e => g.attr('transform', e.transform));
  svg.call(svgZoom);
  const nodes = graphData.nodes.map(n=>({...n}));
  const links = graphData.links.map(l=>({...l}));
  const nodeColor = d => d.type==='root'||d.type==='tree' ? '#38bdf8' : ['json','yaml','yml','toml','lock','env'].includes(d.ext) ? '#34d399' : '#818cf8';
  const nodeSize  = d => d.type==='root' ? 10 : d.type==='tree' ? 7 : 4;
  graphSimulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d=>d.id).distance(60).strength(0.8))
    .force('charge', d3.forceManyBody().strength(-120))
    .force('center', d3.forceCenter(W/2,H/2))
    .force('collision', d3.forceCollide().radius(d=>nodeSize(d)+8));
  const link = g.append('g').attr('stroke','#1e3a5f').attr('stroke-opacity',0.6).selectAll('line').data(links).join('line').attr('stroke-width',1);
  const node = g.append('g').selectAll('g').data(nodes).join('g')
    .call(d3.drag()
      .on('start',(e,d)=>{ if(!e.active) graphSimulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag', (e,d)=>{ d.fx=e.x; d.fy=e.y; })
      .on('end',  (e,d)=>{ if(!e.active) graphSimulation.alphaTarget(0); d.fx=null; d.fy=null; })
    );
  node.append('circle').attr('r',nodeSize).attr('fill',nodeColor).attr('fill-opacity',0.85);
  node.filter(d=>d.depth<=1).append('text').attr('dy',d=>nodeSize(d)+12).attr('text-anchor','middle').attr('font-family','JetBrains Mono,monospace').attr('font-size',9).attr('fill','#94a3b8').text(d=>d.name.length>18?d.name.slice(0,15)+'…':d.name);
  node.append('title').text(d=>d.id);
  graphSimulation.on('tick',() => {
    link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    node.attr('transform',d=>`translate(${d.x},${d.y})`);
  });
}

function resetZoom() { d3.select('#graph-canvas').transition().duration(400).call(svgZoom?.transform||((s,t)=>{}), d3.zoomIdentity); }
function zoomIn()    { d3.select('#graph-canvas').transition().duration(200).call(svgZoom?.scaleBy||((s,k)=>{}), 1.4); }
function zoomOut()   { d3.select('#graph-canvas').transition().duration(200).call(svgZoom?.scaleBy||((s,k)=>{}), 0.7); }

// ── UI Helpers ───────────────────────────────────────────────

function showLoader()   { document.getElementById('loader').classList.add('visible'); }
function hideLoader()   { document.getElementById('loader').classList.remove('visible'); }
function showResults()  { document.getElementById('results').classList.add('visible'); }
function hideResults()  { document.getElementById('results').classList.remove('visible'); }
function showError(msg) { document.getElementById('error-msg').textContent = msg; document.getElementById('error-box').classList.add('visible'); }
function hideError()    { document.getElementById('error-box').classList.remove('visible'); }

function animateLoaderSteps(steps) {
  const container = document.getElementById('loader-steps');
  container.innerHTML = '';
  steps.forEach((step,i) => {
    const el = document.createElement('div');
    el.className = 'loader-step'; el.textContent = step;
    el.style.animationDelay = `${i*0.8}s`;
    container.appendChild(el);
  });
}

function formatNum(n) {
  if (n==null) return '–';
  if (n>=1e6) return (n/1e6).toFixed(1)+'M';
  if (n>=1e3) return (n/1e3).toFixed(1)+'k';
  return String(n);
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function copyToClipboard(text, label='Copié !') {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea');
    el.value = text; document.body.appendChild(el); el.select();
    document.execCommand('copy'); document.body.removeChild(el);
  });
  showToast(`✓ ${label}`);
}

function showToast(msg) {
  document.querySelectorAll('.toast').forEach(t=>t.remove());
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(()=>toast.remove(), 2200);
}