/**
 * main.js — Contrôleur de la page index (liste des events)
 * CastHub / Minecraft Event Manager
 */

import { getSession, isAdmin, listUsers, createUser, deleteUser } from './auth.js';
import { getEvents, createEvent, deleteEvent } from './data.js';
import { initLogin, initNavbar, openModal, closeModal, toast, formatDate } from './ui.js';

let currentSession = null;
let pendingDeleteEventId = null;

// ──────────────────────────────────────────
// BOOTSTRAP
// ──────────────────────────────────────────
initLogin(session => {
  currentSession = session;
  initNavbar(session);
  bindEventPageListeners();
  renderEvents();
});

// ──────────────────────────────────────────
// RENDU DES EVENTS
// ──────────────────────────────────────────
function renderEvents() {
  const grid   = document.getElementById('events-grid');
  const noEvEl = document.getElementById('no-events');
const events = await getEvents();

  grid.innerHTML = '';

  if (!events.length) {
    noEvEl.classList.remove('hidden');
    return;
  }
  noEvEl.classList.add('hidden');

  // Tri : plus récent en premier
  const sorted = [...events].sort((a, b) => b.createdAt - a.createdAt);

  sorted.forEach((ev, i) => {
    const card = buildEventCard(ev, i);
    grid.appendChild(card);
  });
}

function buildEventCard(ev, index) {
  const admin = isAdmin(currentSession);
  const totalPlayers = ev.teams.reduce((sum, t) => sum + t.players.length, 0);

  const card = document.createElement('div');
  card.className = 'event-card';
  card.style.animationDelay = `${index * 60}ms`;
  card.innerHTML = `
    <div class="event-card-header">
      <div class="event-card-name">${escHtml(ev.name)}</div>
      ${admin ? `
        <div class="event-card-actions">
          <button class="btn-icon danger" title="Supprimer" data-delete="${ev.id}">🗑</button>
        </div>` : ''}
    </div>
    ${ev.date ? `<div class="event-card-date">📅 ${formatDate(ev.date)}</div>` : ''}
    <div class="event-card-stats">
      <div class="event-stat">
        <span class="event-stat-val">${ev.teams.length}</span>
        <span class="event-stat-label">Équipes</span>
      </div>
      <div class="event-stat">
        <span class="event-stat-val">${ev.playersPerTeam}</span>
        <span class="event-stat-label">/ équipe</span>
      </div>
      <div class="event-stat">
        <span class="event-stat-val">${totalPlayers}</span>
        <span class="event-stat-label">Joueurs</span>
      </div>
    </div>
  `;

  // Clic sur la carte → page event
  card.addEventListener('click', e => {
    if (e.target.closest('[data-delete]')) return;
    window.location.href = `event.html?id=${ev.id}`;
  });

  // Bouton supprimer
  card.querySelector('[data-delete]')?.addEventListener('click', e => {
    e.stopPropagation();
    pendingDeleteEventId = ev.id;
    document.getElementById('delete-event-name').textContent = ev.name;
    openModal('modal-delete-event');
  });

  return card;
}

// ──────────────────────────────────────────
// CRÉATION D'EVENT
// ──────────────────────────────────────────
function bindEventPageListeners() {
  // Bouton ouvrir modal création
  document.getElementById('create-event-btn')?.addEventListener('click', () => {
    openModal('modal-create-event');
  });

  // Sauvegarder event
  document.getElementById('save-event-btn')?.addEventListener('click', () => {
    const name   = document.getElementById('ev-name').value.trim();
    const teams  = document.getElementById('ev-teams').value;
    const players = document.getElementById('ev-players').value;
    const date   = document.getElementById('ev-date').value;

    if (!name) { toast('Donnez un nom à l\'event.', 'error'); return; }

    createEvent({ name, teamCount: teams, playersPerTeam: players, date });
    closeModal('modal-create-event');
    document.getElementById('ev-name').value = '';
    renderEvents();
    toast('Event créé !', 'success');
  });

  // Confirmer suppression event
  document.getElementById('confirm-delete-event-btn')?.addEventListener('click', () => {
    if (!pendingDeleteEventId) return;
    deleteEvent(pendingDeleteEventId);
    pendingDeleteEventId = null;
    closeModal('modal-delete-event');
    renderEvents();
    toast('Event supprimé.', 'success');
  });

  // ── Gestion des comptes ──
  document.getElementById('create-user-btn')?.addEventListener('click', () => {
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-password').value;
    const role     = document.getElementById('new-role').value;
    const errEl    = document.getElementById('user-create-error');

    const result = createUser(username, password, role);
    if (!result.ok) {
      errEl.textContent = result.error;
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');
    document.getElementById('new-username').value = '';
    document.getElementById('new-password').value = '';
    renderUsersList();
    toast('Compte créé.', 'success');
  });

  // Ouvrir modal users → render la liste
  document.getElementById('nav-admin-link')?.addEventListener('click', () => {
    renderUsersList();
  });
}

// ──────────────────────────────────────────
// GESTION UTILISATEURS
// ──────────────────────────────────────────
function renderUsersList() {
  const container = document.getElementById('users-list');
  const users     = listUsers();

  container.innerHTML = `
    <table class="users-list-table">
      <thead>
        <tr>
          <th>Pseudo</th>
          <th>Rôle</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td>${escHtml(u.username)}</td>
            <td><span class="user-badge role-${u.role}">${u.role}</span></td>
            <td>
              ${u.id !== currentSession.id
                ? `<button class="btn-icon danger" data-uid="${u.id}">🗑</button>`
                : '<span style="color:var(--text-muted);font-size:0.75rem;">(vous)</span>'
              }
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.querySelectorAll('[data-uid]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('Supprimer ce compte ?')) return;
      deleteUser(btn.dataset.uid);
      renderUsersList();
      toast('Compte supprimé.', 'success');
    });
  });
}

// ──────────────────────────────────────────
// UTILITAIRES
// ──────────────────────────────────────────
function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
