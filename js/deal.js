/**
 * DEAL.JS — The Ritual Conductor
 * DivineDB · Ealdforn Republic
 * 
 * Orchestrates: observe → weight → divine → DivineDB
 */

const Deal = (() => {
  async function perform(pastCardId, presentCardId, question) {
    // 1. Sky
    let skyState;
    try {
      skyState = await Observe.getSkyState();
      skyState.moonAspect = Observe.getMoonAspect();
    } catch (e) {
      skyState = {
        period: 'SUN', moonAspect: 'Artemis', planets: {},
        moonPhase: { name: 'Full Moon', illumination: 100 },
        timestamp: new Date().toISOString()
      };
    }

    // 2. Deck
    await Divine.loadDecks();
    const allCards = [...Divine.getMajorDeck(), ...Divine.getMinorDeck()];

    // 3. Cards
    const pastCard = allCards.find(c => c.id === pastCardId);
    const presentCard = allCards.find(c => c.id === presentCardId);
    if (!pastCard || !presentCard) throw new Error('Card not found');

    // 4. Weights
    const weights = Weight.calculate(skyState, pastCard, presentCard, allCards);

    // 5. Draw
    const futureCard = weightedDraw(allCards, weights);
    futureCard.isReversed = Math.random() < 0.3;

    // 6. Build reading
    const reading = buildReading(pastCard, presentCard, futureCard, skyState, question);

    // 7. Save to DivineDB (Supabase)
    let savedToCloud = false;
    if (Gaia.isConnected) {
      try {
        await Gaia.saveReading(reading);
        savedToCloud = true;
        console.log('📖 Saved to DivineDB');
      } catch (e) {
        console.warn('DivineDB save failed:', e.message);
      }
    }

    // 8. Local backup
    saveLocally(reading);

    return { ...reading, savedToCloud };
  }

  function weightedDraw(allCards, weights) {
    const entries = [];
    let cumulative = 0;
    allCards.forEach(card => {
      const w = weights[card.id] || 0;
      if (w > 0) { cumulative += w; entries.push({ card, cumulative }); }
    });
    if (cumulative <= 0) return allCards[Math.floor(Math.random() * allCards.length)];
    const rand = Math.random() * cumulative;
    for (const e of entries) { if (rand <= e.cumulative) return e.card; }
    return entries[entries.length - 1].card;
  }

  function buildReading(past, present, future, skyState, question) {
    return {
      id: `reading_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      skyContext: {
        period: skyState.period === 'SUN' ? 'solar' : 'lunar',
        sunIn: `${skyState.planets?.sun?.sign || '?'} ${skyState.planets?.sun?.glyph || ''}`,
        moonIn: `${skyState.planets?.moon?.sign || '?'} ${skyState.planets?.moon?.glyph || ''}`,
        moonPhase: skyState.moonPhase?.name?.toLowerCase() || 'unknown',
        moonIllumination: skyState.moonPhase?.illumination || 0,
        ascendant: skyState.ascendant?.sign || 'Unknown'
      },
      cards: {
        past: cardSnapshot(past),
        present: cardSnapshot(present),
        future: cardSnapshot(future)
      },
      question: question || 'The unspoken question',
      timestamp: new Date().toISOString()
    };
  }

  function cardSnapshot(card) {
    return {
      id: card.id, name: card.name,
      title: card.title || card.domain || '',
      element: card.element || null,
      suit: card.suit || null,
      keywords: card.keywords || [],
      meaning: card.isReversed ? (card.reversed || card.upright || '') : (card.upright || ''),
      isReversed: card.isReversed || false,
      image: card.image || null,
      type: card.id?.startsWith('major') ? 'major' : 'minor'
    };
  }

  function saveLocally(reading) {
    try {
      const key = 'divinedb_local';
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      stored.push({ id: reading.id, timestamp: reading.timestamp, question: reading.question });
      if (stored.length > 100) stored.splice(0, stored.length - 100);
      localStorage.setItem(key, JSON.stringify(stored));
    } catch (e) {}
  }

  return { perform };
})();
