// nodes.js
// All world data. Every interactable thing is a node.
// Nodes reference each other by id.
//
// Node shape:
// {
//   id:          'unique_snake_case_id',
//   name:        'display name',
//   aliases:     ['alternate', 'names'],        // optional
//   keywords:    ['keyword', ...],              // drives all behaviour
//   description: 'plain string with {node_id} tags for amber highlights'
//               or [{ text: '...', amber: true }, ...]  // legacy array format
//   location:    'parent_node_id',             // where this node starts
//   contains:    ['child_id', ...],            // for rooms and containers
//   exits: [{ direction, destination, description }],   // for rooms/traversable nodes
//   take:        'message on pickup',          // optional, falls back to default
//   drop:        'message on drop',            // optional, falls back to default
// }
//
// Description markup:
//   Use {node_id} to reference another node inline.
//   The engine replaces it with that node's display name in amber.
//   Unknown IDs produce a console warning at runtime.
//   Example: 'A closet. Some {coats} hang here. A {mirror} is on the wall.'

const NODES = [

  // ------------------------------------------------------------------ Rooms
  // Add rooms here. The first room must match state.currentRoom in engine.js.
  {
    id: 'start_room',
    name: 'start room',
    aliases: [],
    keywords: ['room'],
    description: 'An empty room. The world is waiting to be built.',
    exits: [],
    contains: [],
  },

  // ------------------------------------------------------------------ Fixtures
  // Fixed objects — scenery, doors, signs. Not takeable.

  // ------------------------------------------------------------------ Containers
  // Objects that reveal subnodes when examined.

  // ------------------------------------------------------------------ Items
  // Takeable objects.

];

export default NODES;
