'use strict';

const MODPATH = '/data/adb/modules/BootAnimationLoader';
const TMPDIR  = MODPATH + '/tmp';
const LOGFILE = MODPATH + '/module.log';

let activeSysPath = null;
let activeModPath = null;

function findKsu() {
  try { if (window.ksu && typeof window.ksu.exec === 'function') return window.ksu; } catch (_) {}
  try { if (window.parent && window.parent.ksu && typeof window.parent.ksu.exec === 'function') return window.parent.ksu; } catch (_) {}
  return null;
}
const ksu = findKsu();

const $ = (id) => document.getElementById(id);
function setText(id, val) { const el = $(id); if (el) el.textContent = val; }

let toastTimer = 0;
function showToast(msg, type) {
  clearTimeout(toastTimer);
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show ' + (type || 'info');
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

let loadingCount = 0;
function pushLoading(text) {
  const overlay = $('loading-overlay');
  const label   = $('loading-text');
  if (!overlay) return;
  loadingCount++;
  overlay.style.display = 'flex';
  if (label && text) label.textContent = text;
}
function popLoading() {
  loadingCount = Math.max(0, loadingCount - 1);
  if (loadingCount === 0) {
    const overlay = $('loading-overlay');
    if (overlay) overlay.style.display = 'none';
  }
}

async function exec(cmd) {
  if (!ksu) return { ok: true, stdout: '', stderr: '' };
  return new Promise((resolve) => {
    const cb = 'cb_' + Date.now() + '_' + (Math.random() * 9999 | 0);
    window[cb] = (exitCode, stdout, stderr) => {
      delete window[cb];
      const rc = Number(exitCode);
      resolve({
        ok:     rc === 0,
        stdout: (stdout || '').replace(/\r/g, '').trim(),
        stderr: (stderr || '').replace(/\r/g, '').trim(),
      });
    };
    ksu.exec('(\n' + cmd + '\n)', '{}', cb);
  });
}

async function execJson(cmd) {
  const r = await exec(cmd);
  if (!r.ok) throw new Error(r.stderr || 'Shell error');
  try { return JSON.parse(r.stdout); }
  catch { throw new Error('Bad JSON: ' + r.stdout.slice(0, 120)); }
}

async function execRetry(cmd, attempts) {
  attempts = attempts || 2;
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await execJson(cmd); }
    catch (e) { lastErr = e; if (i < attempts - 1) await sleep(300); }
  }
  throw lastErr;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function debounce(fn, ms) {
  let t;
  return function() {
    clearTimeout(t);
    const ctx = this, args = arguments;
    t = setTimeout(() => fn.apply(ctx, args), ms);
  };
}

function fmtSize(bytes) {
  if (!bytes || bytes === 'N/A' || bytes === 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  let n = Number(bytes), i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return n.toFixed(i ? 1 : 0) + ' ' + u[i];
}

const LOCALE_MAP = { ru:'ru-RU', en:'en-US', uk:'uk-UA', de:'de-DE', fr:'fr-FR', es:'es-ES', pt:'pt-BR', it:'it-IT', tr:'tr-TR', pl:'pl-PL', zh:'zh-CN', ja:'ja-JP', ko:'ko-KR' };

function fmtTime() {
  const loc = LOCALE_MAP[currentLang] || 'en-US';
  return new Date().toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function shellQuote(s) {
  return "'" + String(s).replace(/'/g, "'\\''") + "'";
}

function dirname(p) {
  const i = p.lastIndexOf('/');
  return i > 0 ? p.substring(0, i) : '/';
}

async function fileExists(path) {
  const r = await exec('[ -f ' + shellQuote(path) + ' ] && echo 1');
  return r.stdout === '1';
}

async function extractInfo(path) {
  if (!path || !(await fileExists(path))) return null;
  const q = shellQuote(path);
  const script =
    'sz=$(stat -c%s ' + q + ' 2>/dev/null || echo 0)\n' +
    'w="" ; h="" ; f="" ; pt=0 ; v=false\n' +
    'if unzip -t ' + q + ' >/dev/null 2>&1; then\n' +
    '  d=$(mktemp -d)\n' +
    '  unzip -qq -j ' + q + ' desc.txt -d "$d" 2>/dev/null\n' +
    '  if [ -f "$d/desc.txt" ]; then\n' +
    '    read w h f _ < "$d/desc.txt"\n' +
    '    pt=$(unzip -l ' + q + ' 2>/dev/null | grep -oE "part[0-9]+" | sort -u | wc -l)\n' +
    '    v=true\n' +
    '  fi\n' +
    '  rm -rf "$d"\n' +
    'fi\n' +
    'cat <<ENDJSON\n' +
    '{"width":"$w","height":"$h","fps":"$f","parts":$pt,"file_size":"$sz","is_valid":$v}\n' +
    'ENDJSON';
  try {
    return await execJson(script);
  } catch {
    return { width: 'N/A', height: 'N/A', fps: 'N/A', parts: 0, file_size: '0', is_valid: false };
  }
}

function showFilePicker(startPath) {
  return new Promise((resolve) => {
    let currentPath = startPath || '/sdcard';

    const overlay = document.createElement('div');
    overlay.className = 'picker-overlay';
    overlay.innerHTML = `
      <div class="picker-modal">
        <div class="picker-header">
          <div class="picker-title">${t('pickerTitle')}</div>
          <div class="picker-path" id="picker-path">${currentPath}</div>
        </div>
        <div class="picker-list" id="picker-list">
          <div class="picker-empty">${t('loading')}</div>
        </div>
        <div class="picker-footer">
          <button class="picker-btn picker-btn-cancel" id="picker-cancel">${t('cancel')}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    const close = (result) => {
      overlay.classList.remove('active');
      setTimeout(() => { overlay.remove(); resolve(result); }, 200);
    };

    overlay.querySelector('#picker-cancel').onclick = () => close(null);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });

    const listEl = overlay.querySelector('#picker-list');
    const pathEl = overlay.querySelector('#picker-path');

    async function loadDir(path) {
      listEl.innerHTML = '<div class="picker-empty">' + t('loading') + '</div>';
      pathEl.textContent = path;

      const r = await exec('ls -a1p ' + shellQuote(path) + ' 2>/dev/null');
      const items = (r.stdout || '').split('\n').filter(Boolean);

      let html = '';
      const dirs = [];
      const files = [];

      items.forEach(item => {
        if (item === './' || item === '../') {
          if (path !== '/') dirs.push(item);
          return;
        }
        if (item.endsWith('/')) dirs.push(item);
        else files.push(item);
      });

      dirs.sort((a, b) => a.localeCompare(b));
      files.sort((a, b) => a.localeCompare(b));

      if (path !== '/') html += '<div class="picker-item is-dir" data-path=".."><span class="picker-item-icon">&#128193;</span>..</div>';

      dirs.forEach(d => {
        const name = d.slice(0, -1);
        html += '<div class="picker-item is-dir" data-path=' + shellQuote(name) + '><span class="picker-item-icon">&#128193;</span>' + name + '</div>';
      });

      files.forEach(f => {
        const isZip = f.toLowerCase().endsWith('.zip');
        const cls = isZip ? ' picker-item is-zip' : '';
        const icon = isZip ? '&#128229;' : '&#128196;';
        html += '<div class="picker-item' + cls + '" data-file=' + shellQuote(f) + '><span class="picker-item-icon">' + icon + '</span>' + f + '</div>';
      });

      listEl.innerHTML = html || '<div class="picker-empty">' + t('emptyFolder') + '</div>';
      currentPath = path;
    }

    listEl.addEventListener('click', (e) => {
      const item = e.target.closest('.picker-item');
      if (!item) return;

      if (item.dataset.path) {
        const name = item.dataset.path;
        const next = name === '..'
          ? currentPath.split('/').slice(0, -1).join('/') || '/'
          : (currentPath === '/' ? '/' : currentPath + '/') + name;
        loadDir(next);
      } else if (item.dataset.file) {
        const fullPath = (currentPath === '/' ? '/' : currentPath + '/') + item.dataset.file;
        close(fullPath);
      }
    });

    loadDir(currentPath);
  });
}

async function detectPaths() {
  activeModPath = null;
  activeSysPath = null;

  const configPath = MODPATH + '/config.txt';
  if (await fileExists(configPath)) {
    const r = await exec('cat ' + shellQuote(configPath));
    const sysPath = (r.stdout || '').trim();
    if (sysPath) {
      const modP = MODPATH + sysPath;
      if (await fileExists(modP)) {
        activeModPath = modP;
      } else if (await fileExists(sysPath)) {
        activeSysPath = sysPath;
      }
    }
  }
}

async function loadDashboard() {
  pushLoading(t('loadingInfo'));
  try {
    await detectPaths();

    const activePath = activeModPath || activeSysPath || '';
    const info = await extractInfo(activePath);

    const model = await exec('getprop ro.product.model');
    const android = await exec('getprop ro.build.version.release');

    setText('device-model',    (model.stdout || '—').trim());
    setText('android-version', (android.stdout || '—').trim());
    setText('current-bootanim', activePath || t('notFound'));

    if (info) {
      setText('cur-res',   (info.width && info.width !== 'N/A') ? info.width + '×' + info.height : '—');
      setText('cur-fps',   (info.fps && info.fps !== 'N/A') ? info.fps : '—');
      setText('cur-parts', (info.parts && info.parts !== '0') ? info.parts : '—');
      setText('cur-size',  fmtSize(info.file_size));
    }

    addLog('info', t('dashLoaded'));
  } catch (e) {
    showToast(t('loadError') + e.message, 'error');
    addLog('error', 'Dashboard: ' + e.message);
  } finally {
    popLoading();
  }
}

let selectedFilePath = null;

async function pickAndValidate() {
  const filePath = await showFilePicker('/sdcard');
  if (!filePath) return;

  if (!filePath.toLowerCase().endsWith('.zip')) {
    showToast(t('selectZip'), 'error');
    return;
  }

  selectedFilePath = filePath;
  const fileName = filePath.split('/').pop();

  $('preview-filename').textContent = fileName;
  $('preview-size').textContent     = '';
  $('file-preview').style.display   = 'block';
  $('upload-area').style.display    = 'none';
  $('clear-btn').style.display      = 'inline-flex';
  $('install-btn').disabled         = true;
  $('validation-results').style.display = 'none';

  try {
    pushLoading(t('validating'));

    const valid = await fileExists(filePath);
    if (!valid) throw new Error(t('fileNotFound'));

    const info = await extractInfo(filePath);
    if (!info) throw new Error(t('readError'));

    if (!info.is_valid) {
      const tmpd = await exec([
        'd=$(mktemp -d)',
        'unzip -qq -j ' + shellQuote(filePath) + ' desc.txt -d "$d" 2>/dev/null',
        'if [ ! -f "$d/desc.txt" ]; then echo NO_DESC',
        'else',
        '  pt=$(grep -oE "part[0-9]+" "$d/desc.txt" | sort -u | wc -l)',
        '  [ "$pt" -eq 0 ] && echo NO_PARTS || echo ERR',
        'fi',
        'rm -rf "$d"',
      ].join('\n'));
      const errType = (tmpd.stdout || '').trim();
      const errMsg = errType === 'NO_DESC' ? t('noDesc')
                   : errType === 'NO_PARTS' ? t('noParts')
                   : t('invalidZip');
      throw new Error(errMsg);
    }

    setText('preview-size', fmtSize(info.file_size));
    setText('val-res',   (info.width && info.width !== 'N/A') ? info.width + '×' + info.height : '—');
    setText('val-fps',   (info.fps && info.fps !== 'N/A') ? info.fps : '—');
    setText('val-parts', (info.parts && info.parts !== '0') ? info.parts : '—');
    setText('val-size',  fmtSize(info.file_size));

    const msg = $('validation-message');
    msg.className = 'validation-message success';
    msg.textContent = t('validOk');
    $('install-btn').disabled = false;
    showToast(t('validDone'), 'success');
    addLog('info', 'Valid: ' + fileName);
    $('validation-results').style.display = 'block';
  } catch (e) {
    const msg = $('validation-message');
    msg.className = 'validation-message error';
    msg.textContent = '✗ ' + e.message;
    $('validation-results').style.display = 'block';
    $('install-btn').disabled = true;
    showToast(t('errorPrefix') + e.message, 'error');
    addLog('error', 'Upload: ' + e.message);
  } finally {
    popLoading();
  }
}

function clearUpload() {
  selectedFilePath = null;
  $('file-preview').style.display        = 'none';
  $('upload-area').style.display         = 'flex';
  $('validation-results').style.display  = 'none';
  $('clear-btn').style.display           = 'none';
  $('install-btn').disabled              = true;
}

async function installBootanimation() {
  if (!selectedFilePath) { showToast(t('noFile'), 'error'); return; }

  const configPath = MODPATH + '/config.txt';
  if (!(await fileExists(configPath))) {
    showToast(t('noPath'), 'error');
    return;
  }
  const r2 = await exec('cat ' + shellQuote(configPath));
  const sysPath = (r2.stdout || '').trim();
  if (!sysPath) {
    showToast(t('noPath'), 'error');
    return;
  }

  const dest = MODPATH + sysPath;

  pushLoading(t('installing'));
  try {
    await exec('mkdir -p ' + shellQuote(dirname(dest)));
    const r = await exec('cp ' + shellQuote(selectedFilePath) + ' ' + shellQuote(dest));
    if (!r.ok) throw new Error(r.stderr || t('copyError'));

    showToast(t('installed'), 'success');
    addLog('info', 'Install: OK');
    clearUpload();
    await loadDashboard();
  } catch (e) {
    showToast(t('installError') + e.message, 'error');
    addLog('error', 'Install: ' + e.message);
  } finally {
    popLoading();
  }
}

async function restoreBootanimation() {
  pushLoading(t('deleting'));
  try {
    if (!activeModPath) {
      showToast(t('alreadyRemoved'), 'info');
      return;
    }

    const r = await exec('rm -f ' + shellQuote(activeModPath));
    if (!r.ok) throw new Error(r.stderr || t('deleteError'));

    showToast(t('removed'), 'success');
    addLog('info', 'Restore: OK');
    await loadDashboard();
  } catch (e) {
    showToast(t('errorPrefix') + e.message, 'error');
    addLog('error', 'Restore: ' + e.message);
  } finally {
    popLoading();
  }
}

function showConfirm(msg) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'picker-overlay';
    overlay.innerHTML = `
      <div class="picker-modal" style="max-width:360px">
        <div class="picker-header">
          <div class="picker-title" style="font-size:var(--md-sys-typescale-body-large-font-size)">${msg}</div>
        </div>
        <div class="picker-footer">
          <button class="picker-btn picker-btn-cancel" id="confirm-no">${t('cancel')}</button>
          <button class="picker-btn picker-btn-select" id="confirm-yes">${t('yes')}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
    const close = (v) => {
      overlay.classList.remove('active');
      setTimeout(() => { overlay.remove(); resolve(v); }, 200);
    };
    overlay.querySelector('#confirm-no').onclick = () => close(false);
    overlay.querySelector('#confirm-yes').onclick = () => close(true);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
  });
}

async function rebootDevice() {
  const yes = await showConfirm(t('confirmReboot'));
  if (!yes) return;
  showToast(t('rebooting'), 'info');
  addLog('info', 'Reboot');
  if (ksu) {
    ksu.exec('(\nsync\nreboot\n)', '{}', 'cb_reboot');
  } else {
    await exec('sync && reboot');
  }
}

const logs = { info: [], error: [] };

function addLog(type, msg) {
  if (type === 'debug') return;
  logs[type].push('[' + fmtTime() + '] ' + msg);
  if (logs[type].length > 100) logs[type] = logs[type].slice(-100);
}

let activeTab = 'info';
let debugTimer = null;

async function pollDebug() {
  const r = await exec('cat ' + shellQuote(LOGFILE) + ' 2>/dev/null');
  const out = $('logs-output');
  if (out && activeTab === 'debug') {
    out.textContent = r.stdout || t('noRecords');
    out.scrollTop = out.scrollHeight;
  }
}

function startDebugPolling() {
  stopDebugPolling();
  pollDebug();
  debugTimer = setInterval(pollDebug, 2000);
}

function stopDebugPolling() {
  if (debugTimer) { clearInterval(debugTimer); debugTimer = null; }
}

function switchTab(type) {
  activeTab = type;
  document.querySelectorAll('.log-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-log-type="' + type + '"]').classList.add('active');

  if (type === 'debug') {
    startDebugPolling();
  } else {
    stopDebugPolling();
    const arr = logs[type] || [];
    const out = $('logs-output');
    if (out) out.textContent = arr.length ? arr.join('\n') : t('noRecords');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyTranslations();

  const langSel = $('lang-select');
  if (langSel) {
    langSel.value = currentLang;
    langSel.addEventListener('change', () => setLang(langSel.value));
  }

  $('upload-area').addEventListener('click', pickAndValidate);
  $('install-btn').addEventListener('click', debounce(installBootanimation, 500));
  $('clear-btn').addEventListener('click', clearUpload);
  $('restore-btn').addEventListener('click', debounce(restoreBootanimation, 500));
  $('reboot-btn').addEventListener('click', debounce(rebootDevice, 500));

  document.querySelectorAll('.log-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.logType));
  });

  loadDashboard();
});
