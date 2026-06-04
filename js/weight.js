/**
 * WEIGHT.JS — Probability Weight Calculator
 * Digital Divination · Ealdforn Republic
 * 
 * Calculates probability weights for future card based on:
 *   - Past card (Major Arcana)
 *   - Present card (Minor Arcana)  
 *   - Current sky state (from observe.js)
 * 
 * Pure math. No narrative. Returns a probability distribution
 * across all 78 cards.
 * 
 * Usage:
 *   const weights = Weight.calculate(skyState, pastCard, presentCard, allCards);
 *   // { 'major_13': 0.045, 'fire_ace': 0.032, ... } — sum = 1.0
 */

const Weight = (() => {
  // ─── OLYMPIAN → ELEMENT MAP ─────────────
  const OLYMPIAN_ELEMENT = {
    'Apollo':     'Fire',
    'Ares':       'Fire', 
    'Hephaestus': 'Fire',
    'Demeter':    'Earth',
    'Hera':       'Earth',
    'Artemis':    'Earth',
    'Poseidon':   'Water',
    'Dionysus':   'Water',
    'Aphrodite':  'Water',
    'Zeus':       'Air',
    'Athena':     'Air',
    'Hermes':     'Air'
  };

  // ─── PLANET → OLYMPIAN MAP ──────────────
  const PLANET_OLYMPIAN = {
    'sun':     'Apollo',
    'moon':    'Artemis',
    'mercury': 'Hermes',
    'venus':   'Aphrodite',
    'mars':    'Ares',
    'jupiter': 'Zeus',
    'saturn':  'Hera',
    'uranus':  'Hephaestus',
    'neptune': 'Poseidon',
    'pluto':   'Hades'
  };

  // ─── NARRATIVE ARC WEIGHTS ──────────────
  const NARRATIVE_ARCS = [
    {
      // Death → Rebirth arc
      pastId: 'major_13',
      presentRank: '8',
      weights: { 'major_16': 3.0, 'major_17': 2.0 }  // Tower, Star
    },
    {
      // The Lovers → Heartbreak arc
      pastId: 'major_06',
      presentSuit: 'Air',
      weights: { 'air_03': 2.5 }  // Three of Swords
    },
    {
      // The Fool → Journey arc
      pastId: 'major_00',
      presentRank: 'ace',
      weights: { 'major_21': 2.0, 'major_07': 1.8 }  // World, Chariot
    },
    {
      // The Tower → Aftermath arc
      pastId: 'major_16',
      presentSuit: 'Earth',
      weights: { 'major_17': 2.5, 'major_14': 2.0 }  // Star, Temperance
    },
    {
      // The Emperor → Legacy arc
      pastId: 'major_04',
      presentRank: 'king',
      weights: { 'major_20': 2.0, 'major_10': 1.8 }  // Judgement, Wheel
    }
  ];

  // ─── HELPERS ────────────────────────────
  function getElement(card) {
    return card?.element || null;
  }

  function getSuit(card) {
    // Minor arcana IDs: fire_ace, water_02, etc.
    if (card?.id?.startsWith('fire')) return 'Fire';
    if (card?.id?.startsWith('water')) return 'Water';
    if (card?.id?.startsWith('earth')) return 'Earth';
    if (card?.id?.startsWith('air')) return 'Air';
    // Major arcana — check divine_suit in the card data
    if (card?.divine_suit) {
      const suitMap = { 'fire': 'Fire', 'water': 'Water', 'earth': 'Earth', 'air': 'Air' };
      return suitMap[card.divine_suit] || null;
    }
    return null;
  }

  function getRank(card) {
    return card?.rank || null;
  }

  function getMoonOlympian(skyState) {
    // Moon = Artemis, but on new moon/waning crescent it's Melinoe
    const moonAspect = skyState?.moonAspect || 'Artemis';
    return moonAspect;
  }

  // ─── WEIGHT MODULE 1: ELEMENTAL AFFINITY ─
  function applyElementalWeights(weights, allCards, skyState, pastCard, presentCard) {
    const pastElement = getElement(pastCard);
    const presentElement = getElement(presentCard);
    const period = skyState?.period || 'SUN';
    const planets = skyState?.planets || {};

    allCards.forEach(card => {
      const cardElement = getElement(card);
      if (!cardElement) return;

      // Past card elemental resonance
      if (pastElement && cardElement === pastElement) {
        weights[card.id] = (weights[card.id] || 1.0) * 1.5;
      }

      // Present card elemental resonance
      if (presentElement && cardElement === presentElement) {
        weights[card.id] = (weights[card.id] || 1.0) * 1.3;
      }

      // Period affinity
      if (period === 'SUN' && cardElement === 'Fire') {
        weights[card.id] = (weights[card.id] || 1.0) * 1.2;
      }
      if (period === 'MOON' && cardElement === 'Water') {
        weights[card.id] = (weights[card.id] || 1.0) * 1.2;
      }
    });
  }

  // ─── WEIGHT MODULE 2: OLYMPIAN INFLUENCE ─
  function applyOlympianWeights(weights, allCards, skyState) {
    const planets = skyState?.planets || {};

    // Each planet's sign → Olympian → element gets weighted
    Object.entries(PLANET_OLYMPIAN).forEach(([planetKey, olympian]) => {
      const planet = planets[planetKey];
      if (!planet) return;

      const element = OLYMPIAN_ELEMENT[olympian];
      if (!element) return;

      // The element associated with this Olympian gets a boost
      allCards.forEach(card => {
        const cardElement = getElement(card);
        if (cardElement === element) {
          weights[card.id] = (weights[card.id] || 1.0) * 1.4;
        }
      });
    });

    // Moon aspect specific
    const moonOlympian = getMoonOlympian(skyState);
    if (moonOlympian === 'Melinoe') {
      // Melinoe boosts madness/illusion cards — Major Arcana Moon, Hermit, Hanged Man
      const melinoeCards = ['major_18', 'major_09', 'major_12'];
      melinoeCards.forEach(id => {
        weights[id] = (weights[id] || 1.0) * 2.0;
      });
    } else {
      // Artemis boosts hunt/sovereignty cards — Chariot, Strength, Queen cards
      const artemisCards = ['major_07', 'major_11'];
      artemisCards.forEach(id => {
        weights[id] = (weights[id] || 1.0) * 1.5;
      });
      // Boost all Queen cards
      allCards.forEach(card => {
        if (card.rank === 'queen') {
          weights[card.id] = (weights[card.id] || 1.0) * 1.3;
        }
      });
    }
  }

  // ─── WEIGHT MODULE 3: NARRATIVE ARCS ────
  function applyNarrativeArcs(weights, pastCard, presentCard) {
    const pastId = pastCard?.id;
    const presentRank = getRank(presentCard);
    const presentSuit = getSuit(presentCard);

    NARRATIVE_ARCS.forEach(arc => {
      let match = (arc.pastId === pastId);
      
      if (arc.presentRank && presentRank !== arc.presentRank) match = false;
      if (arc.presentSuit && presentSuit !== arc.presentSuit) match = false;

      if (match && arc.weights) {
        Object.entries(arc.weights).forEach(([cardId, multiplier]) => {
          weights[cardId] = (weights[cardId] || 1.0) * multiplier;
        });
      }
    });
  }

  // ─── NORMALIZE ──────────────────────────
  function normalize(weights, allCards) {
    // Ensure all cards have at least base weight
    allCards.forEach(card => {
      if (!weights[card.id]) weights[card.id] = 1.0;
    });

    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const normalized = {};
    Object.entries(weights).forEach(([id, w]) => {
      normalized[id] = w / total;
    });

    return normalized;
  }

  // ─── MAIN CALCULATE ─────────────────────
  function calculate(skyState, pastCard, presentCard, allCards) {
    const weights = {};

    // Apply weight modules in sequence
    applyElementalWeights(weights, allCards, skyState, pastCard, presentCard);
    applyOlympianWeights(weights, allCards, skyState);
    applyNarrativeArcs(weights, pastCard, presentCard);

    // Normalize to probability distribution
    return normalize(weights, allCards);
  }

  // ─── PUBLIC API ─────────────────────────
  return {
    calculate,
    // Expose for testing
    _applyElementalWeights: applyElementalWeights,
    _applyOlympianWeights: applyOlympianWeights,
    _applyNarrativeArcs: applyNarrativeArcs
  };
})();
