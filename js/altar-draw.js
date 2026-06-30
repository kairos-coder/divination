/**
 * altar-draw.js · Digital Divination
 * Single-card draw engine for the Altar.
 * Pulls one Major Arcana card, its elemental attendants,
 * and computes the full palette.
 *
 * Usage:
 *   const result = await AltarDraw.draw();
 *   // { card, palette, reading, attendants, keywords, ... }
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

  let majorDeck = null;
  let minorDeck = null;

  async function loadMajorDeck() {
    if (majorDeck) return majorDeck;
    try {
      const res = await fetch('data/deck/major_arcana.json');
      const data = await res.json();
      majorDeck = data.cards || [];
      return majorDeck;
    } catch(e) {
      console.error('[AltarDraw] Failed to load Major Arcana:', e);
      return [];
    }
  }

  async function loadMinorDeck() {
    if (minorDeck) return minorDeck;
    try {
      const res = await fetch('data/deck/minor_arcana.json');
      const data = await res.json();
      // minor_arcana.json has cards organized by suit: { cards: { fire: [...], water: [...], ... } }
      const cards = data.cards || {};
      // Flatten into a single array with suit info
      minorDeck = [];
      Object.entries(cards).forEach(([suit, suitCards]) => {
        suitCards.forEach(card => {
          minorDeck.push({ ...card, suit: suit });
        });
      });
      return minorDeck;
    } catch(e) {
      console.error('[AltarDraw] Failed to load Minor Arcana:', e);
      return [];
    }
  }

  // ═══════════════════════════════════
  // DRAW A SINGLE MAJOR ARCANA CARD
  // ═══════════════════════════════════

  async function draw() {
    const deck = await loadMajorDeck();
    if (!deck.length) return null;

    const index = Math.floor(Math.random() * deck.length);
    const card = deck[index];

    // Get attendants from the matching elemental suit
    const element = card.element || 'Fire';
    const attendants = await getAttendants(element, 3);

    return buildResult(card, attendants);
  }

  // ═══════════════════════════════════
  // GET A SPECIFIC CARD BY INDEX
  // ═══════════════════════════════════

  async function getCard(index) {
    const deck = await loadMajorDeck();
    if (!deck.length) return null;

    const safeIndex = ((index % deck.length) + deck.length) % deck.length;
    const card = deck[safeIndex];

    const element = card.element || 'Fire';
    const attendants = await getAttendants(element, 3);

    return buildResult(card, attendants);
  }

  // ═══════════════════════════════════
  // GET ATTENDANTS FROM MATCHING SUIT
  // ═══════════════════════════════════

  async function getAttendants(element, count) {
    const deck = await loadMinorDeck();
    if (!deck.length) return [];

    // Map Major Arcana element to Minor Arcana suit name
    const suitMap = {
      'Fire': 'fire',
      'Water': 'water',
      'Earth': 'earth',
      'Air': 'air'
    };
    const suitName = suitMap[element] || 'fire';

    // Filter cards by suit
    const suitCards = deck.filter(c => c.suit === suitName);
    if (!suitCards.length) return [];

    // Shuffle and pick
    const shuffled = [...suitCards].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(card => ({
      id: card.id,
      name: card.name,
      title: card.title,
      culture: card.culture,
      image: card.image || `data/images/minor/${suitName}/${card.id}.png`,
      keywords: card.keywords || [],
      upright: card.upright || '',
      element: element
    }));
  }

  // ═══════════════════════════════════
  // GET DECK SIZE
  // ═══════════════════════════════════

  async function getDeckSize() {
    const deck = await loadMajorDeck();
    return deck.length;
  }

  // ═══════════════════════════════════
  // BUILD RESULT OBJECT
  // ═══════════════════════════════════

  function buildResult(card, attendants) {
    const element = card.element || 'Fire';
    const basePalette = ELEMENT_PALETTES[element] || ELEMENT_PALETTES.Fire;
    const godOverrides = GOD_PALETTES[card.ruling_god] || {};

    const palette = { ...basePalette, ...godOverrides };

    const reading = card.upright || '';
    const keywords = card.keywords || [];
    const title = card.title || '';

    const imagePath = card.image || `data/images/major/${card.id}.png`;

    return {
      card: {
        id: card.id,
        name: card.name,
        title: title,
        element: element,
        ruling_god: card.ruling_god || '',
        keywords: keywords,
        upright: reading,
        image: imagePath
      },
      palette: palette,
      reading: reading,
      keywords: keywords,
      attendants: attendants,
      displayName: `${card.name}${title ? ' · ' + title : ''}`,
      displaySubtitle: `${element}${card.ruling_god ? ' · ' + card.ruling_god : ''}`,
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
    getAttendants,
    loadDeck: loadMajorDeck,
    loadMinorDeck,
    ELEMENT_PALETTES,
    GOD_PALETTES
  };

})();
