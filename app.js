/* ============================================
   Campus Lost & Found - app.js  (Supabase)
   ============================================ */

/* --------------------------------------------------
   Constants
-------------------------------------------------- */
const PAGE_SIZE      = 10;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;  // 2 MB
const MAX_DESCRIPTION = 500;
const DRAFT_KEY      = 'lf_draft';
const SESSION_KEY    = 'lf_session';

/* --------------------------------------------------
   Supabase client
-------------------------------------------------- */
let db = null;

function initSupabase() {
  const unconfigured =
    typeof SUPABASE_URL      === 'undefined' ||
    typeof SUPABASE_ANON_KEY === 'undefined' ||
    SUPABASE_URL      === 'YOUR_SUPABASE_URL_HERE' ||
    SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE';

  if (unconfigured) {
    showConfigError();
    return false;
  }

  if (typeof window.supabase === 'undefined') {
    showToast('Supabase SDK failed to load. Check your internet connection.');
    return false;
  }

  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return true;
}

function showConfigError() {
  const banner = document.createElement('div');
  banner.style.cssText =
    'background:#E74C3C;color:#fff;text-align:center;padding:14px 20px;font-weight:600;position:sticky;top:64px;z-index:99;';
  banner.textContent =
    '⚠️  Supabase not configured. Open supabase-config.js and paste your URL + anon key.';
  document.body.insertBefore(banner, document.body.firstChild);
}

/* --------------------------------------------------
   DB layer — all async, returns plain JS objects
-------------------------------------------------- */

// Map DB snake_case row → camelCase item
function rowToItem(r) {
  return {
    id:            r.id,
    type:          r.type,
    name:          r.name,
    description:   r.description || '',
    location:      r.location,
    dateLostFound: r.date_lost_found,
    dateReported:  r.date_reported,
    imageBase64:   r.image_base64 || '',
    contact:       r.contact,
    nickname:      r.nickname,
    status:        r.status,
    editCode:      r.edit_code,
  };
}

// Map camelCase item → DB snake_case row
function itemToRow(item) {
  return {
    id:             item.id,
    type:           item.type,
    name:           item.name,
    description:    item.description || '',
    location:       item.location,
    date_lost_found:item.dateLostFound,
    date_reported:  item.dateReported,
    image_base64:   item.imageBase64 || '',
    contact:        item.contact,
    nickname:       item.nickname,
    status:         item.status || 'open',
    edit_code:      item.editCode,
  };
}

async function dbFetchItems({ filter = 'all', search = '', sort = 'newest', page = 0 } = {}) {
  let q = db.from('items').select('*', { count: 'exact' });

  // Hide resolved items on home browse
  q = q.neq('status', 'resolved');

  if (filter !== 'all') q = q.eq('type', filter);

  if (search) {
    q = q.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  q = q.order('date_reported', { ascending: sort === 'oldest' });
  q = q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { items: (data || []).map(rowToItem), total: count ?? 0 };
}

async function dbGetItemById(id) {
  const { data, error } = await db
    .from('items')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return rowToItem(data);
}

async function dbInsertItem(item) {
  const { error } = await db.from('items').insert(itemToRow(item));
  if (error) throw error;
}

async function dbUpdateStatus(id, status) {
  const { error } = await db
    .from('items')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

async function dbDeleteItem(id) {
  const { error } = await db.from('items').delete().eq('id', id);
  if (error) throw error;
}

async function dbFetchByNickname(nickname, code) {
  let q = db
    .from('items')
    .select('*')
    .ilike('nickname', nickname)
    .order('date_reported', { ascending: false });

  if (code) q = q.eq('edit_code', code.toUpperCase());

  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(rowToItem);
}

/* --------------------------------------------------
   Utilities
-------------------------------------------------- */
function generateId() {
  return 'item_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(s) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function isValidContact(v) {
  v = v.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^[0-9+\-\s()]{7,}$/.test(v);
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function showToast(msg, duration = 2800) {
  let t = document.getElementById('appToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'appToast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function showFieldError(inputId, msg) {
  const el = document.getElementById(inputId);
  if (!el) return;
  const g = el.closest('.form-group');
  g.classList.add('has-error');
  const err = g.querySelector('.field-error');
  if (err) err.textContent = msg;
}

function clearErrors(form) {
  form.querySelectorAll('.form-group.has-error').forEach(g => g.classList.remove('has-error'));
}

function highlightActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav.main-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === page);
  });
}

function setLoading(el, on) {
  if (!el) return;
  if (on) el.classList.add('loading');
  else el.classList.remove('loading');
}

/* =====================================================================
   HOME PAGE
===================================================================== */
let homeState = { filter: 'all', search: '', sort: 'newest', page: 0, total: 0 };

async function initHomePage() {
  const grid = document.getElementById('itemsGrid');
  if (!grid) return;

  const searchInput = document.getElementById('searchInput');
  const sortSelect  = document.getElementById('sortSelect');
  const pills       = document.querySelectorAll('.filter-pills .pill');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  const debouncedSearch = debounce(async (val) => {
    homeState.search = val.toLowerCase();
    homeState.page   = 0;
    grid.innerHTML   = '';
    await renderHomeGrid(true);
  }, 350);

  searchInput.addEventListener('input', e => debouncedSearch(e.target.value.trim()));

  sortSelect.addEventListener('change', async e => {
    homeState.sort = e.target.value;
    homeState.page = 0;
    grid.innerHTML = '';
    await renderHomeGrid(true);
  });

  pills.forEach(pill => {
    pill.addEventListener('click', async () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      homeState.filter = pill.dataset.filter;
      homeState.page   = 0;
      grid.innerHTML   = '';
      await renderHomeGrid(true);
    });
  });

  loadMoreBtn.addEventListener('click', async () => {
    homeState.page++;
    await renderHomeGrid(false);
  });

  showSkeletons();
  await renderHomeGrid(true);
}

function showSkeletons() {
  const grid = document.getElementById('itemsGrid');
  grid.innerHTML = Array(6).fill('<div class="skeleton skeleton-card"></div>').join('');
  document.getElementById('loadMoreBtn').classList.add('hidden');
}

async function renderHomeGrid(replace = true) {
  const grid      = document.getElementById('itemsGrid');
  const emptyState = document.getElementById('emptyState');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  try {
    const { items, total } = await dbFetchItems({
      filter: homeState.filter,
      search: homeState.search,
      sort:   homeState.sort,
      page:   homeState.page,
    });

    homeState.total = total;

    if (replace && items.length === 0) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
      loadMoreBtn.classList.add('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    if (replace) grid.innerHTML = '';
    grid.insertAdjacentHTML('beforeend', items.map(renderCard).join(''));

    const loadedSoFar = (homeState.page + 1) * PAGE_SIZE;
    loadMoreBtn.classList.toggle('hidden', loadedSoFar >= total);

    grid.querySelectorAll('.card:not([data-bound])').forEach(card => {
      card.dataset.bound = '1';
      card.addEventListener('click', () => {
        window.location.href = 'item.html?id=' + encodeURIComponent(card.dataset.id);
      });
    });

  } catch (err) {
    console.error(err);
    showToast('Failed to load items. Check your connection.');
  }
}

function renderCard(item) {
  const badgeClass = item.type === 'lost' ? 'badge-lost' : 'badge-found';
  const badgeLabel = item.type === 'lost' ? 'Lost' : 'Found';
  const thumb = item.imageBase64
    ? `<img class="card-thumb" src="${item.imageBase64}" alt="${escapeHtml(item.name)}" loading="lazy">`
    : `<div class="card-thumb placeholder">📦</div>`;

  return `
    <div class="card" data-id="${escapeHtml(item.id)}">
      ${thumb}
      <div class="card-body">
        <span class="badge ${badgeClass}">${badgeLabel}</span>
        <h3 class="card-title">${escapeHtml(item.name)}</h3>
        <div class="card-meta">
          <span>📍 ${escapeHtml(item.location)}</span>
          <span>🗓️ ${formatDate(item.dateLostFound)}</span>
        </div>
      </div>
    </div>`;
}

/* =====================================================================
   ADD ITEM PAGE
===================================================================== */
function initAddPage() {
  const form = document.getElementById('addItemForm');
  if (!form) return;

  const typeButtons      = document.querySelectorAll('.type-btn');
  const typeInput        = document.getElementById('itemType');
  const locationSelect   = document.getElementById('locationSelect');
  const otherLocGroup    = document.getElementById('otherLocationGroup');
  const otherLocInput    = document.getElementById('otherLocation');
  const descInput        = document.getElementById('description');
  const charCounter      = document.getElementById('charCounter');
  const imageInput       = document.getElementById('imageInput');
  const imagePreview     = document.getElementById('imagePreview');
  const dateInput        = document.getElementById('dateLostFound');
  const successBox       = document.getElementById('successBox');

  dateInput.value = new Date().toISOString().split('T')[0];

  typeButtons.forEach(btn => btn.addEventListener('click', () => {
    typeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    typeInput.value = btn.dataset.type;
  }));

  locationSelect.addEventListener('change', () => {
    otherLocGroup.classList.toggle('hidden', locationSelect.value !== 'Other');
  });

  descInput.addEventListener('input', () => {
    const len = Math.min(descInput.value.length, MAX_DESCRIPTION);
    descInput.value = descInput.value.slice(0, MAX_DESCRIPTION);
    charCounter.textContent = `${len} / ${MAX_DESCRIPTION}`;
    saveDraft();
  });

  let currentImageBase64 = '';

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    const errEl = document.getElementById('imageError');
    errEl.textContent = '';
    if (!file) { imagePreview.style.display = 'none'; currentImageBase64 = ''; return; }
    if (file.size > MAX_IMAGE_BYTES) {
      errEl.textContent = 'Image must be 2 MB or smaller.';
      imageInput.value = '';
      currentImageBase64 = '';
      imagePreview.style.display = 'none';
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      currentImageBase64 = e.target.result;
      imagePreview.querySelector('img').src = currentImageBase64;
      imagePreview.style.display = 'block';
      saveDraft();
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('input', saveDraft);

  function saveDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        type:          typeInput.value,
        name:          document.getElementById('itemName').value,
        description:   descInput.value,
        location:      locationSelect.value,
        otherLocation: otherLocInput.value,
        dateLostFound: dateInput.value,
        contact:       document.getElementById('contact').value,
        nickname:      document.getElementById('nickname').value,
        imageBase64:   currentImageBase64,
      }));
    } catch(e) { /* ignore quota */ }
  }

  function restoreDraft() {
    let d;
    try { d = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch(e) { return; }
    if (!d) return;

    if (d.type) {
      typeInput.value = d.type;
      typeButtons.forEach(b => b.classList.toggle('active', b.dataset.type === d.type));
    }
    document.getElementById('itemName').value  = d.name  || '';
    descInput.value                            = d.description || '';
    charCounter.textContent = `${descInput.value.length} / ${MAX_DESCRIPTION}`;
    if (d.location) {
      locationSelect.value = d.location;
      otherLocGroup.classList.toggle('hidden', d.location !== 'Other');
    }
    otherLocInput.value = d.otherLocation || '';
    if (d.dateLostFound) dateInput.value = d.dateLostFound;
    document.getElementById('contact').value  = d.contact  || '';
    document.getElementById('nickname').value = d.nickname || '';
    if (d.imageBase64) {
      currentImageBase64 = d.imageBase64;
      imagePreview.querySelector('img').src = currentImageBase64;
      imagePreview.style.display = 'block';
    }
  }

  restoreDraft();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    clearErrors(form);

    let valid = true;
    const name        = document.getElementById('itemName').value.trim();
    const description = descInput.value.trim();
    let   location    = locationSelect.value;
    const otherLoc    = otherLocInput.value.trim();
    const dateLF      = dateInput.value;
    const contact     = document.getElementById('contact').value.trim();
    const nickname    = document.getElementById('nickname').value.trim();

    if (!name)   { showFieldError('itemName', 'Please enter an item name'); valid = false; }
    if (!location) { showFieldError('locationSelect', 'Please select a location'); valid = false; }
    else if (location === 'Other') {
      if (!otherLoc) { showFieldError('otherLocation', 'Please specify the location'); valid = false; }
      else location = otherLoc;
    }
    if (!dateLF) { showFieldError('dateLostFound', 'Please select a date'); valid = false; }
    if (!contact || !isValidContact(contact)) {
      showFieldError('contact', 'Please enter a valid email or phone number'); valid = false;
    }
    if (!nickname) { showFieldError('nickname', 'Nickname required (shown to others)'); valid = false; }
    else if (nickname.length > 20) { showFieldError('nickname', 'Max 20 characters'); valid = false; }

    if (!valid) return;

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Submitting…';

    const item = {
      id:            generateId(),
      type:          typeInput.value || 'lost',
      name,
      description,
      location,
      dateLostFound: dateLF,
      dateReported:  new Date().toISOString(),
      imageBase64:   currentImageBase64,
      contact,
      nickname,
      status:        'open',
      editCode:      generateCode(),
    };

    try {
      await dbInsertItem(item);
      localStorage.removeItem(DRAFT_KEY);
      form.classList.add('hidden');
      successBox.classList.remove('hidden');
      document.getElementById('successCode').textContent = item.editCode;
      document.getElementById('viewItemLink').href = 'item.html?id=' + encodeURIComponent(item.id);
      successBox.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      showToast('Failed to submit. Check your connection and try again.');
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Report Item';
    }
  });
}

/* =====================================================================
   ITEM DETAILS PAGE
===================================================================== */
async function initItemDetailsPage() {
  const container = document.getElementById('itemDetailsContainer');
  if (!container) return;

  const id = getQueryParam('id');
  if (!id) {
    renderItemError(container);
    return;
  }

  container.innerHTML = `<div class="empty-state"><div class="spinner"></div><p>Loading item…</p></div>`;

  try {
    const item = await dbGetItemById(id);
    renderItemDetails(item, container);
  } catch (err) {
    console.error(err);
    renderItemError(container);
  }
}

function renderItemError(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <p>Item not found. It may have been removed or resolved.</p>
      <a href="index.html" class="btn btn-primary mt-16">Back to Home</a>
    </div>`;
}

function renderItemDetails(item, container) {
  const badgeClass = item.type === 'lost' ? 'badge-lost' : 'badge-found';
  const badgeLabel = item.type === 'lost' ? 'Lost' : 'Found';
  const statusBadge = item.status === 'resolved'
    ? '<span class="badge badge-resolved">Resolved</span>'
    : '<span class="badge badge-open">Open</span>';

  const imageHtml = item.imageBase64
    ? `<div class="detail-image-wrap" id="imageWrap"><img src="${item.imageBase64}" alt="${escapeHtml(item.name)}"></div>`
    : `<div class="detail-image-wrap placeholder">📦</div>`;

  const contactIsEmail = isEmail(item.contact);
  const mailtoHref = contactIsEmail
    ? `mailto:${encodeURIComponent(item.contact)}?subject=${encodeURIComponent('Regarding ' + item.name)}`
    : '';

  container.innerHTML = `
    <div class="detail-grid">
      ${imageHtml}
      <div class="detail-card">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <span class="badge ${badgeClass}">${badgeLabel}</span>
          ${statusBadge}
        </div>
        <h1>${escapeHtml(item.name)}</h1>
        <p>${escapeHtml(item.description) || '<em style="color:#888">No description provided.</em>'}</p>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Location</div>
            <div class="info-value">${escapeHtml(item.location)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date ${item.type === 'lost' ? 'Lost' : 'Found'}</div>
            <div class="info-value">${formatDate(item.dateLostFound)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Reported On</div>
            <div class="info-value">${formatDateTime(item.dateReported)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Item ID</div>
            <div class="info-value" style="font-family:monospace;font-size:0.82rem;word-break:break-all;">${escapeHtml(item.id)}</div>
          </div>
        </div>

        <div class="contact-box">
          <div><strong>Posted by:</strong> ${escapeHtml(item.nickname)}</div>
          <div><strong>Contact:</strong> ${escapeHtml(item.contact)}</div>
        </div>

        <div class="warning-box">
          ⚠️ Be cautious when meeting someone — meet in public campus spots.
        </div>

        <div class="form-actions">
          ${contactIsEmail
            ? `<a class="btn btn-primary" href="${mailtoHref}">✉️ Contact via Email</a>`
            : `<button class="btn btn-primary" id="copyContactBtn">📋 Copy Contact Info</button>`}
          <a class="btn btn-outline" href="index.html">⬅ Back to Home</a>
        </div>

        <div class="form-actions">
          <button class="btn btn-outline" id="shareBtn">🔗 Copy Link</button>
          ${item.status !== 'resolved'
            ? `<button class="btn btn-success" id="resolveBtn">✅ Mark Resolved</button>`
            : ''}
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="imageModal">
      <button class="modal-close" id="modalClose">&times;</button>
      <img src="${item.imageBase64 || ''}" alt="${escapeHtml(item.name)}">
    </div>`;

  // Image modal
  const wrap = document.getElementById('imageWrap');
  if (wrap) wrap.addEventListener('click', () => document.getElementById('imageModal').classList.add('open'));
  const modal = document.getElementById('imageModal');
  document.getElementById('modalClose').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

  // Copy contact (phone)
  const copyBtn = document.getElementById('copyContactBtn');
  if (copyBtn) copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(item.contact).then(() => showToast('Contact copied!'));
  });

  // Share
  document.getElementById('shareBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => showToast('Link copied!'));
  });

  // Resolve
  const resolveBtn = document.getElementById('resolveBtn');
  if (resolveBtn) {
    resolveBtn.addEventListener('click', async () => {
      const code = prompt('Enter your 6-character item code to mark it resolved:');
      if (code === null) return;
      if (code.trim().toUpperCase() === (item.editCode || '').toUpperCase()) {
        resolveBtn.disabled = true;
        resolveBtn.textContent = 'Saving…';
        try {
          await dbUpdateStatus(item.id, 'resolved');
          showToast('Item marked as resolved!');
          renderItemDetails({ ...item, status: 'resolved' }, container);
        } catch (err) {
          showToast('Failed to update. Try again.');
          resolveBtn.disabled = false;
          resolveBtn.textContent = '✅ Mark Resolved';
        }
      } else {
        showToast('Incorrect code. Nothing changed.');
      }
    });
  }
}

/* =====================================================================
   MY SUBMISSIONS PAGE
===================================================================== */
function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch(e) { return null; }
}
function setSession(nickname, code) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nickname, code }));
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function initMySubmissionsPage() {
  const loginCard      = document.getElementById('loginCard');
  const submissionsView = document.getElementById('submissionsView');
  if (!loginCard) return;

  const session = getSession();
  if (session) {
    loginCard.classList.add('hidden');
    submissionsView.classList.remove('hidden');
    document.getElementById('welcomeText').textContent = `Items posted by "${session.nickname}"`;
    renderSubmissionsList(session.nickname, session.code);
  }

  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const nickname = document.getElementById('loginNickname').value.trim();
    const code     = document.getElementById('loginCode').value.trim().toUpperCase();
    if (!nickname) { showFieldError('loginNickname', 'Please enter your nickname'); return; }
    document.getElementById('loginNickname').closest('.form-group').classList.remove('has-error');
    setSession(nickname, code);
    loginCard.classList.add('hidden');
    submissionsView.classList.remove('hidden');
    document.getElementById('welcomeText').textContent = `Items posted by "${nickname}"`;
    await renderSubmissionsList(nickname, code);
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearSession();
    submissionsView.classList.add('hidden');
    loginCard.classList.remove('hidden');
    document.getElementById('loginForm').reset();
  });
}

async function renderSubmissionsList(nickname, code) {
  const listEl  = document.getElementById('submissionsList');
  const emptyEl = document.getElementById('submissionsEmpty');

  listEl.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>Loading…</p></div>';

  try {
    const items = await dbFetchByNickname(nickname, code);

    if (items.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');
    listEl.innerHTML = items.map(renderSubmissionRow).join('');

    listEl.querySelectorAll('.row-title').forEach(el =>
      el.addEventListener('click', () => {
        window.location.href = 'item.html?id=' + encodeURIComponent(el.dataset.id);
      })
    );

    listEl.querySelectorAll('.delete-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        if (!confirm('Are you sure? This cannot be undone.')) return;
        btn.disabled = true;
        try {
          await dbDeleteItem(btn.dataset.id);
          showToast('Item deleted.');
          const session = getSession();
          await renderSubmissionsList(session.nickname, session.code);
        } catch (err) {
          showToast('Failed to delete. Try again.');
          btn.disabled = false;
        }
      })
    );

    listEl.querySelectorAll('.resolve-btn').forEach(btn =>
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await dbUpdateStatus(btn.dataset.id, 'resolved');
          showToast('Marked as resolved!');
          const session = getSession();
          await renderSubmissionsList(session.nickname, session.code);
        } catch (err) {
          showToast('Failed to update. Try again.');
          btn.disabled = false;
        }
      })
    );

  } catch (err) {
    console.error(err);
    listEl.innerHTML = '<p class="text-muted center-text">Failed to load submissions. Check your connection.</p>';
  }
}

function renderSubmissionRow(item) {
  const badgeClass  = item.type === 'lost' ? 'badge-lost' : 'badge-found';
  const badgeLabel  = item.type === 'lost' ? 'Lost' : 'Found';
  const statusClass = item.status === 'resolved' ? 'badge-resolved' : 'badge-open';
  const statusLabel = item.status === 'resolved' ? 'Resolved' : 'Open';
  const rowClass    = item.status === 'resolved' ? 'submission-row resolved-strike' : 'submission-row';

  return `
    <div class="${rowClass}">
      <div class="submission-info">
        <div class="row-title" data-id="${escapeHtml(item.id)}">${escapeHtml(item.name)}</div>
        <div class="submission-meta">
          <span class="badge ${badgeClass}">${badgeLabel}</span>
          <span class="badge ${statusClass}">${statusLabel}</span>
          <span>${formatDate(item.dateReported)}</span>
        </div>
      </div>
      <div class="submission-actions">
        ${item.status !== 'resolved'
          ? `<button class="btn btn-success btn-sm resolve-btn" data-id="${escapeHtml(item.id)}">Resolved</button>`
          : ''}
        <button class="btn btn-danger btn-sm delete-btn" data-id="${escapeHtml(item.id)}">Delete</button>
      </div>
    </div>`;
}

/* =====================================================================
   INIT
===================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  highlightActiveNav();
  if (!initSupabase()) return;

  await initHomePage();
  initAddPage();
  await initItemDetailsPage();
  initMySubmissionsPage();
});
