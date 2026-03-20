// commands.js
// All command definitions.
//
// The world is a graph of nodes connected by exits.
// Containment (a node's `contains` array) is a separate hierarchy —
// it defines scope (what you can see/interact with), not traversal.
// Being inside a node never blocks its exits unless a keyword says so.
//
// Each command object:
//   trigger:      string | string[]  — what the player types
//   args:         bool               — accepts an argument
//   help:         string | null      — shown in help listing (null = hidden)
//   examineIf:    (node) => bool     — whether this command appears in examine
//   examineHint:  (node) => string   — hint text shown alongside in examine
//   fn:           (term, args) => void
//
// To add a command: add one object to COMMANDS. Nothing else changes.
// To add examine awareness: add examineIf (and optionally examineHint).

import { state, getNode, resolveInput, isVisible, heldItems } from './engine.js';

const GREY  = '#555';
const AMBER = '#ffb347';

// ------------------------------------------------------------------ Markup parser
// Parses a description string containing {node_id} tags into a parts array.
// Each {node_id} is resolved to its node name and rendered amber.
// Unknown IDs are flagged with a console warning and rendered plainly.
//
// Usage in nodes.js:
//   description: 'A large closet. Some {coats} hang here. A {mirror} is on the wall.'
//
// Rules:
//   - {id} must match a node id in nodes.js exactly
//   - Tags are replaced with the node's display name, colored amber
//   - Unresolved tags warn at parse time and render as plain text
export function parseMarkup(str) {
  const parts = [];
  const regex = /\{([^}]+)\}/g;
  let last = 0;
  let match;
  while ((match = regex.exec(str)) !== null) {
    if (match.index > last) {
      parts.push({ text: str.slice(last, match.index) });
    }
    const id = match[1];
    const node = getNode(id);
    if (!node) {
      console.warn(`MUDstone markup warning: {${id}} does not match any node id.`);
      parts.push({ text: match[0] }); // render the raw tag so it's visible
    } else {
      parts.push({ text: node.name, amber: true });
    }
    last = regex.lastIndex;
  }
  if (last < str.length) parts.push({ text: str.slice(last) });
  return parts;
}

// ------------------------------------------------------------------ Description resolver
// Resolves a node's description to a parts array for output().
// Strings are parsed for {id} markup. Arrays are passed through as-is.
// Add dynamic description cases (fn: prefix) here as the world grows.
export function resolveDescription(node) {
  const desc = node.description;
  if (Array.isArray(desc)) return desc;
  if (typeof desc === 'string') return parseMarkup(desc);
  // Future: if (typeof desc === 'function') return desc(node);
  return [{ text: String(desc) }];
}

// ------------------------------------------------------------------ Output
// Renders a parts array or plain string to the terminal.
// color only applies when parts is a plain string.
export function output(term, parts, color) {
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
      else if (p.color) span.style.color = p.color;
      div.appendChild(span);
    });
  }
  term.appendChild(div);
  term.scrollTop = term.scrollHeight;
}

// ------------------------------------------------------------------ Traversal
// The core movement function. direction is any exit label — compass, name, anything.
// Keywords on the current room's exit can block traversal (future use).
function go(term, direction) {
  if (!direction) { output(term, 'Go where?'); return; }

  const room = getNode(state.currentRoom);
  const exit = (room.exits || []).find(e =>
    e.direction.toLowerCase() === direction.toLowerCase()
  );

  if (!exit) { output(term, `You can't go ${direction} from here.`); return; }

  // Future: check exit keywords here for locked, blocked, consuming, etc.

  state.currentRoom = exit.destination;
  const newRoom = getNode(state.currentRoom);
  if (!newRoom) {
    output(term, `That exit leads nowhere. (missing node: ${exit.destination})`);
    return;
  }

  // Clear container reveal state on room change
  // (revealed containers are scoped to the visit, not permanent)
  Object.keys(state.containerRevealed).forEach(k => {
    delete state.containerRevealed[k];
  });

  output(term, resolveDescription(newRoom));
}

// ------------------------------------------------------------------ Commands
const COMMANDS = [

  // ---------------------------------------------------------------- Meta
  {
    trigger: 'help',
    args: false,
    help: null,
    fn(term) {
      const listed = COMMANDS.filter(c => c.help);
      const lines = ['basic commands:', ...listed.map(c => {
        const trigger = Array.isArray(c.trigger) ? c.trigger[0] : c.trigger;
        return trigger.padEnd(16) + c.help;
      })].join('\n');
      output(term, lines, GREY);
    },
  },

  {
    trigger: 'clear',
    args: false,
    help: null, // handled in index.html before dispatch
    fn() {},
  },

  // ---------------------------------------------------------------- Traversal
  // `go` is the universal traversal command — accepts any exit label.
  // Compass directions and other shorthands are aliases that call it.
  {
    trigger: 'go',
    args: true,
    help: 'go [exit]      travel through any named exit',
    fn(term, args) { go(term, args); },
  },

  // Compass aliases — these are just common exit label shorthands.
  // Add any other direction aliases here (in, out, fore, aft, etc.)
  { trigger: ['north', 'n'], args: false, help: null, fn: (term) => go(term, 'north') },
  { trigger: ['south', 's'], args: false, help: null, fn: (term) => go(term, 'south') },
  { trigger: ['east',  'e'], args: false, help: null, fn: (term) => go(term, 'east')  },
  { trigger: ['west',  'w'], args: false, help: null, fn: (term) => go(term, 'west')  },
  { trigger: ['up',    'u'], args: false, help: null, fn: (term) => go(term, 'up')    },
  { trigger: ['down',  'd'], args: false, help: null, fn: (term) => go(term, 'down')  },
  { trigger: ['in'],         args: false, help: null, fn: (term) => go(term, 'in')    },
  { trigger: ['out'],        args: false, help: null, fn: (term) => go(term, 'out')   },

  {
    trigger: ['exits', 'exit'],
    args: false,
    help: 'exits          list exits from current node',
    fn(term) {
      const room = getNode(state.currentRoom);
      const exits = room.exits || [];
      if (exits.length === 0) { output(term, 'There are no obvious exits.', GREY); return; }
      exits.forEach(e => output(term, `${e.direction.padEnd(10)} —  ${e.description}`, GREY));
    },
  },

  // ---------------------------------------------------------------- Looking
  {
    trigger: 'look',
    args: true,
    help: 'look           look at current node, or look [thing]',
    examineIf: () => true,
    examineHint: () => 'get a description',
    fn(term, args) {
      if (!args) {
        output(term, resolveDescription(getNode(state.currentRoom)));
        return;
      }
      const node = resolveInput(args);
      if (!node) { output(term, `You don't see any ${args} here.`); return; }
      const room = getNode(state.currentRoom);
      const inRoom = (room.contains || []).includes(node.id);
      if (!isVisible(node) && !inRoom) { output(term, `You don't see any ${args} here.`); return; }
      if (node.keywords.includes('container')) state.containerRevealed[node.id] = true;
      output(term, resolveDescription(node));
    },
  },

  {
    trigger: ['examine', 'x'],
    args: true,
    help: 'examine [thing] list available actions for a thing',
    fn(term, args) {
      if (!args) { output(term, 'Examine what?'); return; }
      const node = resolveInput(args);
      if (!node) { output(term, `You don't see any ${args} here.`); return; }
      const room = getNode(state.currentRoom);
      const inRoom = (room.contains || []).includes(node.id);
      if (!isVisible(node) && !inRoom) { output(term, `You don't see any ${args} here.`); return; }

      const actions = COMMANDS
        .filter(c => c.examineIf && c.examineIf(node))
        .map(c => {
          const trigger = Array.isArray(c.trigger) ? c.trigger[0] : c.trigger;
          const hint = c.examineHint ? c.examineHint(node) : null;
          return hint
            ? `${(trigger + ' ' + node.name).padEnd(28)} — ${hint}`
            : `${trigger} ${node.name}`;
        });

      if (actions.length === 0) {
        output(term, `Nothing obvious to do with the ${node.name}.`, GREY);
      } else {
        output(term, actions.join('\n'), GREY);
      }
    },
  },

  // ---------------------------------------------------------------- Items
  {
    trigger: 'take',
    args: true,
    help: 'take [thing]   pick up an item',
    examineIf(node) {
      if (!node.keywords.includes('item')) return false;
      if (node.keywords.includes('fixed')) return false;
      if (state.inventory.includes(node.id)) return false;
      const free = state.inventory.filter(s => s === null).length;
      return node.keywords.includes('heavy') ? free >= 2 : free >= 1;
    },
    examineHint: (node) => node.keywords.includes('heavy') ? 'needs both hands' : 'pick it up',
    fn(term, args) {
      if (!args) { output(term, 'Take what?'); return; }
      const node = resolveInput(args);
      if (!node || !isVisible(node)) { output(term, `You don't see any ${args} here.`); return; }
      if (!node.keywords.includes('item'))   { output(term, `You can't take that.`); return; }
      if (node.keywords.includes('fixed'))   { output(term, `That isn't going anywhere.`); return; }
      if (state.inventory.includes(node.id)) { output(term, `You're already holding that.`); return; }
      const free = state.inventory.filter(s => s === null).length;
      if (node.keywords.includes('heavy')) {
        if (free < 2) { output(term, 'You need both hands free to take that.'); return; }
        state.inventory[0] = node.id;
        state.inventory[1] = node.id;
      } else {
        const slot = state.inventory.indexOf(null);
        if (slot === -1) { output(term, 'Your hands are full.'); return; }
        state.inventory[slot] = node.id;
      }
      state.nodeLocations[node.id] = 'inventory';
      output(term, node.take || `You take the ${node.name}.`);
    },
  },

  {
    trigger: 'drop',
    args: true,
    help: 'drop [thing]   drop a held item',
    examineIf: (node) => state.inventory.includes(node.id),
    examineHint: () => 'put it down',
    fn(term, args) {
      if (!args) { output(term, 'Drop what?'); return; }
      const node = resolveInput(args);
      if (!node || !state.inventory.includes(node.id)) { output(term, `You aren't holding that.`); return; }
      if (node.keywords.includes('heavy')) {
        state.inventory[0] = null;
        state.inventory[1] = null;
      } else {
        state.inventory[state.inventory.indexOf(node.id)] = null;
      }
      state.nodeLocations[node.id] = state.currentRoom;
      output(term, node.drop || `You set down the ${node.name}.`);
    },
  },

  {
    trigger: ['inv', 'inventory'],
    args: false,
    help: 'inv            check your inventory',
    fn(term) {
      const held = heldItems().map(id => getNode(id)).filter(Boolean);
      if (held.length === 0) { output(term, 'Your pockets are empty.'); return; }
      const parts = held.length === 1
        ? [{ text: 'You are holding a ' }, { text: held[0].name, amber: true }, { text: '.' }]
        : [{ text: 'You are holding a ' }, { text: held[0].name, amber: true },
           { text: ' and a ' },            { text: held[1].name, amber: true }, { text: '.' }];
      output(term, parts);
    },
  },

  // ---------------------------------------------------------------- Add new commands above this line

];

export default COMMANDS;
