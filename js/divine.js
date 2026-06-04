/**
 * DIVINE.JS — Card Engine
 * Digital Divination · Ealdforn Republic
 * 
 * Pure library. No DOM manipulation. No event handlers.
 * Loads decks, shuffles, draws cards, renders card HTML.
 * Called by deal.js for weighted draws.
 * Called by draw.html for display rendering.
 * 
 * Usage:
 *   await Divine.loadDecks();
 *   const cards = Divine.draw(3, { weights: {...} });  // weighted
 *   const cards = Divine.draw(3);                        // uniform random
 *   const html = Divine.renderCard(card, 'past');
 */

const Divine = (() => {
  // ─── STATE ──────────────────────────────
  let majorDeck = [];
  let minorDeck = [];
  let decksLoaded = false;

  // ─── IMAGE MAP ──────────────────────────
  const IMAGE_MAP = {
    // Major Arcana (22 cards)
    'major_00': 'data/images/dionysus-card.jpg',
    'major_01': 'data/images/major/magician.png',
    'major_02': 'data/images/hera-card.jpg',
    'major_03': 'data/images/demeter-card.jpg',
    'major_04': 'data/images/zeus-card.jpg',
    'major_05': 'data/images/ares-card.jpg',
    'major_06': 'data/images/aphrodite-card.jpg',
    'major_07': 'data/images/artemis-card.jpg',
    'major_08': 'data/images/athena-card.jpg',
    'major_09': 'data/images/hermit-card.jpg',
    'major_10': 'data/images/major/wheel_of_fortune.png',
    'major_11': 'data/images/hephaestus-card.jpg',
    'major_12': 'data/images/prometheus-card.jpg',
    'major_13': 'data/images/thanatos-card.jpg',
    'major_14': 'data/images/major/temperance.png',
    'major_15': 'data/images/hades-card.jpg',
    'major_16': 'data/images/poseidon-card.jpg',
    'major_17': 'data/images/persephone-card.jpg',
    'major_18': 'data/images/major/moon.png',
    'major_19': 'data/images/major/sun.png',
    'major_20': 'data/images/major/judgment.png',
    'major_21': 'data/images/major/world.png',
    // Fire Suit (14 cards)
    'fire_ace':    'data/images/minor/fire/fire_ace.png',
    'fire_02':     'data/images/minor/fire/fire_02.png',
    'fire_03':     'data/images/minor/fire/fire_03.png',
    'fire_04':     'data/images/minor/fire/fire_04.png',
    'fire_05':     'data/images/minor/fire/fire_05.png',
    'fire_06':     'data/images/minor/fire/fire_06.png',
    'fire_07':     'data/images/minor/fire/fire_07.png',
    'fire_08':     'data/images/minor/fire/fire_08.png',
    'fire_09':     'data/images/minor/fire/fire_09.png',
    'fire_10':     'data/images/minor/fire/fire_10.png',
    'fire_page':   'data/images/minor/fire/fire_page.png',
    'fire_knight': 'data/images/minor/fire/fire_knight.png',
    'fire_queen':  'data/images/minor/fire/fire_queen.png',
    'fire_king':   'data/images/minor/fire/fire_king.png',
    // Earth Suit (14 cards)
    'earth_ace':    'data/images/minor/earth/earth_ace.png',
    'earth_02':     'data/images/minor/earth/earth_02.png',
    'earth_03':     'data/images/minor/earth/earth_03.png',
    'earth_04':     'data/images/minor/earth/earth_04.png',
    'earth_05':     'data/images/minor/earth/earth_05.png',
    'earth_06':     'data/images/minor/earth/earth_06.png',
    'earth_07':     'data/images/minor/earth/earth_07.png',
    'earth_08':     'data/images/minor/earth/earth_08.png',
    'earth_09':     'data/images/minor/earth/earth_09.png',
    'earth_10':     'data/images/minor/earth/earth_10.png',
    'earth_page':   'data/images/minor/earth/earth_page.png',
    'earth_knight': 'data/images/minor/earth/earth_knight.png',
    'earth_queen':  'data/images/minor/earth/earth_queen.png',
    'earth_king':   'data/images/minor/earth/earth_king.png',
    // Water Suit (14 cards)
    'water_ace':    'data/images/minor/water/water_ace.png',
    'water_02':     'data/images/minor/water/water_02.png',
    'water_03':     'data/images/minor/water/water_03.png',
    'water_04':     'data/images/minor/water/water_04.png',
    'water_05':     'data/images/minor/water/water_05.png',
    'water_06':     'data/images/minor/water/water_06.png',
    'water_07':     'data/images/minor/water/water_07.png',
    'water_08':     'data/images/minor/water/water_08.png',
    'water_09':     'data/images/minor/water/water_09.png',
    'water_10':     'data/images/minor/water/water_10.png',
    'water_page':   'data/images/minor/water/water_page.png',
    'water_knight': 'data/images/minor/water/water_knight.png',
    'water_queen':  'data/images/minor/water/water_queen.png',
    'water_king':   'data/images/minor/water/water_king.png',
    // Air Suit (14 cards)
    'air_ace':    'data/images/minor/air/air_ace.png',
    'air_02':     'data/images/minor/air/air_02.png',
    'air_03':     'data/images/minor/air/air_03.png',
    'air_04':     'data/images/minor/air/air_04.png',
    'air_05':     'data/images/minor/air/air_05.png',
    'air_06':     'data/images/minor/air/air_06.png',
    'air_07':     'data/images/minor/air/air_07.png',
    'air_08':     'data/images/minor/air/air_08.png',
    'air_09':     'data/images/minor/air/air_09.png',
    'air_10':     'data/images/minor/air/air_10.png',
    'air_page':   'data/images/minor/air/air_page.png',
    'air_knight': 'data/images/minor/air/air_knight.png',
    'air_queen':  'data/images/minor/air/air_queen.png',
    'air_king':   'data/images/minor/air/air_king.png'
  };

  const ELEMENT_EMOJI = {
    'Fire': '🔥', 'Earth': '🜃', 'Water': '🌊', 'Air': '💨', null: '✦'
  };

  const POSITION_LABELS = {
    past: 'The Past',
    present: 'The Present',
    future: 'The Future'
  };

  // ─── LOAD DECKS ─────────────────────────
  async function loadDecks() {
    if (decksLoaded) return;
    
    const [majorRes, minorRes] = await Promise.all([
      fetch('data/deck/major_arcana.json'),
      fetch('data/deck/minor_arcana.json')
    ]);
    
    if (!majorRes.ok) throw new Error(`Major deck fetch failed: ${majorRes.status}`);
    if (!minorRes.ok) throw new Error(`Minor deck fetch failed: ${minorRes.status}`);
    
    const majorData = await majorRes.json();
    const minorData = await minorRes.json();
    
    majorDeck = majorData.cards || [];
    
    minorDeck = [];
    if (minorData.cards) {
      Object.values(minorData.cards).forEach(suitCards => {
        minorDeck.push(...suitCards);
      });
    }
    
    decksLoaded = true;
  }

  // ─── GET DECKS ──────────────────────────
  function getMajorDeck() { return [...majorDeck]; }
  function getMinorDeck() { return [...minorDeck]; }
  function getFullDeck() { return [...majorDeck, ...minorDeck]; }
  function isLoaded() { return decksLoaded; }

  // ─── SHUFFLE ────────────────────────────
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ─── WEIGHTED DRAW ──────────────────────
  function weightedDraw(pool, count, weights) {
    if (!weights || Object.keys(weights).length === 0) {
      // Fallback to uniform random
      const shuffled = shuffle(pool);
      return shuffled.slice(0, count);
    }

    // Build weighted pool
    const entries = [];
    pool.forEach(card => {
      const w = weights[card.id] || 1.0;
      if (w > 0) {
        entries.push({ card, weight: w });
      }
    });

    // Sort by weight descending for weighted selection
    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
    const drawn = [];
    const used = new Set();

    for (let i = 0; i < count && entries.length > 0; i++) {
      // Filter out used cards
      const available = entries.filter(e => !used.has(e.card.id));
      if (available.length === 0) break;

      const availableWeight = available.reduce((sum, e) => sum + e.weight, 0);
      let rand = Math.random() * availableWeight;
      
      for (const entry of available) {
        rand -= entry.weight;
        if (rand <= 0) {
          drawn.push({
            ...entry.card,
            isReversed: Math.random() < 0.3
          });
          used.add(entry.card.id);
          break;
        }
      }
    }

    return drawn;
  }

  // ─── UNIFORM DRAW ──────────────────────
  function uniformDraw(pool, count) {
    const shuffled = shuffle(pool);
    const drawn = [];
    const used = new Set();

    for (const card of shuffled) {
      if (drawn.length >= count) break;
      if (!used.has(card.id)) {
        drawn.push({
          ...card,
          isReversed: Math.random() < 0.3
        });
        used.add(card.id);
      }
    }

    return drawn;
  }

  // ─── DRAW ───────────────────────────────
  function draw(count = 3, options = {}) {
    const { mode = 'full', weights = null } = options;

    let pool;
    if (mode === 'major') {
      pool = getMajorDeck();
    } else if (['fire', 'water', 'earth', 'air'].includes(mode)) {
      pool = minorDeck.filter(card => 
        card.element && card.element.toLowerCase() === mode
      );
    } else {
      pool = getFullDeck();
    }

    if (pool.length === 0) {
      throw new Error(`No cards available for mode: ${mode}`);
    }

    if (weights && Object.keys(weights).length > 0) {
      return weightedDraw(pool, count, weights);
    }

    return uniformDraw(pool, count);
  }

  // ─── GET IMAGE ──────────────────────────
  function getImage(card) {
    if (IMAGE_MAP[card.id]) return IMAGE_MAP[card.id];
    if (card.image) return card.image;
    return null;
  }

  // ─── GET MEANING ────────────────────────
  function getMeaning(card) {
    if (card.isReversed) {
      return card.reversed || card.upright || '';
    }
    return card.upright || '';
  }

  // ─── ESCAPE HTML ────────────────────────
  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── RENDER CARD ────────────────────────
  function renderCard(card, position) {
    const imgPath = getImage(card);
    const elementClass = card.element ? `element-${card.element.toLowerCase()}` : '';
    const elementEmoji = ELEMENT_EMOJI[card.element] || ELEMENT_EMOJI[null];
    const meaning = getMeaning(card);
    const reversedMark = card.isReversed ? ' ⥮ Reversed' : '';
    const positionLabel = POSITION_LABELS[position] || position;
    
    let imgHTML;
    if (imgPath) {
      imgHTML = `<img src="${imgPath}" alt="${escapeHTML(card.name)}" 
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
        <div class="img-placeholder" style="display:none;">${elementEmoji}</div>`;
    } else {
      imgHTML = `<div class="img-placeholder">${elementEmoji}</div>`;
    }
    
    return `
      ${imgHTML}
      <div class="card-info">
        <div class="card-position">${positionLabel}${reversedMark}</div>
        <div class="card-name ${elementClass}">${escapeHTML(card.name)}</div>
        <div class="card-domain">${escapeHTML(card.domain || card.title || '')}</div>
        <div class="card-overlay">${escapeHTML(meaning)}</div>
      </div>
    `;
  }

  // ─── RENDER READING ─────────────────────
  function renderReading(reading) {
    const past = reading.cards?.past || reading.past;
    const present = reading.cards?.present || reading.present;
    const future = reading.cards?.future || reading.future;
    const question = reading.question || 'The unspoken question';
    const skyContext = reading.skyContext || {};

    // Sky context line
    let skyLine = '';
    if (skyContext.sunIn || skyContext.moonIn) {
      skyLine = `<div style="text-align:center;font-style:italic;color:var(--text-dim);margin-bottom:8px;font-size:13px;">
        ${skyContext.sunIn ? `☀️ Sun in ${skyContext.sunIn}` : ''}
        ${skyContext.sunIn && skyContext.moonIn ? ' · ' : ''}
        ${skyContext.moonIn ? `🌙 Moon in ${skyContext.moonIn} (${skyContext.moonPhase || ''})` : ''}
      </div>`;
    }

    // Synthesis
    const elements = [past.element, present.element, future.element].filter(Boolean);
    const uniqueElements = [...new Set(elements)];
    let synthesis = '';

    if (uniqueElements.length === 1) {
      synthesis = `${uniqueElements[0]} rules all three positions. The question is singular in nature.`;
    } else if (uniqueElements.length === 3) {
      synthesis = `Three elements cross the spread — ${elements.join(', ')}. The question touches multiple domains. Integration is the work ahead.`;
    } else if (uniqueElements.length === 2) {
      synthesis = `${elements[0]} and ${elements[1]} weave through the spread. Two forces in dialogue.`;
    }

    if (future.isReversed) {
      synthesis += ' The future card reversed suggests resistance to what comes.';
    }

    const pastDomain = past.domain || past.title || '';
    const futureDomain = future.domain || future.title || '';
    if (pastDomain && pastDomain === futureDomain) {
      synthesis += ` The domain of ${pastDomain} appears at both ends — a cycle completes.`;
    }

    return `
      <div class="reading-header">✦ The Reading ✦</div>
      ${skyLine}
      <div style="text-align:center;font-style:italic;color:var(--text-dim);margin-bottom:24px;font-size:14px;">
        Asked: "${escapeHTML(question)}"
      </div>
      
      <div class="reading-block">
        <div class="reading-position">Past · ${escapeHTML(past.name)}</div>
        <div class="reading-text">${escapeHTML(past.meaning || past.upright || '')}</div>
      </div>
      
      <div class="reading-block">
        <div class="reading-position">Present · ${escapeHTML(present.name)}</div>
        <div class="reading-text">${escapeHTML(present.meaning || present.upright || '')}</div>
      </div>
      
      <div class="reading-block">
        <div class="reading-position">Future · ${escapeHTML(future.name)}</div>
        <div class="reading-text">${escapeHTML(future.meaning || future.upright || '')}</div>
      </div>
      
      <div class="reading-synthesis">${synthesis}</div>
    `;
  }

  // ─── PUBLIC API ─────────────────────────
  return {
    // Deck management
    loadDecks,
    getMajorDeck,
    getMinorDeck,
    getFullDeck,
    isLoaded,
    
    // Drawing
    draw,
    uniformDraw,
    weightedDraw,
    
    // Rendering
    renderCard,
    renderReading,
    getImage,
    getMeaning,
    
    // Utility
    IMAGE_MAP,
    ELEMENT_EMOJI,
    POSITION_LABELS
  };
})();
