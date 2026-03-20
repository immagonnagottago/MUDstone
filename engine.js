// engine.js
// Core state and helper functions.
// No command logic lives here — that's all in commands.js.
// No world data lives here — that's all in nodes.js.
//
// World model:
//   Everything is a node. Rooms, items, NPCs, containers — all nodes.
//   Nodes connect to other nodes via exits (labelled edges).
//   Exit labels are arbitrary strings: 'north', 'door', 'alice', 'dream'.
//   The player occupies exactly one node at a time (state.currentRoom).
//   Interacting with contents of a node never blocks its exits by default.
//   Exit gating is opt-in via keywords (see canLeave).
//
// To add a new keyword behaviour:
//   1. Add the keyword to keywords.js.
//   2. Add checks for it in the relevant command in commands.js,
//      or in canLeave() below if it gates movement.

import NODES from './nodes.js';

// ------------------------------------------------------------------ State
export const state = {
  currentRoom:       'start_room', // must match a room node id in nodes.js
  inventory:         [null, null], // two slots, ordered by pickup
  nodeLocations:     {},           // id -> current location id (or 'inventory')
  containerRevealed: {},           // container id -> bool
};

// Build initial location map from node definitions
NODES.forEach(n => {
  if (n.location) state.nodeLocations[n.id] = n.location;
});

// ------------------------------------------------------------------ Lookup helpers
export function getNode(id) { return NODES.find(n => n.id === id) || null; }
export function allNodes()  { return NODES; }

// Resolve a player-typed string to a node (checks name + aliases)
export function resolveInput(raw) {
  const s = raw.trim().toLowerCase();
  return NODES.find(n =>
    n.name.toLowerCase() === s ||
    (n.aliases || []).some(a => a.toLowerCase() === s)
  ) || null;
}

// ------------------------------------------------------------------ Visibility
// A node is visible if:
//   - it is in the player's inventory
//   - it is a direct child of the current node (always visible)
//   - it is a child of a revealed container in the current node
export function isVisible(node) {
  if (state.inventory.includes(node.id)) return true;

  const current = getNode(state.currentRoom);
  if (current && (current.contains || []).includes(node.id)) return true;

  const loc    = state.nodeLocations[node.id];
  const parent = loc ? getNode(loc) : null;
  if (parent && parent.keywords.includes('container') && state.containerRevealed[parent.id]) {
    return true;
  }

  return false;
}

// ------------------------------------------------------------------ Inventory helpers
export function heldItems() {
  // Deduplicate (heavy items fill both slots with the same id)
  return state.inventory.filter((s, i) => s !== null && state.inventory.indexOf(s) === i);
}

// ------------------------------------------------------------------ Exit gating
// Returns a block message string if the player cannot leave via this label,
// or null if movement is allowed.
// Add keyword-based movement restrictions here.
//
// Example pattern:
//   if (node.keywords.includes('locked') && label === 'north') return 'The door is locked.';
export function canLeave(node, label) {

  // --- Add exit-gating keyword checks below ---

  return null; // no block by default
}
