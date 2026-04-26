/**
 * data.js — Couche données : events, équipes, joueurs
 * Utilise localStorage comme base de données simulée.
 * CastHub / Minecraft Event Manager
 */

const STORAGE_EVENTS = 'casthub_events';

// ──────────────────────────────────────────
// Utilitaires
// ──────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// récupérer les events
export async function getEvents() {
  const snap = await getDocs(collection(window.db, "events"));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// créer un event
export async function createEvent(data) {
  const docRef = await addDoc(collection(window.db, "events"), data);
  return { id: docRef.id, ...data };
}

function saveEvents(events) {
  localStorage.setItem(STORAGE_EVENTS, JSON.stringify(events));
}

// ══════════════════════════════════════════
// EVENTS
// ══════════════════════════════════════════

/** Retourne tous les events */
export function getEvents() {
  return loadEvents();
}

/** Retourne un event par id */
export function getEvent(id) {
  return loadEvents().find(e => e.id === id) || null;
}

/**
 * Crée un nouvel event.
 * @param {{ name: string, teamCount: number, playersPerTeam: number, date?: string }} data
 * @returns {object} l'event créé
 */
export function createEvent({ name, teamCount, playersPerTeam, date }) {
  const events = loadEvents();
  const event = {
    id: uid(),
    name: name.trim(),
    teamCount: parseInt(teamCount) || 8,
    playersPerTeam: parseInt(playersPerTeam) || 4,
    date: date || null,
    teams: [],
    createdAt: Date.now(),
  };
  events.push(event);
  saveEvents(events);
  return event;
}

/** Supprime un event par id */
export function deleteEvent(id) {
  const events = loadEvents().filter(e => e.id !== id);
  saveEvents(events);
}

// ══════════════════════════════════════════
// ÉQUIPES
// ══════════════════════════════════════════

/**
 * Ajoute une équipe à un event.
 * @param {string} eventId
 * @param {{ name: string, description?: string, score?: number }} data
 */
export function addTeam(eventId, { name, description, score }) {
  const events = loadEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return null;

  const team = {
    id: uid(),
    name: name.trim(),
    description: description?.trim() || '',
    score: parseInt(score) || 0,
    players: [],
    createdAt: Date.now(),
  };
  event.teams.push(team);
  saveEvents(events);
  return team;
}

/**
 * Met à jour les infos d'une équipe (nom, description, score).
 */
export function updateTeam(eventId, teamId, fields) {
  const events = loadEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return null;
  const team = event.teams.find(t => t.id === teamId);
  if (!team) return null;

  if (fields.name        !== undefined) team.name        = fields.name.trim();
  if (fields.description !== undefined) team.description = fields.description.trim();
  if (fields.score       !== undefined) team.score       = parseInt(fields.score) || 0;

  saveEvents(events);
  return team;
}

/** Supprime une équipe */
export function deleteTeam(eventId, teamId) {
  const events = loadEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return;
  event.teams = event.teams.filter(t => t.id !== teamId);
  saveEvents(events);
}

/**
 * Retourne les équipes d'un event triées par score décroissant.
 */
export function getRankedTeams(eventId) {
  const event = getEvent(eventId);
  if (!event) return [];
  return [...event.teams].sort((a, b) => b.score - a.score);
}

// ══════════════════════════════════════════
// JOUEURS
// ══════════════════════════════════════════

/**
 * Ajoute un joueur à une équipe.
 * @param {string} eventId
 * @param {string} teamId
 * @param {{ name: string, description?: string }} data
 */
export function addPlayer(eventId, teamId, { name, description }) {
  const events = loadEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return null;
  const team = event.teams.find(t => t.id === teamId);
  if (!team) return null;

  const player = {
    id: uid(),
    name: name.trim(),
    description: description?.trim() || '',
    createdAt: Date.now(),
  };
  team.players.push(player);
  saveEvents(events);
  return player;
}

/**
 * Met à jour un joueur (name, description).
 */
export function updatePlayer(eventId, teamId, playerId, fields) {
  const events = loadEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return null;
  const team = event.teams.find(t => t.id === teamId);
  if (!team) return null;
  const player = team.players.find(p => p.id === playerId);
  if (!player) return null;

  if (fields.name        !== undefined) player.name        = fields.name.trim();
  if (fields.description !== undefined) player.description = fields.description.trim();

  saveEvents(events);
  return player;
}

/** Supprime un joueur */
export function deletePlayer(eventId, teamId, playerId) {
  const events = loadEvents();
  const event = events.find(e => e.id === eventId);
  if (!event) return;
  const team = event.teams.find(t => t.id === teamId);
  if (!team) return;
  team.players = team.players.filter(p => p.id !== playerId);
  saveEvents(events);
}
