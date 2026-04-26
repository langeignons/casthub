/**
 * event.js — Contrôleur de la page event.html
 * Gestion des équipes, joueurs, classement, scores
 * CastHub / Minecraft Event Manager
 */

import { isAdmin, isEditor } from './auth.js';
import {
  getEvent,
  getRankedTeams,
  addTeam, updateTeam, deleteTeam,
  addPlayer, updatePlayer, deletePlayer,
} from './data.js';
import { initLogin, initNavbar, openModal, closeModal, toast, formatDate, initials } from './ui.js';

// ──────────────────────────────────────────
// État local
// ──────────────────────────────────────────
let currentSession = null;
let eventId        = null;

// Contexte modal équipe
let editingTeamId  = null;  // null = création, sinon id

// Contexte modal joueur
let editingTeamIdForPlayer  = null;
let editingPlayerId         = null;  // null = création

// Contexte fiche joueur
let detailTeamId   = null;
let detailPlayerId = null;

// Contexte score
let scoreTeamId    = null;

// Contexte suppression équipe
let deleteTeamId   = null;

// Vue courante
let currentView    = 'grid';

// ──────────────────────────────────────────
// BOOTSTRAP
// ──────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
eventId = params.get('id');

if (!eventId) {
  window.location.href = 'index.html';
}

initLogin(session => {
  currentSession = session;
  initNavbar(session);
  loadEventPage();
  bindListeners();
});

// ──────────────────────────────────────────
// CHARGEMENT DE LA PAGE
// ──────────────────────────────────────────
function loadEventPage() {
  const event = getEvent(eventId);
  if (!event) { window.location.href = 'index.html'; return; }

  // Hero
  document.getElementById('breadcrumb-event-name').textContent = event.name;
  document.getElementById('hero-name').textContent  = event.name;
  document.getElementById('hero-teams').textContent = event.teams.length + ' / ' + event.teamCount;
  document.getElementById('hero-players').textContent = event.playersPerTeam;
  const totalPlayers = event.teams.reduce((s, t) => s + t.players.length, 0);
  document.getElementById('hero-total').textContent  = totalPlayers;
  document.title = `CastHub — ${event.name}`;

  if (event.date) {
    document.getElementById('hero-date').textContent = formatDate(event.date);
  }

  renderCurrentView();
}

function renderCurrentView() {
  if (currentView === 'grid') renderGrid();
  else renderRanking();
}

// ──────────────────────────────────────────
// VUE GRILLE (équipes + joueurs)
// ──────────────────────────────────────────
function renderGrid() {
  const grid   = document.getElementById('view-grid');
  const noTeam = document.getElementById('no-teams');
  const ranked = getRankedTeams(eventId);

  grid.innerHTML = '';

  if (!ranked.length) {
    noTeam.classList.remove('hidden');
    return;
  }
  noTeam.classList.add('hidden');

  ranked.forEach((team, index) => {
    grid.appendChild(buildTeamCard(team, index + 1));
  });
}

function buildTeamCard(team, rank) {
  const admin  = isAdmin(currentSession);
  const editor = isEditor(currentSession);
  const event  = getEvent(eventId);
  const canAddPlayer = editor && team.players.length < event.playersPerTeam;

  const card = document.createElement('div');
  card.className = 'team-card';
  card.style.animationDelay = `${(rank - 1) * 50}ms`;

  const rankClass = rank <= 3 ? `rank-${rank}` : '';

  card.innerHTML = `
    <div class="team-card-header">
      <div class="team-rank-badge ${rankClass}">#${rank}</div>
      <div class="team-header-info">
        <div class="team-name">${escHtml(team.name)}</div>
        <div class="team-score">Score : ${team.score} pts</div>
      </div>
      ${editor ? `
        <div class="team-card-actions">
          <button class="btn-icon" title="Modifier score" data-score="${team.id}">📈</button>
          <button class="btn-icon" title="Modifier équipe" data-edit-team="${team.id}">✏️</button>
          ${admin ? `<button class="btn-icon danger" title="Supprimer" data-delete-team="${team.id}">🗑</button>` : ''}
        </div>` : ''}
    </div>
    <div class="team-desc ${team.description ? '' : 'placeholder'}" data-desc-team="${team.id}">
      ${team.description ? escHtml(team.description) : 'Aucune description…'}
    </div>
    <div class="team-players">
      <div class="players-header">
        <span class="players-label">Joueurs (${team.players.length}/${event.playersPerTeam})</span>
        ${canAddPlayer ? `<button class="btn-icon" data-add-player="${team.id}">+ Joueur</button>` : ''}
      </div>
      <div class="players-list">
        ${team.players.map(p => buildPlayerChip(p, team.id, editor)).join('')}
      </div>
    </div>
  `;

  // Actions équipe
  card.querySelector(`[data-edit-team]`)?.addEventListener('click', () => openEditTeamModal(team));
  card.querySelector(`[data-delete-team]`)?.addEventListener('click', () => openDeleteTeamModal(team));
  card.querySelector(`[data-score]`)?.addEventListener('click', () => openScoreModal(team));
  card.querySelector(`[data-add-player]`)?.addEventListener('click', () => openAddPlayerModal(team.id));

  // Actions joueurs
  card.querySelectorAll('[data-view-player]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openPlayerDetail(team, btn.dataset.viewPlayer);
    });
  });
  card.querySelectorAll('[data-edit-player]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const player = team.players.find(p => p.id === btn.dataset.editPlayer);
      openEditPlayerModal(team.id, player);
    });
  });
  card.querySelectorAll('[data-delete-player]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm('Supprimer ce joueur ?')) return;
      deletePlayer(eventId, team.id, btn.dataset.deletePlayer);
      refresh();
      toast('Joueur supprimé.', 'success');
    });
  });

  return card;
}

function buildPlayerChip(player, teamId, editor) {
  return `
    <div class="player-chip" data-view-player="${player.id}">
      <div class="player-avatar">${initials(player.name)}</div>
      <span class="player-name">${escHtml(player.name)}</span>
      ${editor ? `
        <div class="player-chip-actions">
          <button class="btn-icon" data-edit-player="${player.id}">✏️</button>
          <button class="btn-icon danger" data-delete-player="${player.id}">🗑</button>
        </div>` : ''}
    </div>
  `;
}

// ──────────────────────────────────────────
// VUE CLASSEMENT
// ──────────────────────────────────────────
function renderRanking() {
  const ranked = getRankedTeams(eventId);
  const tbody  = document.getElementById('ranking-tbody');
  const editor = isEditor(currentSession);

  tbody.innerHTML = '';

  ranked.forEach((team, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? `r${rank}` : '';
    const medals = ['🥇','🥈','🥉'];
    const medalOrNum = rank <= 3 ? medals[rank-1] : rank;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank-cell ${rankClass}">${medalOrNum}</td>
      <td style="font-weight:600;">${escHtml(team.name)}</td>
      <td class="score-cell">${team.score} pts</td>
      ${editor ? `<td><button class="btn-icon" data-score="${team.id}">✏️ Score</button></td>` : ''}
    `;
    tr.querySelector('[data-score]')?.addEventListener('click', () => openScoreModal(team));
    tbody.appendChild(tr);
  });
}

// ──────────────────────────────────────────
// MODALS — ÉQUIPES
// ──────────────────────────────────────────
function openAddTeamModal() {
  editingTeamId = null;
  document.getElementById('modal-team-title').textContent = 'NOUVELLE ÉQUIPE';
  document.getElementById('team-name-input').value  = '';
  document.getElementById('team-desc-input').value  = '';
  document.getElementById('team-score-input').value = '0';
  openModal('modal-team');
}

function openEditTeamModal(team) {
  editingTeamId = team.id;
  document.getElementById('modal-team-title').textContent = 'MODIFIER L\'ÉQUIPE';
  document.getElementById('team-name-input').value  = team.name;
  document.getElementById('team-desc-input').value  = team.description;
  document.getElementById('team-score-input').value = team.score;
  openModal('modal-team');
}

function openDeleteTeamModal(team) {
  deleteTeamId = team.id;
  document.getElementById('delete-team-name').textContent = team.name;
  openModal('modal-delete-team');
}

function saveTeam() {
  const name  = document.getElementById('team-name-input').value.trim();
  const desc  = document.getElementById('team-desc-input').value;
  const score = document.getElementById('team-score-input').value;

  if (!name) { toast('Nom d\'équipe requis.', 'error'); return; }

  if (editingTeamId) {
    updateTeam(eventId, editingTeamId, { name, description: desc, score });
    toast('Équipe mise à jour.', 'success');
  } else {
    addTeam(eventId, { name, description: desc, score });
    toast('Équipe ajoutée.', 'success');
  }
  closeModal('modal-team');
  refresh();
}

// ──────────────────────────────────────────
// MODALS — JOUEURS
// ──────────────────────────────────────────
function openAddPlayerModal(teamId) {
  editingTeamIdForPlayer = teamId;
  editingPlayerId        = null;
  document.getElementById('modal-player-title').textContent = 'NOUVEAU JOUEUR';
  document.getElementById('player-name-input').value = '';
  document.getElementById('player-desc-input').value = '';
  openModal('modal-player');
}

function openEditPlayerModal(teamId, player) {
  editingTeamIdForPlayer = teamId;
  editingPlayerId        = player.id;
  document.getElementById('modal-player-title').textContent = 'MODIFIER LE JOUEUR';
  document.getElementById('player-name-input').value = player.name;
  document.getElementById('player-desc-input').value = player.description;
  openModal('modal-player');
}

function savePlayer() {
  const name = document.getElementById('player-name-input').value.trim();
  const desc = document.getElementById('player-desc-input').value;

  if (!name) { toast('Pseudo requis.', 'error'); return; }

  if (editingPlayerId) {
    updatePlayer(eventId, editingTeamIdForPlayer, editingPlayerId, { name, description: desc });
    toast('Joueur mis à jour.', 'success');
  } else {
    addPlayer(eventId, editingTeamIdForPlayer, { name, description: desc });
    toast('Joueur ajouté.', 'success');
  }
  closeModal('modal-player');
  refresh();
}

// ──────────────────────────────────────────
// FICHE JOUEUR
// ──────────────────────────────────────────
function openPlayerDetail(team, playerId) {
  const player = team.players.find(p => p.id === playerId);
  if (!player) return;

  detailTeamId   = team.id;
  detailPlayerId = playerId;

  document.getElementById('player-detail-name').textContent = player.name;
  document.getElementById('player-detail-avatar').textContent = initials(player.name);
  document.getElementById('player-detail-team').textContent = `Équipe : ${team.name}`;

  const descEl = document.getElementById('player-detail-desc');
  descEl.textContent = player.description || 'Aucune note.';
  descEl.className   = 'player-detail-desc' + (player.description ? '' : ' empty');

  openModal('modal-player-detail');
}

// ──────────────────────────────────────────
// MODAL SCORE
// ──────────────────────────────────────────
function openScoreModal(team) {
  scoreTeamId = team.id;
  document.getElementById('modal-score-team-name').textContent = team.name;
  document.getElementById('score-input').value = team.score;
  openModal('modal-score');
}

function saveScore() {
  const score = parseInt(document.getElementById('score-input').value) || 0;
  updateTeam(eventId, scoreTeamId, { score });
  closeModal('modal-score');
  refresh();
  toast('Score mis à jour.', 'success');
}

// ──────────────────────────────────────────
// REFRESH
// ──────────────────────────────────────────
function refresh() {
  loadEventPage();
}

// ──────────────────────────────────────────
// BIND LISTENERS
// ──────────────────────────────────────────
function bindListeners() {
  // Ajouter équipe
  document.getElementById('add-team-btn')?.addEventListener('click', openAddTeamModal);
  document.getElementById('save-team-btn')?.addEventListener('click', saveTeam);

  // Joueur
  document.getElementById('save-player-btn')?.addEventListener('click', savePlayer);

  // Depuis fiche joueur → édition
  document.getElementById('player-detail-edit-btn')?.addEventListener('click', () => {
    const event = getEvent(eventId);
    const team  = event.teams.find(t => t.id === detailTeamId);
    const player = team?.players.find(p => p.id === detailPlayerId);
    if (!player) return;
    closeModal('modal-player-detail');
    openEditPlayerModal(detailTeamId, player);
  });

  // Score
  document.getElementById('save-score-btn')?.addEventListener('click', saveScore);

  // Supprimer équipe
  document.getElementById('confirm-delete-team-btn')?.addEventListener('click', () => {
    if (!deleteTeamId) return;
    deleteTeam(eventId, deleteTeamId);
    deleteTeamId = null;
    closeModal('modal-delete-team');
    refresh();
    toast('Équipe supprimée.', 'success');
  });

  // Vue toggle
  document.getElementById('view-grid-btn')?.addEventListener('click', () => switchView('grid'));
  document.getElementById('view-ranking-btn')?.addEventListener('click', () => switchView('ranking'));
}

function switchView(view) {
  currentView = view;

  document.getElementById('view-grid').classList.toggle('hidden', view !== 'grid');
  document.getElementById('view-ranking').classList.toggle('hidden', view !== 'ranking');

  document.getElementById('view-grid-btn').classList.toggle('active', view === 'grid');
  document.getElementById('view-ranking-btn').classList.toggle('active', view === 'ranking');

  renderCurrentView();
}

// ──────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────
function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
