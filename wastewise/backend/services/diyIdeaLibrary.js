const makeThemes = (names) => names.map((name) => ({ title: name }));

// 18 material families x 6 routes = 108 material-specific DIY starting points.
const DIY_IDEA_LIBRARY = [
  { keywords: ['citrus peel', 'orange peel', 'lemon peel', 'lime peel'], themes: makeThemes(['dried fragrance sachet', 'pressed-peel gift tag', 'citrus peel paper confetti', 'natural yellow dye test', 'labelled vinegar infusion for sealed surfaces', 'small-batch compost balance']) },
  { keywords: ['banana peel'], themes: makeThemes(['small-batch compost mix', 'paper-pulp texture test', 'plant-safe compost tea only after full composting', 'natural-dye swatch test', 'dehydrated peel art texture', 'kitchen-waste observation journal']) },
  { keywords: ['flower', 'petal', 'rose', 'marigold', 'jasmine'], themes: makeThemes(['pressed botanical bookmark', 'dry-petal potpourri bowl', 'fragrance drawer sachet', 'botanical greeting-card inclusion', 'petal paper pulp', 'natural-colour dye swatch']) },
  { keywords: ['coffee ground', 'coffee grounds'], themes: makeThemes(['dry odour-absorber sachet', 'compost brown-green blend', 'textured paint additive', 'scratch-resistant paper-mache filler', 'sealed non-food scrub test', 'garden compost log']) },
  { keywords: ['tea leaf', 'tea bag', 'tea leaves'], themes: makeThemes(['tea-dye paper wash', 'dry drawer deodoriser', 'compost blend', 'botanical paper texture', 'earth-tone art pigment test', 'garden mulch trial after composting']) },
  { keywords: ['eggshell', 'egg shell'], themes: makeThemes(['sanitised mosaic tile', 'seed-starting shell pot', 'compost calcium additive', 'coarse slug barrier trial', 'white-pigment craft filler', 'miniature landscape texture']) },
  { keywords: ['vegetable scrap', 'vegetable peel', 'food scrap', 'organic waste'], themes: makeThemes(['layered compost bucket', 'bokashi-style pre-compost collection', 'worm-bin feed only after suitability check', 'organic-waste sorting chart', 'compost moisture balance test', 'soil-carbon journal']) },
  { keywords: ['coconut shell', 'coconut husk'], themes: makeThemes(['coir seedling liner', 'small succulent planter', 'coconut-shell mosaic', 'natural-fibre scrub pad', 'dry display bowl', 'compost carbon mix']) },
  { keywords: ['fruit seed', 'fruit pit', 'mango seed', 'avocado pit'], themes: makeThemes(['seed identification display', 'painted seed art', 'natural bead craft where drill-safe', 'pressed-seed collage', 'home seed-bank envelope', 'compost route for unsuitable seeds']) },
  { keywords: ['flour', 'atta', 'stale grain', 'expired rice'], themes: makeThemes(['non-food play dough', 'paper-paste craft glue', 'salt-dough ornament', 'grain-texture collage', 'compost micro-addition', 'sealed sensory-bottle filler']) },
  { keywords: ['cardboard', 'carton'], themes: makeThemes(['drawer divider grid', 'board game board', 'marble-run prototype', 'seedling tray from uncoated board', 'stencil and paint mask', 'paperboard storage label']) },
  { keywords: ['newspaper', 'paper', 'magazine'], themes: makeThemes(['paper pulp bowl', 'rolled-paper basket', 'origami game pieces', 'seed-starting pot from uncoated paper', 'gift wrap and tags', 'compost brown material']) },
  { keywords: ['glass jar', 'glass bottle'], themes: makeThemes(['non-food storage jar', 'cut-free lantern sleeve', 'propagation vase for clean glass', 'painted desk organiser', 'dry-goods label holder', 'local glass recycling sort']) },
  { keywords: ['plastic bottle', 'plastic container', 'plastic tub'], themes: makeThemes(['self-watering planter', 'vertical garden pocket', 'board-game token holder', 'craft-supply organiser', 'drip-irrigation prototype', 'plastic recycling preparation']) },
  { keywords: ['tin can', 'aluminium can', 'metal can'], themes: makeThemes(['edge-safe desk caddy', 'painted planter sleeve', 'string-light cover', 'game-piece storage tin', 'tool-bit organiser', 'metal recycling separation']) },
  { keywords: ['fabric scrap', 'cloth scrap', 'old clothes', 'textile'], themes: makeThemes(['patchwork repair patch', 'no-sew rag rug square', 'drawstring produce bag', 'fabric gift wrap', 'soft toy stuffing only when clean', 'textile donation sorting']) },
  { keywords: ['wood scrap', 'wooden'], themes: makeThemes(['plant label stake', 'peg board offcut', 'small building-block game', 'photo display stand', 'drawer spacer', 'wood offcut donation']) },
  { keywords: ['phone', 'laptop', 'electronics', 'circuit board', 'charger', 'cable', 'battery'], themes: makeThemes(['repairability assessment', 'data-safe resale preparation', 'parts-only donation listing', 'cable sorting kit', 'brand take-back lookup', 'authorised e-waste recycler handover']) },
];

const getDIYIdeaThemes = (component = {}) => {
  const text = `${component.component_name || ''} ${component.material || ''} ${component.component_type || ''}`.toLowerCase();
  const family = DIY_IDEA_LIBRARY.find((entry) => entry.keywords.some((keyword) => text.includes(keyword)));
  return family?.themes || [];
};

const DIY_IDEA_COUNT = DIY_IDEA_LIBRARY.reduce((count, entry) => count + entry.themes.length, 0);

module.exports = { DIY_IDEA_LIBRARY, DIY_IDEA_COUNT, getDIYIdeaThemes };
