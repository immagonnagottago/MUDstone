// nodes.js
// All world data. Every interactable thing is a node.
// Nodes reference each other by id.

const NODES = [

  // ------------------------------------------------------------------ Rooms
  {
    id: 'coat_closet',
    name: 'coat closet',
    aliases: [],
    keywords: ['room'],
    description: [
      { text: 'A very large coat closet. Lots of ' },
      { text: 'coats', amber: true },
      { text: ' hang here. There is a ' },
      { text: 'mirror', amber: true },
      { text: ' on the wall. A ' },
      { text: 'door', amber: true },
      { text: ' leads out into the living room. You notice a faint smell of mothballs.' },
    ],
    exits: [
      { direction: 'south', destination: 'living_room', description: 'a door leading into the living room' },
    ],
    contains: ['coats', 'mirror', 'door'],
  },

  // ------------------------------------------------------------------ Fixtures
  {
    id: 'door',
    name: 'door',
    aliases: [],
    keywords: ['fixed'],
    description: 'A solid wooden door with a polished brass handle. The fit is snug, and a thin line of light shows at the base — the living room is just beyond.',
    location: 'coat_closet',
  },

  {
    id: 'mirror',
    name: 'mirror',
    aliases: [],
    keywords: ['item', 'heavy'],
    description: 'A small rectangular mirror in a thin brass frame, hung at a slight angle. Your reflection looks back at you, composed and unhurried.',
    location: 'coat_closet',
    take: 'You carefully lift the mirror off the wall.',
    drop: 'You set the mirror down, leaning it against the wall.',
  },

  // ------------------------------------------------------------------ Containers
  {
    id: 'coats',
    name: 'coats',
    aliases: ['coat'],
    keywords: ['container'],
    descriptionFn: 'coatsDescription', // engine resolves this dynamically
    location: 'coat_closet',
    contains: ['wool_overcoat', 'leather_jacket', 'tweed_coat'],
  },

  // ------------------------------------------------------------------ Items: Coats
  {
    id: 'wool_overcoat',
    name: 'wool overcoat',
    aliases: ['overcoat', 'wool'],
    keywords: ['item', 'wearable'],
    description: 'A long charcoal overcoat in heavy wool. Well tailored, with deep pockets and cloth-covered buttons. It sits heavily on the hanger.',
    location: 'coats',
    take: 'You take the wool overcoat.',
    drop: 'You set down the wool overcoat.',
  },

  {
    id: 'leather_jacket',
    name: 'leather jacket',
    aliases: ['jacket', 'leather'],
    keywords: ['item', 'wearable'],
    description: 'A dark brown leather jacket, broken in just enough to be comfortable. The scuffs on the shoulders give it character. The lining is a faded paisley silk.',
    location: 'coats',
    take: 'You take the leather jacket.',
    drop: 'You set down the leather jacket.',
  },

  {
    id: 'tweed_coat',
    name: 'tweed coat',
    aliases: ['tweed'],
    keywords: ['item', 'wearable'],
    description: 'A neatly folded tweed coat in earthy browns and greens. It smells faintly of cedar.',
    location: 'coats',
    take: 'You take the tweed coat.',
    drop: 'You set down the tweed coat.',
  },

];

export default NODES;
