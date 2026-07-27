/* ============================================
   Campus Lost & Found - auth.js  (Supabase Auth)
   ============================================ */

/* --------------------------------------------------
   Supabase client (shared with app.js via window)
   -------------------------------------------------- */

function showConfigError() {
  const banner = document.createElement('div');
  banner.style.cssText =
    'background:#E74C3C;color:#fff;text-align:center;padding:14px 20px;font-weight:600;position:sticky;top:64px;z-index:99;';
  banner.textContent =
    '⚠️  Supabase not configured. Open supabase-config.js and paste your URL + anon key.';
  document.body.insertBefore(banner, document.body.firstChild);
}

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
    console.warn('Supabase SDK failed to load.');
    return false;
  }

  window._db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return true;
}

/* --------------------------------------------------
   Auth state
   -------------------------------------------------- */
let currentUser = null;
let authListeners = [];

async function initAuth() {
  if (!window._db) return;

  const { data: { session } } = await window._db.auth.getSession();
  if (session?.user) currentUser = session.user;

  window._db.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    authListeners.forEach(fn => fn(event, currentUser));
  });
}

function onAuthStateChange(fn) {
  authListeners.push(fn);
}

/* --------------------------------------------------
   Auth API — all return { data, error } like Supabase
   -------------------------------------------------- */

async function signUp(email, password, displayName) {
  return window._db.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: window.location.origin + '/auth.html',
    },
  });
}

async function signIn(email, password) {
  return window._db.auth.signInWithPassword({ email, password });
}

async function signInWithGoogle() {
  const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';
  sessionStorage.setItem('auth_redirect', redirect);

  return window._db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/auth.html',
    },
  });
}

async function signOut() {
  const { error } = await window._db.auth.signOut();
  currentUser = null;
  return { error };
}

async function getSession() {
  const { data, error } = await window._db.auth.getSession();
  return { session: data?.session || null, error };
}

async function getCurrentUser() {
  return currentUser;
}

/* --------------------------------------------------
   Auth guards
   -------------------------------------------------- */

async function requireAuth(redirectTo) {
  const { session } = await getSession();
  if (!session?.user) {
    const dest = redirectTo || window.location.pathname.split('/').pop() || 'index.html';
    window.location.href = 'auth.html?redirect=' + encodeURIComponent(dest);
    return null;
  }
  return session.user;
}

/* --------------------------------------------------
   Profiles
   -------------------------------------------------- */

async function getDisplayName(userId) {
  if (!window._db || !userId) return null;
  try {
    const { data, error } = await window._db
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return data.display_name;
  } catch {
    return null;
  }
}

/* --------------------------------------------------
   Nav auth indicator (called on every page)
   -------------------------------------------------- */

async function updateNavAuth() {
  const container = document.getElementById('authNavItem');
  if (!container) return;

  try {
    const { session } = await getSession();
    if (session?.user) {
      const displayName = (await getDisplayName(session.user.id))
        || session.user.email?.split('@')[0] || 'User';
      container.innerHTML =
        '<a href="my-submissions.html" class="nav-user">' + escapeHtml(displayName) + '</a>' +
        '<a href="#" id="logoutBtnNav" class="nav-logout">Logout</a>';
      container.querySelector('#logoutBtnNav')
        ?.addEventListener('click', async (e) => {
          e.preventDefault();
          await signOut();
          window.location.href = 'index.html';
        });
    } else {
      container.innerHTML = '<a href="auth.html" class="nav-auth-btn">Sign In</a>';
    }
  } catch {
    container.innerHTML = '<a href="auth.html">Sign In</a>';
  }
}
