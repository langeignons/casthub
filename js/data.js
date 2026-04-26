/**
 * data.js — Couche données : events, équipes, joueurs
 * Utilise Firebase Firestore comme base de données.
 * CastHub / Minecraft Event Manager
 */

import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ──────────────────────────────────────────
// Utilitaires
// ──────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Retourne l'instance Firestore (initialisée dans index.html / event.html) */
function getDb() {
  return window.db;
}

/** Récupère un document event complet depuis Firestore */
async function fetchEventDoc(eventId) {
  const snap = await getDoc(doc(getDb(), "events", eventId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Sauvegarde le tableau teams dans un document event */
async function saveTeams(eventId, teams) {
  await updateDoc(doc(getDb(), "events", eventId), { teams });
}

// ══════════════════════════════════════════
// EVENTS
// ══════════════════════════════════════════

/**
 * Retourne tous les events.
 * @returns {Promise<Array>}
 */
export async function getEvents() {
  const snap = await getDocs(collection(getDb(), "events"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Retourne un event par id.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getEvent(id) {
  return await fetchEventDoc(id);
}

/**
 * Crée un nouvel event.
 * @param {{ name: string, teamCount: number, playersPerTeam: number, date?: string }} data
 * @returns {Promise<object>} l'event créé
 */
export async function createEvent({ name, teamCount, playersPerTeam, date }) {
  const data = {
    name: name.trim(),
    teamCount: parseInt(teamCount) || 8,
    playersPerTeam: parseInt(playersPerTeam) || 4,
    date: date || null,
    teams: [],
    createdAt: Date.now(),
  };
  const ref = await addDoc(collection(getDb(), "events"), data);
  return { id: ref.id, ...data };
}

/**
 * Supprime un event par id.
 * @param {string} id
 */
export async function deleteEvent(id) {
  await deleteDoc(doc(getDb(), "events", id));
}

// ══════════════════════════════════════════
// ÉQUIPES
// ══════════════════════════════════════════

/**
 * Ajoute une équipe à un event.
 * @param {string} eventId
 * @param {{ name: string, description?: string, score?: number }} data
 * @returns {Promise<object|null>} l'équipe créée
 */
export async function addTeam(eventId, { name, description, score }) {
  const event = await fetchEventDoc(eventId);
  if (!event) return null;

  const team = {
    id: uid(),
    name: name.trim(),
    description: description?.trim() || '',
    score: parseInt(score) || 0,
    players: [],
    createdAt: Date.now(),
  };

  const teams = [...(event.teams || []), team];
  await saveTeams(eventId, teams);
  return team;
}

/**
 * Met à jour les infos d'une équipe (nom, description, score).
 * @param {string} eventId
 * @param {string} teamId
 * @param {object} fields
 */
export async function updateTeam(eventId, teamId, fields) {
  const event = await fetchEventDoc(eventId);
  if (!event) return null;

  const teams = (event.teams || []).map(t => {
    if (t.id !== teamId) return t;
    return {
      ...t,
      ...(fields.name        !== undefined && { name:        fields.name.trim() }),
      ...(fields.description !== undefined && { description: fields.description.trim() }),
      ...(fields.score       !== undefined && { score:       parseInt(fields.score) || 0 }),
    };
  });

  await saveTeams(eventId, teams);
}

/**
 * Supprime une équipe.
 * @param {string} eventId
 * @param {string} teamId
 */
export async function deleteTeam(eventId, teamId) {
  const event = await fetchEventDoc(eventId);
  if (!event) return;
  await saveTeams(eventId, (event.teams || []).filter(t => t.id !== teamId));
}

/**
 * Retourne les équipes d'un event triées par score décroissant.
 * @param {string} eventId
 * @returns {Promise<Array>}
 */
export async function getRankedTeams(eventId) {
  const event = await fetchEventDoc(eventId);
  if (!event) return [];
  return [...(event.teams || [])].sort((a, b) => b.score - a.score);
}

// ══════════════════════════════════════════
// JOUEURS
// ══════════════════════════════════════════

/**
 * Ajoute un joueur à une équipe.
 * @param {string} eventId
 * @param {string} teamId
 * @param {{ name: string, description?: string }} data
 * @returns {Promise<object|null>} le joueur créé
 */
export async function addPlayer(eventId, teamId, { name, description }) {
  const event = await fetchEventDoc(eventId);
  if (!event) return null;

  const player = {
    id: uid(),
    name: name.trim(),
    description: description?.trim() || '',
    createdAt: Date.now(),
  };

  const teams = (event.teams || []).map(t => {
    if (t.id !== teamId) return t;
    return { ...t, players: [...(t.players || []), player] };
  });

  await saveTeams(eventId, teams);
  return player;
}

/**
 * Met à jour un joueur (name, description).
 * @param {string} eventId
 * @param {string} teamId
 * @param {string} playerId
 * @param {object} fields
 */
export async function updatePlayer(eventId, teamId, playerId, fields) {
  const event = await fetchEventDoc(eventId);
  if (!event) return null;

  const teams = (event.teams || []).map(t => {
    if (t.id !== teamId) return t;
    return {
      ...t,
      players: (t.players || []).map(p => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          ...(fields.name        !== undefined && { name:        fields.name.trim() }),
          ...(fields.description !== undefined && { description: fields.description.trim() }),
        };
      }),
    };
  });

  await saveTeams(eventId, teams);
}

/**
 * Supprime un joueur.
 * @param {string} eventId
 * @param {string} teamId
 * @param {string} playerId
 */
export async function deletePlayer(eventId, teamId, playerId) {
  const event = await fetchEventDoc(eventId);
  if (!event) return;

  const teams = (event.teams || []).map(t => {
    if (t.id !== teamId) return t;
    return { ...t, players: (t.players || []).filter(p => p.id !== playerId) };
  });

  await saveTeams(eventId, teams);
}
