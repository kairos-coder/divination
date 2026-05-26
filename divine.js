/**
 * DIVINE.JS — Digital Divination Engine
 * Order of Olympus · kairos-coder.github.io/divination
 * Three-card spread: Past · Present · Future
 */

const Divine = (() => {
  // ─── STATE ──────────────────────────────
  let deckMode = 'major';
  let majorDeck = [];
  let minorDeck = [];
  let currentDraw = null;
  let decksLoaded = false;

  // ─── IMAGE PATH MAPPING ─────────────────
  const IMAGE_MAP = {
    'major_00': 'data/images/dionysus-card.jpg',
    'major_01': 'data/images/hermes-card.jpg',
    'major_02': 'data/images/hera-card.jpg',
    'major_03': 'data/images/demeter-card.jpg',
    'major_04': 'data/images/zeus-card.jpg',
    'major_05': 'data/images/ares-card.jpg',
    'major_06': 'data/images/aphrodite-card.jpg',
    'major_07': 'data/images/artemis-card.jpg',
    'major_08': 'data/images/athena-card.jpg',
    'major_09': 'data/images/hermit-card.jpg',
    'major_10': null,
    'major_11': 'data/images/hephaestus-card.jpg',
    'major_12': 'data/images/prometheus-card.jpg',
    'major_13': 'data/images/thanatos-card.jpg',
    'major_14': null,
    'major_15': 'data/images/hades-card.jpg',
    'major_16': 'data/images/poseidon-card.jpg',
    'major_17': 'data/images/persephone-card.jpg',
    'major_18': null,
    'major_19': null,
    'major_20': null,
    'major_21': null,
    'major_hidden': null
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
    if (deckMode === 'major') {
      pool = shuffle(majorDeck);
    } else {
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
        <div class="card-domain">${escapeHTML(card.domain || '')}</div>
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
    } else {
      synthesis += `${past.element || 'The first'} flows into ${present.element || 'the second'} and toward ${future.element || 'the third'}. The elements guide the arc. `;
    }
    
    // Domain patterns
    if (past.domain === present.domain) {
      synthesis += `The domain of ${past.domain} appears twice — this force has been with you and remains. `;
    }
    if (past.domain === future.domain) {
      synthesis += `What began in the domain of ${past.domain} returns at the end. A cycle completes. `;
    }
    if (present.domain === future.domain && past.domain !== present.domain) {
      synthesis += `The domain of ${present.domain} will persist from present into future. `;
    }
    
    // All same domain
    if (past.domain === present.domain && present.domain === future.domain) {
      synthesis += `The domain of ${past.domain} rules the entire spread. This is not a question — it is an initiation. `;
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
      
      if (majorDeck.length === 0) {
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
      
      // Remove previous flip state
      cardPast.classList.remove('flipped');
      cardPresent.classList.remove('flipped');
      cardFuture.classList.remove('flipped');
      
      // Trigger reflow for animation restart
      void cardPast.offsetWidth;
      
      setTimeout(() => cardPast.classList.add('flipped'), 100);
      setTimeout(() => cardPresent.classList.add('flipped'), 400);
      setTimeout(() => cardFuture.classList.add('flipped'), 700);
      
      // Show reading after flips
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
    
    // Clear fronts after flip animation completes
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
