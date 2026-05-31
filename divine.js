/**
 * DIVINE.JS — Digital Divination Engine
 * Order of Olympus · kairos-coder.github.io/divination
 * Three-card spread: Past · Present · Future
 * Suit-specific draws: Fire · Water · Earth · Air
 */

const Divine = (() => {
  // ─── STATE ──────────────────────────────
  let deckMode = 'major';
  let majorDeck = [];
  let minorDeck = [];
  let currentDraw = null;
  let decksLoaded = false;

 const IMAGE_MAP = {
  // Major Arcana (22 cards — all filled)
  'major_00': 'data/images/dionysus-card.jpg',        // The Fool
  'major_01': 'data/images/major/magician.png',       // The Magician
  'major_02': 'data/images/hera-card.jpg',            // The High Priestess
  'major_03': 'data/images/demeter-card.jpg',         // The Empress
  'major_04': 'data/images/zeus-card.jpg',            // The Emperor
  'major_05': 'data/images/ares-card.jpg',            // The Hierophant
  'major_06': 'data/images/aphrodite-card.jpg',       // The Lovers
  'major_07': 'data/images/artemis-card.jpg',         // The Chariot
  'major_08': 'data/images/athena-card.jpg',          // Justice
  'major_09': 'data/images/hermit-card.jpg',          // The Hermit
  'major_10': 'data/images/major/wheel_of_fortune.png', // Wheel of Fortune
  'major_11': 'data/images/hephaestus-card.jpg',      // Strength
  'major_12': 'data/images/prometheus-card.jpg',      // The Hanged Man
  'major_13': 'data/images/thanatos-card.jpg',        // Death
  'major_14': 'data/images/major/temperance.png',     // Temperance
  'major_15': 'data/images/hades-card.jpg',           // The Devil
  'major_16': 'data/images/poseidon-card.jpg',        // The Tower
  'major_17': 'data/images/persephone-card.jpg',      // The Star
  'major_18': 'data/images/major/moon.png',           // The Moon
  'major_19': 'data/images/major/sun.png',            // The Sun
  'major_20': 'data/images/major/judgment.png',       // Judgment
  'major_21': 'data/images/major/world.png',          // The World
  'major_hidden': null,                                // The Hidden (revealed when called)
  
  // Fire Suit (14 cards — all rendered)
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
};

  const ELEMENT_EMOJI = {
    'Fire': '🔥',
    'Earth': '🜃',
    'Water': '🌊',
    'Air': '💨',
    null: '✦'
  };

  const POSITION_LABELS = {
    past: 'The Past',
    present: 'The Present',
    future: 'The Future'
  };

  // ─── LOAD DECKS ─────────────────────────
  async function loadDecks() {
    if (decksLoaded) return;
    
    try {
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
      console.log(`Decks loaded: ${majorDeck.length} Major, ${minorDeck.length} Minor`);
    } catch (err) {
      console.error('Failed to load decks:', err);
      throw err;
    }
  }

  // ─── SHUFFLE ────────────────────────────
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ─── GET IMAGE PATH ─────────────────────
  function getImagePath(card) {
    if (IMAGE_MAP[card.id]) return IMAGE_MAP[card.id];
    if (card.image) return card.image;
    return null;
  }

  // ─── GET CARD MEANING ───────────────────
  function getMeaning(card) {
    if (card.isReversed) {
      return card.reversed || card.upright || '';
    }
    return card.upright || '';
  }

  // ─── DRAW ───────────────────────────────
  function drawCards() {
    let pool;
    
    // Suit-specific draws
    if (['fire', 'water', 'air', 'earth'].includes(deckMode)) {
      const suitCards = minorDeck.filter(card => 
        card.element && card.element.toLowerCase() === deckMode
      );
      if (suitCards.length === 0) {
        throw new Error(`No ${deckMode} suit cards available. Check minor_arcana.json.`);
      }
      pool = shuffle(suitCards);
    } else if (deckMode === 'major') {
      pool = shuffle(majorDeck);
    } else {
      // Full deck
      pool = shuffle([...majorDeck, ...minorDeck]);
    }
    
    if (pool.length === 0) {
      throw new Error('No cards available. Check deck data.');
    }
    
    const drawn = [];
    const used = new Set();
    
    for (const card of pool) {
      if (drawn.length >= 3) break;
      if (!used.has(card.id)) {
        drawn.push({
          ...card,
          isReversed: Math.random() < 0.3,
          position: null
        });
        used.add(card.id);
      }
    }
    
    // Handle edge case: if pool too small, fill with what we have
    while (drawn.length < 3) {
      const fallback = { ...pool[0], isReversed: false, position: null };
      drawn.push(fallback);
    }
    
    return {
      past: { ...drawn[0], position: 'past' },
      present: { ...drawn[1], position: 'present' },
      future: { ...drawn[2], position: 'future' }
    };
  }

  // ─── BUILD CARD FRONT HTML ──────────────
  function buildCardFront(card) {
    const imgPath = getImagePath(card);
    const elementClass = card.element ? `element-${card.element.toLowerCase()}` : '';
    const elementEmoji = ELEMENT_EMOJI[card.element] || ELEMENT_EMOJI[null];
    const meaning = getMeaning(card);
    const reversedMark = card.isReversed ? ' ⥮ Reversed' : '';
    
    let imgHTML;
    if (imgPath) {
      imgHTML = `<img src="${imgPath}" alt="${card.name}" 
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
        <div class="img-placeholder" style="display:none;">${elementEmoji}</div>`;
    } else {
      imgHTML = `<div class="img-placeholder">${elementEmoji}</div>`;
    }
    
    return `
      ${imgHTML}
      <div class="card-info">
        <div class="card-position">${POSITION_LABELS[card.position]}${reversedMark}</div>
        <div class="card-name ${elementClass}">${escapeHTML(card.name)}</div>
        <div class="card-domain">${escapeHTML(card.domain || card.title || '')}</div>
        <div class="card-overlay">${escapeHTML(meaning)}</div>
      </div>
    `;
  }

  // ─── BUILD READING ──────────────────────
  function buildReading(draw) {
    const question = document.getElementById('questionInput').value.trim() || 'The unspoken question';
    
    return `
      <div class="reading-header">✦ The Reading ✦</div>
      <div style="text-align:center;font-style:italic;color:var(--text-dim);margin-bottom:24px;font-size:14px;">
        Asked: "${escapeHTML(question)}"
      </div>
      
      <div class="reading-block">
        <div class="reading-position">Past · ${escapeHTML(draw.past.name)}</div>
        <div class="reading-text">${escapeHTML(getMeaning(draw.past))}</div>
      </div>
      
      <div class="reading-block">
        <div class="reading-position">Present · ${escapeHTML(draw.present.name)}</div>
        <div class="reading-text">${escapeHTML(getMeaning(draw.present))}</div>
      </div>
      
      <div class="reading-block">
        <div class="reading-position">Future · ${escapeHTML(draw.future.name)}</div>
        <div class="reading-text">${escapeHTML(getMeaning(draw.future))}</div>
      </div>
      
      <div class="reading-synthesis">
        ${generateSynthesis(draw)}
      </div>
    `;
  }

  // ─── SYNTHESIS ──────────────────────────
  function generateSynthesis(draw) {
    const past = draw.past;
    const present = draw.present;
    const future = draw.future;
    
    const elements = [past.element, present.element, future.element].filter(Boolean);
    const uniqueElements = [...new Set(elements)];
    
    let synthesis = '';
    
    // Suit-specific draws
    if (['fire', 'water', 'air', 'earth'].includes(deckMode)) {
      const suitName = deckMode.charAt(0).toUpperCase() + deckMode.slice(1);
      synthesis += `The ${suitName} suit speaks with a single voice. `;
    }
    
    // Reversed future
    if (future.isReversed) {
      synthesis += 'The path ahead is clouded — the card reversed suggests resistance to what comes. ';
    } else {
      synthesis += 'The cards speak clearly. ';
    }
    
    // Elemental pattern
    if (uniqueElements.length === 1) {
      synthesis += `The reading is dominated by ${uniqueElements[0]} — this element rules all three positions. The question is singular in nature. `;
    } else if (uniqueElements.length === 3) {
      synthesis += `Three elements cross the spread — ${elements.join(', ')}. The question touches multiple domains. Integration is the work ahead. `;
    } else if (uniqueElements.length === 2) {
      synthesis += `${elements[0]} and ${elements[1]} weave through the spread. Two forces in dialogue. `;
    } else {
      synthesis += 'The elements guide the arc. ';
    }
    
    // Domain patterns
    const pastDomain = past.domain || past.title || '';
    const presentDomain = present.domain || present.title || '';
    const futureDomain = future.domain || future.title || '';
    
    if (pastDomain && pastDomain === presentDomain) {
      synthesis += `The domain of ${pastDomain} appears twice — this force has been with you and remains. `;
    }
    if (pastDomain && pastDomain === futureDomain) {
      synthesis += `What began in the domain of ${pastDomain} returns at the end. A cycle completes. `;
    }
    if (presentDomain && futureDomain && presentDomain === futureDomain && pastDomain !== presentDomain) {
      synthesis += `The domain of ${presentDomain} will persist from present into future. `;
    }
    if (pastDomain && pastDomain === presentDomain && presentDomain === futureDomain) {
      synthesis += `The domain of ${pastDomain} rules the entire spread. This is not a question — it is an initiation. `;
    }
    
    // Reversed count
    const reversedCount = [past, present, future].filter(c => c.isReversed).length;
    if (reversedCount === 3) {
      synthesis += 'All three cards reversed — the querent is in resistance to something fundamental. ';
    } else if (reversedCount === 2) {
      synthesis += 'Two cards reversed suggest inner conflict blocking the outward path. ';
    }
    
    synthesis += 'The three cards form a triptych. Past, present, future — not separate, but a single image split across time. Read them as one.';
    
    return synthesis;
  }

  // ─── ESCAPE HTML ────────────────────────
  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── REVEAL ─────────────────────────────
  async function reveal() {
    const btn = document.getElementById('revealBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Shuffling...';
    
    try {
      await loadDecks();
      
      if (majorDeck.length === 0 && deckMode !== 'fire' && deckMode !== 'water' && deckMode !== 'air' && deckMode !== 'earth') {
        throw new Error('No Major Arcana cards loaded. Check data/deck/major_arcana.json');
      }
      
      currentDraw = drawCards();
      
      // Build card fronts
      document.getElementById('frontPast').innerHTML = buildCardFront(currentDraw.past);
      document.getElementById('frontPresent').innerHTML = buildCardFront(currentDraw.present);
      document.getElementById('frontFuture').innerHTML = buildCardFront(currentDraw.future);
      
      // Flip cards with stagger
      const cardPast = document.getElementById('cardPast');
      const cardPresent = document.getElementById('cardPresent');
      const cardFuture = document.getElementById('cardFuture');
      
      cardPast.classList.remove('flipped');
      cardPresent.classList.remove('flipped');
      cardFuture.classList.remove('flipped');
      
      void cardPast.offsetWidth;
      
      setTimeout(() => cardPast.classList.add('flipped'), 100);
      setTimeout(() => cardPresent.classList.add('flipped'), 400);
      setTimeout(() => cardFuture.classList.add('flipped'), 700);
      
      setTimeout(() => {
        const readingArea = document.getElementById('readingArea');
        readingArea.innerHTML = buildReading(currentDraw);
        readingArea.classList.add('visible');
        readingArea.scrollIntoView({ behavior: 'smooth' });
        btn.textContent = originalText;
        btn.disabled = false;
      }, 1200);
      
    } catch (err) {
      console.error('Reveal failed:', err);
      btn.textContent = 'Error — Check Console';
      btn.disabled = false;
    }
  }

  // ─── RESET ──────────────────────────────
  function reset() {
    currentDraw = null;
    
    const cardPast = document.getElementById('cardPast');
    const cardPresent = document.getElementById('cardPresent');
    const cardFuture = document.getElementById('cardFuture');
    
    cardPast.classList.remove('flipped');
    cardPresent.classList.remove('flipped');
    cardFuture.classList.remove('flipped');
    
    document.getElementById('readingArea').classList.remove('visible');
    document.getElementById('readingArea').innerHTML = '';
    document.getElementById('questionInput').value = '';
    document.getElementById('revealBtn').disabled = false;
    document.getElementById('revealBtn').textContent = '▸ Reveal';
    
    setTimeout(() => {
      document.getElementById('frontPast').innerHTML = '';
      document.getElementById('frontPresent').innerHTML = '';
      document.getElementById('frontFuture').innerHTML = '';
    }, 400);
  }

  // ─── SET DECK ───────────────────────────
  function setDeck(mode) {
    deckMode = mode;
    document.querySelectorAll('.deck-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.deck === mode);
    });
    reset();
  }

  // ─── PRELOAD ────────────────────────────
  async function preloadDecks() {
    try {
      await loadDecks();
      console.log('Decks preloaded successfully.');
    } catch (err) {
      console.warn('Deck preload failed. Will retry on reveal:', err.message);
    }
  }

  // ─── PUBLIC API ─────────────────────────
  return {
    reveal,
    reset,
    setDeck,
    getDraw: () => currentDraw,
    preload: preloadDecks
  };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => {
  Divine.preload();
});
