// keywords.js
// Registry of all node keywords and what they mean.
// Keywords are composable — a node can have any combination.
// Logic for each keyword lives in engine.js.
//
// To add a keyword:
//   1. Add an entry here with a plain-English description.
//   2. Add the corresponding behaviour in engine.js.

const KEYWORDS = {

  // --- Spatial ---
  room:       'A space the player can be in. Direct children are always visible. Acts as a top-level container.',
  container:  'Reveals subnodes when examined with look. Subnodes are hidden until then.',

  // --- Item behaviour ---
  item:       'Can be picked up with take and put down with drop.',
  fixed:      'Cannot be taken, even if also tagged item. Permanently in its location.',
  heavy:      'Requires both inventory slots to be empty before it can be taken.',
  wearable:   'Can be worn with wear and removed with remove.',

  // --- Add new keywords below ---

};

export default KEYWORDS;
