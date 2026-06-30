/**
 * altar-draw.js · Digital Divination
 * Single-card draw engine for the Altar.
 * Pulls one Major Arcana card, computes its palette,
 * and returns everything needed to transform the shrine.
 *
 * Usage:
 *   const result = await AltarDraw.draw();
 *   // { card, palette, reading }
 */

const AltarDraw = (() => {

  // ═══════════════════════════════════
  // ELEMENT PALETTES
  // ═══════════════════════════════════

  const ELEMENT_PALETTES = {
    Fire: {
      candle: '#ffaa44', glow: 'rgba(255,170,68,0.6)',
      cloth: '#3a1a10', clothOpacity: '0.45',
      sand: '#e8a840', cardBorder: 'rgba(255,140,40,0.35)',
      inscription: '#c8a080', inscriptionEm: '#ffaa44',
      ambient: 'rgba(255,140,40,0.06)'
    },
    Water: {
      candle: '#88bbff', glow: 'rgba(136,187,255,0.5)',
      cloth: '#0a1a2a', clothOpacity: '0.4',
      sand: '#5599cc', cardBorder: 'rgba(100,160,220,0.3)',
      inscription: '#8899bb', inscriptionEm: '#88bbff',
      ambient: 'rgba(100,160,220,0.05)'
    },
    Earth: {
      candle: '#aacc88', glow: 'rgba(170,204,136,0.5)',
      cloth: '#1a2a0a', clothOpacity: '0.4',
      sand: '#88aa66', cardBorder: 'rgba(130,170,100,0.3)',
      inscription: '#99aa88', inscriptionEm: '#aacc88',
      ambient: 'rgba(130,170,100,0.05)'
    },
    Air: {
      candle: '#ccbbff', glow: 'rgba(204,187,255,0.5)',
      cloth: '#1a0a2a', clothOpacity: '0.4',
      sand: '#9977cc', cardBorder: 'rgba(160,140,220,0.3)',
      inscription: '#9988aa', inscriptionEm: '#ccbbff',
      ambient: 'rgba(160,140,220,0.05)'
    }
  };

  // ═══════════════════════════════════
  // GOD-SPECIFIC OVERRIDES
  // ═══════════════════════════════════

  const GOD_PALETTES = {
    Apollo:     { candle: '#ffcc44', glow: 'rgba(255,204,68,0.7)', cardBorder: 'rgba(255,180,60,0.4)', inscriptionEm: '#ffcc44' },
    Aphrodite:  { candle: '#ff88aa', glow: 'rgba(255,136,170,0.5)', cardBorder: 'rgba(255,130,150,0.35)', inscriptionEm: '#ff88aa' },
    Ares:       { candle: '#ff4422', glow: 'rgba(255,68,34,0.6)', cardBorder: 'rgba(220,60,30,0.35)', inscriptionEm: '#ff6644' },
    Artemis:    { candle: '#aaddaa', glow: 'rgba(170,221,170,0.5)', cardBorder: 'rgba(150,200,150,0.3)', inscriptionEm: '#aaddaa' },
    Athena:     { candle: '#aa88ee', glow: 'rgba(170,136,238,0.5)', cardBorder: 'rgba(160,120,220,0.3)', inscriptionEm: '#aa88ee' },
    Demeter:    { candle: '#88bb66', glow: 'rgba(136,187,102,0.5)', cardBorder: 'rgba(130,170,90,0.3)', inscriptionEm: '#88bb66' },
    Dionysus:   { candle: '#cc88cc', glow: 'rgba(204,136,204,0.5)', cardBorder: 'rgba(190,120,190,0.3)', inscriptionEm: '#cc88cc' },
    Hephaestus: { candle: '#ff8833', glow: 'rgba(255,136,51,0.6)', cardBorder: 'rgba(240,120,40,0.35)', inscriptionEm: '#ff8833' },
    Hera:       { candle: '#55aabb', glow: 'rgba(85,170,187,0.5)', cardBorder: 'rgba(80,150,170,0.3)', inscriptionEm: '#55aabb' },
    Hermes:     { candle: '#ccb888', glow: 'rgba(204,184,136,0.5)', cardBorder: 'rgba(190,170,120,0.3)', inscriptionEm: '#ccb888' },
    Poseidon:   { candle: '#44aaaa', glow: 'rgba(68,170,170,0.5)', cardBorder: 'rgba(60,150,150,0.3)', inscriptionEm: '#44aaaa' },
    Zeus:       { candle: '#ddcc88', glow: 'rgba(221,204,136,0.6)', cardBorder: 'rgba(210,190,120,0.35)', inscriptionEm: '#ddcc88' },
    Hades:      { candle: '#9966cc', glow: 'rgba(153,102,204,0.5)', cardBorder: 'rgba(140,90,190,0.3)', inscriptionEm: '#9966cc' },
  };

  // ═══════════════════════════════════
  // CARD DATA CACHE
  // ═══════════════════════════════════

  let deckCache = null;

  async function loadDeck() {
    if (deckCache) return deckCache;
    try {
      const res = await fetch('data/deck/major_arcana.json');
      const data = await res.json();
      deckCache = data.cards || [];
      return deckCache;
    } catch(e) {
      console.error('[AltarDraw] Failed to load Major Arcana deck:', e);
      // Fallback to the inline MAJOR_ARCANA array if JSON fails
      if (typeof MAJOR_ARCANA !== 'undefined') {
        deckCache = MAJOR_ARCANA;
        return deckCache;
      }
      return [];
    }
  }

  // ═══════════════════════════════════
  // DRAW A SINGLE CARD
  // ═══════════════════════════════════

  async function draw() {
    const deck = await loadDeck();
    if (!deck.length) return null;

    const index = Math.floor(Math.random() * deck.length);
    const card = deck[index];

    return buildResult(card);
  }

  // ═══════════════════════════════════
  // GET A SPECIFIC CARD BY INDEX
  // ═══════════════════════════════════

  async function getCard(index) {
    const deck = await loadDeck();
    if (!deck.length) return null;

    const safeIndex = ((index % deck.length) + deck.length) % deck.length;
    const card = deck[safeIndex];

    return buildResult(card);
  }

  // ═══════════════════════════════════
  // GET DECK SIZE
  // ═══════════════════════════════════

  async function getDeckSize() {
    const deck = await loadDeck();
    return deck.length;
  }

  // ═══════════════════════════════════
  // BUILD RESULT OBJECT
  // ═══════════════════════════════════

  function buildResult(card) {
    const element = card.element || 'Fire';
    const basePalette = ELEMENT_PALETTES[element] || ELEMENT_PALETTES.Fire;
    const godOverrides = GOD_PALETTES[card.ruling_god] || {};

    // Merge: base element palette + god-specific overrides
    const palette = { ...basePalette, ...godOverrides };

    // Build the reading text from the card's upright meaning
    const reading = card.upright || '';
    const keywords = card.keywords || [];
    const title = card.title || '';
    const culture = card.culture || '';

    // Image path — handle both full paths and ID-based paths
    const imagePath = card.image || `data/images/major/${card.id}.png`;

    return {
      card: {
        id: card.id,
        name: card.name,
        title: title,
        culture: culture,
        element: element,
        ruling_god: card.ruling_god || '',
        keywords: keywords,
        upright: reading,
        image: imagePath
      },
      palette: palette,
      reading: reading,
      keywords: keywords,
      // Computed display strings
      displayName: `${card.name}${title ? ' · ' + title : ''}`,
      displaySubtitle: `${element}${card.ruling_god ? ' · Ruled by ' + card.ruling_god : ''}`,
      keywordString: keywords.slice(0, 4).join(' · ')
    };
  }

  // ═══════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════

  return {
    draw,
    getCard,
    getDeckSize,
    loadDeck,
    ELEMENT_PALETTES,
    GOD_PALETTES
  };

})();
