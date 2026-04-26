/**
 * ui.js — Utilitaires d'interface partagés
 * Modals, toasts, login overlay, navbar
 * CastHub / Minecraft Event Manager
 */

import { login, logout, getSession, isAdmin, isEditor } from './auth.js';

// ──────────────────────────────────────────
// MODALS
// ──────────────────────────────────────────

/** Ouvre une modal par son id */
export function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

/** Ferme une modal par son id */
export function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

// Rend les fonctions disponibles globalement (onclick= dans le HTML)
window.openModal  = openModal;
window.closeModal = closeModal;

// Fermer en cliquant sur le fond
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.add('hidden');
  }
});

// Fermer avec Echap
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal:not(.hidden)').forEach(m => m.classList.add('hidden'));
  }
});

// ──────────────────────────────────────────
// TOAST
// ──────────────────────────────────────────
let toastTimer = null;

/**
 * Affiche un toast.
 * @param {string} msg
 * @param {'success'|'error'|''} type
 */
export function toast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

// ──────────────────────────────────────────
// LOGIN OVERLAY
// ──────────────────────────────────────────

/**
 * Initialise le système de login sur la page courante.
 * @param {function} onLoggedIn callback appelé avec la session
 */
export function initLogin(onLoggedIn) {
  const overlay = document.getElementById('login-overlay');
  const app     = document.getElementById('app');
  const btn     = document.getElementById('login-btn');
  const errEl   = document.getElementById('login-error');

  // Déjà connecté ?
  const existingSession = getSession();
  if (existingSession) {
    overlay.classList.add('hidden');
    app.classList.remove('hidden');
    onLoggedIn(existingSession);
    return;
  }

  // Soumission login
  const doLogin = () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const session  = login(username, password);
    if (!session) {
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');
    overlay.classList.add('hidden');
    app.classList.remove('hidden');
    onLoggedIn(session);
  };

  btn.addEventListener('click', doLogin);
  document.getElementById('login-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
}

// ──────────────────────────────────────────
// NAVBAR
// ──────────────────────────────────────────

/**
 * Configure la navbar avec les infos de session.
 */
export function initNavbar(session) {
  // Pseudo
  const navUsername = document.getElementById('nav-username');
  if (navUsername) navUsername.textContent = session.username;

  // Badge rôle
  const badge = document.getElementById('nav-role-badge');
  if (badge) {
    badge.textContent = session.role;
    badge.className = `user-badge role-${session.role}`;
  }

  // Lien admin
  const adminLink = document.getElementById('nav-admin-link');
  if (adminLink && isAdmin(session)) adminLink.classList.remove('hidden');

  // Bouton logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout();
    window.location.reload();
  });

  // Visibilité éléments selon rôle
  if (isAdmin(session)) {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }
  if (isEditor(session)) {
    document.querySelectorAll('.editor-only').forEach(el => el.classList.remove('hidden'));
  }
}

// ──────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────

/** Formate une date ISO en format lisible */
export function formatDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Génère les initiales d'un nom (2 caractères max) */
export function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}
