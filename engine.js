// engine.js
// Core game logic. Reads node keywords to determine all behaviour.
// No hardcoded item names — everything is data-driven.

import NODES from './nodes.js';

const AMBER = '#ffb347';
const GREY  = '#555';

// ------------------------------------------------------------------ State
export const state = {
  currentRoom: 'coat_closet',
  inventory: [null, null],          // two slots, ordered by pickup
  nodeLocations: {},                // id -> current location id (or 'inventory')
  containerRevealed: {},            // container id -> bool
};

// ------------------------------------------------------------------ Boot
// Build initial location map from node definitions
NODES.forEach(n => {
  if (n.location) state.nodeLocations[n.id] = n.location;
});

// ------------------------------------------------------------------ Lookup helpers
export function getNode(id)      { return NODES.find(n => n.id === id) || null; }
export function allNodes()       { return NODES; }

// Resolve a player-typed name to a node (checks name + aliases)
export function resolveInput(raw) {
  const s = raw.trim().toLowerCase();
  return NODES.find(n =>
    n.name.toLowerCase() === s ||
    (n.aliases || []).some(a => a.toLowerCase() === s)
  ) || null;
}

// ------------------------------------------------------------------ Visibility
// A node is visible if:
//   - it is a direct child of the current room  (always visible)
//   - it is a child of a revealed container in the current room
//   - it is in the player's inventory
export function isVisible(node) {
  const loc = state.nodeLocations[node.id];
  if (!loc) return false;

  // In inventory
  if (state.inventory.includes(node.id)) return true;

  // Direct room child
  const room = getNode(state.currentRoom);
  if (room && (room.contains || []).includes(node.id)) return true;

  // Child of a revealed container that is itself in the room
  const parent = getNode(loc);
  if (parent && parent.keywords.includes('container')) {
    if (state.containerRevealed[parent.id]) return true;
  }

  return false;
}

// ------------------------------------------------------------------ Inventory helpers
export function heldItems() {
  // Deduplicate (heavy items fill both slots with same id)
  return state.inventory.filter((s, i) => s !== null && state.inventory.indexOf(s) === i);
}

function freeSlots() {
  return state.inventory.filter(s => s === null).length;
}

// ------------------------------------------------------------------ Dynamic descriptions
// The coats container description is generated from remaining contents
function coatsDescription(node) {
  const present = (node.contains || [])
    .filter(id => state.nodeLocations[id] === node.id)
    .map(id => getNode(id))
    .filter(Boolean);

  if (present.length === 0) {
    return [{ text: 'The rod is bare. All the coats are gone.' }];
  }

  const labels = {
    wool_overcoat:  ['a long ',        'wool overcoat',  ' in deep charcoal'],
    leather_jacket: ['a well-worn ',   'leather jacket', ' with a few scuffs on the shoulders'],
    tweed_coat:     ['a neatly folded ','tweed coat',    ' resting on the shelf above'],
  };

  const intro = present.length === 3
    ? 'A tidy row of coats hangs in close order. A few stand out: '
    : present.length === 2
      ? 'A couple of coats remain on the rod: '
      : 'One coat remains: ';

  const parts = [{ text: intro }];
  present.forEach((n, i) => {
    const [pre, name, post] = labels[n.id] || ['a ', n.name, ''];
    parts.push({ text: pre });
    parts.push({ text: name, amber: true });
    const sep = i < present.length - 2 ? ', '
              : i === present.length - 2 ? ', and '
              : '.';
    parts.push({ text: post + sep });
  });
  return parts;
}

// ------------------------------------------------------------------ Render helpers (return DOM elements)
function makeLine(parts, color) {
  const div = document.createElement('div');
  div.className = 'line';
  if (typeof parts === 'string') {
    div.textContent = parts;
    if (color) div.style.color = color;
  } else {
    parts.forEach(p => {
      const span = document.createElement('span');
      span.textContent = p.text;
      if (p.amber) span.style.color = AMBER;
      if (p.color) span.style.color = p.color;
      div.appendChild(span);
    });
  }
  return div;
}

function output(term, parts, color) {
  term.appendChild(makeLine(parts, color));
  term.scrollTop = term.scrollHeight;
}

// ------------------------------------------------------------------ Commands

export function cmdLook(term, args) {
  if (!args) {
    // Look at room
    const room = getNode(state.currentRoom);
    output(term, room.description);
    return;
  }

  // Resolve ambiguous "coat/coats" — if typing "coat" and coats container
  // is in the room, treat it as looking at coats
  const node = resolveInput(args);

  if (!node) {
    output(term, `You don't see any ${args} here.`);
    return;
  }

  // Visibility check — must be visible or in inventory
  if (!isVisible(node)) {
    // Special case: container keyword nodes in the current room are always
    // visible even before revealed (you can always look at coats)
    const room = getNode(state.currentRoom);
    const inRoom = (room.contains || []).includes(node.id);
    if (!inRoom) {
      output(term, `You don't see any ${args} here.`);
      return;
    }
  }

  // Container: reveal contents and show dynamic description
  if (node.keywords.includes('container')) {
    state.containerRevealed[node.id] = true;
    const parts = node.descriptionFn === 'coatsDescription'
      ? coatsDescription(node)
      : (Array.isArray(node.description) ? node.description : [{ text: node.description }]);
    output(term, parts);
    return;
  }

  // Regular node
  const desc = Array.isArray(node.description)
    ? node.description
    : [{ text: node.description }];
  output(term, desc);
}

export function cmdTake(term, args) {
  if (!args) { output(term, "Take what?"); return; }

  const node = resolveInput(args);
  if (!node) { output(term, `You don't see any ${args} here.`); return; }
  if (!isVisible(node)) { output(term, `You don't see any ${args} here.`); return; }
  if (!node.keywords.includes('item')) { output(term, `You can't take that.`); return; }
  if (node.keywords.includes('fixed')) { output(term, `That isn't going anywhere.`); return; }
  if (state.inventory.includes(node.id)) { output(term, `You're already holding that.`); return; }

  const needsBoth = node.keywords.includes('heavy');
  if (needsBoth) {
    if (freeSlots() < 2) { output(term, 'You need both hands free to take that.'); return; }
    state.inventory[0] = node.id;
    state.inventory[1] = node.id;
  } else {
    const slot = state.inventory.indexOf(null);
    if (slot === -1) { output(term, 'Your hands are full.'); return; }
    state.inventory[slot] = node.id;
  }

  state.nodeLocations[node.id] = 'inventory';
  output(term, node.take || `You take the ${node.name}.`);
}

export function cmdDrop(term, args) {
  if (!args) { output(term, "Drop what?"); return; }

  const node = resolveInput(args);
  if (!node) { output(term, `You aren't holding that.`); return; }
  if (!state.inventory.includes(node.id)) { output(term, `You aren't holding that.`); return; }

  if (node.keywords.includes('heavy')) {
    state.inventory[0] = null;
    state.inventory[1] = null;
  } else {
    const slot = state.inventory.indexOf(node.id);
    state.inventory[slot] = null;
  }

  // Return to current room
  state.nodeLocations[node.id] = state.currentRoom;
  output(term, node.drop || `You set down the ${node.name}.`);
}

export function cmdInventory(term) {
  const held = heldItems().map(id => getNode(id)).filter(Boolean);
  if (held.length === 0) {
    output(term, 'Your pockets are empty.');
    return;
  }
  const parts = held.length === 1
    ? [{ text: 'You are holding a ' }, { text: held[0].name, amber: true }, { text: '.' }]
    : [{ text: 'You are holding a ' }, { text: held[0].name, amber: true },
       { text: ' and a ' },            { text: held[1].name, amber: true }, { text: '.' }];
  output(term, parts);
}

export function cmdExits(term) {
  const room = getNode(state.currentRoom);
  const exits = room.exits || [];
  if (exits.length === 0) {
    output(term, 'There are no obvious exits.', GREY);
    return;
  }
  exits.forEach(e => {
    output(term, `${e.direction.padEnd(6)} —  ${e.description}`, GREY);
  });
}

export function cmdHelp(term) {
  output(term, [
    { text: 'basic commands:\n' },
    { text: 'clear          clears screen\n' },
    { text: 'exits          list exits from current room\n' },
    { text: 'look           look at the room\n' },
    { text: 'look [thing]   examine something in the room\n' },
    { text: 'take [thing]   pick up an item\n' },
    { text: 'drop [thing]   drop a held item\n' },
    { text: 'inv            check your inventory' },
  ].map(p => ({ text: p.text, color: GREY })), GREY);
}
