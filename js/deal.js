/**
 * DEAL.JS — The Ritual Conductor
 * Digital Divination · Ealdforn Republic
 * 
 * Orchestrates the full divination pipeline:
 *   observe → weight → divine
 * 
 * Steps:
 *   1. Read the sky (Observe)
 *   2. Get past + present cards
 *   3. Calculate probability weights (Weight)
 *   4. Weighted draw for future card (Divine)
 *   5. Generate reading
 *   6. Persist to memory (localStorage)
 * 
 * Usage:
 *   const result = await Deal.perform(pastCardId, presentCardId, question);
 *   // { past, present, future, skyState, reading, timestamp }
 * 
 * Dependencies:
 *   - Observe (js/observe.js)
 *   - Weight (js/weight.js)  
 *   - Divine (divine.js)
 */

const Deal = (() => {
  // ─── MEMORY ─────────────────────────────
  const MEMORY_KEY = 'gaia_memory';
  const MAX_MEMORY = 1000;

  function loadMemory() {
    try {
      const stored = localStorage.getItem(MEMORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function saveMemory(entry) {
    const memory = loadMemory();
    memory.push(entry);
    // Auto-prune to MAX_MEMORY
    if (memory.length > MAX_MEMORY) {
      memory.splice(0, memory.length - MAX_MEMORY);
    }
    localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  }

  // ─── WEIGHTED DRAW ──────────────────────
  function weightedDraw(allCards, weights) {
    // Build cumulative distribution
    const entries = [];
    let cumulative = 0;

    allCards.forEach(card => {
      const w = weights[card.id] || 0;
      if (w > 0) {
        cumulative += w;
        entries.push({ card, cumulative });
      }
    });

    // Normalize
    const total = cumulative;
    if (total <= 0) {
      // Fallback: uniform random
      return allCards[Math.floor(Math.random() * allCards.length)];
    }

    // Weighted random selection
    const rand = Math.random() * total;
    for (const entry of entries) {
      if (rand <= entry.cumulative) {
        return entry.card;
      }
    }

    // Fallback
    return entries[entries.length - 1].card;
  }

  // ─── FIND CARD BY ID ────────────────────
  function findCard(cardId, allCards) {
    return allCards.find(c => c.id === cardId) || null;
  }

  // ─── BUILD READING ──────────────────────
  function buildReading(past, present, future, skyState, question) {
    const period = skyState.period === 'SUN' ? 'solar' : 'lunar';
    const sunSign = skyState.planets?.sun?.sign || 'unknown';
    const moonSign = skyState.planets?.moon?.sign || 'unknown';
    const moonPhase = skyState.moonPhase?.name || 'unknown phase';

    const reading = {
      // Sky context
      skyContext: {
        period,
        sunIn: `${sunSign} ${skyState.planets?.sun?.glyph || ''}`,
        moonIn: `${moonSign} ${skyState.planets?.moon?.glyph || ''}`,
        moonPhase: moonPhase.toLowerCase(),
        moonIllumination: skyState.moonPhase?.illumination || 0
      },
      // Card positions
      cards: {
        past: {
          id: past.id,
          name: past.name,
          title: past.title || past.domain || '',
          element: past.element || null,
          keywords: past.keywords || [],
          meaning: past.upright || '',
          isReversed: past.isReversed || false,
          image: past.image || null
        },
        present: {
          id: present.id,
          name: present.name,
          title: present.title || present.domain || '',
          element: present.element || null,
          keywords: present.keywords || [],
          meaning: present.upright || '',
          isReversed: present.isReversed || false,
          image: present.image || null
        },
        future: {
          id: future.id,
          name: future.name,
          title: future.title || future.domain || '',
          element: future.element || null,
          keywords: future.keywords || [],
          meaning: future.upright || '',
          isReversed: future.isReversed || false,
          image: future.image || null
        }
      },
      question: question || 'The unspoken question',
      timestamp: new Date().toISOString()
    };

    return reading;
  }

  // ─── PERFORM ────────────────────────────
  async function perform(pastCardId, presentCardId, question) {
    // 1. Observe the sky
    let skyState;
    try {
      skyState = await Observe.getSkyState();
      // Add moon aspect for weight calculation
      skyState.moonAspect = Observe.getMoonAspect();
    } catch (e) {
      console.warn('Sky observation failed, using fallback:', e.message);
      skyState = {
        period: 'SUN',
        moonAspect: 'Artemis',
        planets: {},
        moonPhase: { name: 'Full Moon', illumination: 100 },
        timestamp: new Date().toISOString()
      };
    }

    // 2. Load the full deck
    await Divine._loadDecks();
    const allCards = [...Divine._getMajorDeck(), ...Divine._getMinorDeck()];

    // 3. Find past and present cards
    const pastCard = findCard(pastCardId, allCards);
    const presentCard = findCard(presentCardId, allCards);

    if (!pastCard || !presentCard) {
      throw new Error('Past or present card not found in deck');
    }

    // 4. Calculate weights
    const weights = Weight.calculate(skyState, pastCard, presentCard, allCards);

    // 5. Weighted draw for future card
    const futureCard = weightedDraw(allCards, weights);
    
    // Add reversal chance
    futureCard.isReversed = Math.random() < 0.3;

    // 6. Build reading
    const reading = buildReading(pastCard, presentCard, futureCard, skyState, question);

    // 7. Persist to memory
    const memoryEntry = {
      timestamp: reading.timestamp,
      skyState: {
        period: skyState.period,
        sunSign: skyState.planets?.sun?.sign || null,
        moonSign: skyState.planets?.moon?.sign || null,
        moonPhase: skyState.moonPhase?.name || null,
        moonAspect: skyState.moonAspect || 'Artemis'
      },
      cards: {
        past: pastCard.id,
        present: presentCard.id,
        future: futureCard.id
      },
      question: question || null,
      futureWeight: weights[futureCard.id] || null
    };
    saveMemory(memoryEntry);

    return reading;
  }

  // ─── GET MEMORY ─────────────────────────
  function getMemory(limit = 10) {
    const memory = loadMemory();
    return memory.slice(-limit).reverse();
  }

  // ─── GET STATS ──────────────────────────
  function getStats() {
    const memory = loadMemory();
    if (memory.length === 0) return null;

    const stats = {
      totalReadings: memory.length,
      solarReadings: memory.filter(m => m.skyState?.period === 'SUN').length,
      lunarReadings: memory.filter(m => m.skyState?.period === 'MOON').length,
      mostDrawnFuture: {},
      recentReadings: memory.slice(-5).reverse()
    };

    // Count most drawn future cards
    memory.forEach(m => {
      const id = m.cards?.future;
      if (id) {
        stats.mostDrawnFuture[id] = (stats.mostDrawnFuture[id] || 0) + 1;
      }
    });

    return stats;
  }

  // ─── CLEAR MEMORY ───────────────────────
  function clearMemory() {
    localStorage.removeItem(MEMORY_KEY);
  }

  // ─── PUBLIC API ─────────────────────────
  return {
    perform,
    getMemory,
    getStats,
    clearMemory
  };
})();
