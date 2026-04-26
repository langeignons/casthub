/**
 * auth.js — Gestion des comptes, sessions et rôles
 * CastHub / Minecraft Event Manager
 */

const STORAGE_USERS = 'casthub_users';
const STORAGE_SESSION = 'casthub_session';

// ──────────────────────────────────────────
// Données par défaut : compte admin initial
// ──────────────────────────────────────────
const DEFAULT_USERS = [
  { id: 'u1', username: 'admin', password: 'admin1234', role: 'admin' },
];

// ──────────────────────────────────────────
// Chargement / sauvegarde
// ──────────────────────────────────────────
function loadUsers() {
  const raw = localStorage.getItem(STORAGE_USERS);
  if (!raw) {
    localStorage.setItem(STORAGE_USERS, JSON.stringify(DEFAULT_USERS));
    return [...DEFAULT_USERS];
  }
  return JSON.parse(raw);
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
}

// ──────────────────────────────────────────
// Authentification
// ──────────────────────────────────────────

/**
 * Tente de connecter un utilisateur.
 * @returns {object|null} l'utilisateur ou null
 */
export function login(username, password) {
  const users = loadUsers();
  const user = users.find(
    u => u.username === username.trim() && u.password === password
  );
  if (!user) return null;
  const session = { id: user.id, username: user.username, role: user.role };
  localStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
  return session;
}

/** Déconnecte l'utilisateur courant */
export function logout() {
  localStorage.removeItem(STORAGE_SESSION);
}

/** Retourne la session active ou null */
export function getSession() {
  const raw = localStorage.getItem(STORAGE_SESSION);
  return raw ? JSON.parse(raw) : null;
}

/** Vérifie si l'utilisateur est connecté, sinon redirige */
export function requireAuth() {
  const session = getSession();
  return session;
}

// ──────────────────────────────────────────
// Gestion des comptes (admin)
// ──────────────────────────────────────────

/** Liste tous les utilisateurs */
export function listUsers() {
  return loadUsers();
}

/**
 * Crée un nouvel utilisateur.
 * @returns {{ ok: boolean, error?: string }}
 */
export function createUser(username, password, role) {
  if (!username || !password) return { ok: false, error: 'Pseudo et mot de passe requis.' };
  const users = loadUsers();
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, error: 'Ce pseudo est déjà utilisé.' };
  }
  const newUser = {
    id: 'u_' + Date.now(),
    username: username.trim(),
    password,
    role: role || 'visiteur',
  };
  users.push(newUser);
  saveUsers(users);
  return { ok: true };
}

/**
 * Supprime un utilisateur par id.
 */
export function deleteUser(id) {
  const session = getSession();
  if (session && session.id === id) return { ok: false, error: 'Impossible de se supprimer soi-même.' };
  const users = loadUsers().filter(u => u.id !== id);
  saveUsers(users);
  return { ok: true };
}

// ──────────────────────────────────────────
// Helpers de rôle
// ──────────────────────────────────────────
export function isAdmin(session)  { return session?.role === 'admin'; }
export function isEditor(session) { return session?.role === 'admin' || session?.role === 'caster'; }
