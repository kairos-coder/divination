/**
 * DIVINE.JS — Digital Divination Engine
 * Order of Olympus · kairos-coder.github.io/divination
 * Three-card spread: Past · Present · Future
 */

const Divine = (() => {
  // ─── STATE ──────────────────────────────
  let deckMode = 'major';  // 'major' | 'full'
  let majorDeck = [];
  let minorDeck = [];
  let currentDraw = null;
  let decksLoaded = false;

  // ─── IMAGE PATH MAPPING ─────────────────
  // Maps JSON card IDs to your actual filenames
  const IMAGE_MAP = {
    'major_00': 'data/images/dionysus-card.jpg',
    'major_01': null,  // Hermes — not yet generated
    'major_02': 'data/images/hera-card.jpg',
    'major_03': 'data/images/demeter-card.jpg',
    'major_04': 'data/images/zeus-card.jpg',
    'major_05': 'data/images/ares-card.jpg',
    'major_06': 'data/images/aphrodite-card.jpg',
    'major_07': 'data/images/artemis-card.jpg',
    'major_08': 'data/images/athena-card.jpg',
    'major_09': 'data/images/hermit-card.jpg',
    'major_10': null,  // The Fates
    'major_11': null,  // Hephaestus
    'major_12': null,  // Prometheus
    'major_13': null,  // Thanatos
    'major_14': null,  // Hestia
    'major_15': null,  // Hades
    'major_16': null,  // Poseidon
    'major_17': null,  // Persephone
    'major_18': null,  // Melinoe
    'major_19': null,  // Apollo
    'major_20': null,  // The Three Judges
    'major_21': null,  // Gaia
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
      const majorData = await majorRes.json();
      const minorData = await minorRes.json();
      
      majorDeck = majorData.cards || [];
      
      // Flatten minor cards
      minorDeck = [];
      if (minorData.cards) {
        Object.values(minorData.cards).forEach(suitCards => {
          minorDeck.push(...suitCards);
        });
      }
      
      decksLoaded = true;
    } catch (err) {
      console.error('Failed to load decks:', err);
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

  // ─── DRAW ───────────────────────────────
  function drawCards() {
    let pool;
    if (deckMode === 'major') {
      pool = shuffle(majorDeck);
    } else {
      pool = shuffle([...majorDeck, ...minorDeck]);
    }
    
    // Draw 3, ensure no duplicates
    const drawn = [];
    const used = new Set();
    for (const card of pool) {
      if (drawn.length >= 3) break;
      if (!used.has(card.id)) {
        drawn.push(card);
        used.add(card.id);
      }
    }
    
    // Assign positions
    return {
      past: { ...drawn[0], position: 'past', reversed: Math.random() < 0.3 },
      present: { ...drawn[1], position: 'present', reversed: Math.random() < 0.3 },
      future: { ...drawn[2], position: 'future', reversed: Math.random() < 0.3 }
    };
  }

  // ─── BUILD CARD FRONT HTML ──────────────
  function buildCardFront(card) {
    const imgPath = getImagePath(card);
    const elementClass = card.element ? `element-${card.element.toLowerCase()}` : '';
    const elementEmoji = ELEMENT_EMOJI[card.element] || '';
    
    let imgHTML;
    if (imgPath) {
      imgHTML = `<img src="${imgPath}" alt="${card.name}" onerror="this.parentElement.innerHTML='<div class=\\'img-placeholder\\'>${elementEmoji}</div>'">`;
    } else {
      imgHTML = `<div class="img-placeholder">${elementEmoji}</div>`;
    }
    
    const meaning = card.reversed ? card.reversed : card.upright;
    const reversedMark = card.reversed ? ' ⥮ Reversed' : '';
    
    return `
      ${imgHTML}
      <div class="card-info">
        <div class="card-position">${POSITION_LABELS[card.position]}${reversedMark}</div>
        <div class="card-name ${elementClass}">${card.name}</div>
        <div class="card-domain">${card.domain || ''}</div>
        <div class="card-overlay">${meaning || ''}</div>
      </div>
    `;
  }

  // ─── BUILD READING ──────────────────────
  function buildReading(draw) {
    const question = document.getElementById('questionInput').value || 'The unspoken question';
    
    return `
      <div class="reading-header">✦ The Reading ✦</div>
      <div style="text-align:center;font-style:italic;color:var(--text-dim);margin-bottom:24px;font-size:14px;">
        Asked: "${question}"
      </div>
      
      <div class="reading-block">
        <div class="reading-position">Past · ${draw.past.name}</div>
        <div class="reading-text">${draw.past.reversed ? draw.past.reversed : draw.past.upright}</div>
      </div>
      
      <div class="reading-block">
        <div class="reading-position">Present · ${draw.present.name}</div>
        <div class="reading-text">${draw.present.reversed ? draw.present.reversed : draw.present.upright}</div>
      </div>
      
      <div class="reading-block">
        <div class="reading-position">Future · ${draw.future.name}</div>
        <div class="reading-text">${draw.future.reversed ? draw.future.reversed : draw.future.upright}</div>
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
    
    // Elemental reading
    const elements = [past.element, present.element, future.element].filter(Boolean);
    const uniqueElements = [...new Set(elements)];
    
    let synthesis = '';
    
    if (future.reversed) {
      synthesis += 'The path ahead is clouded — the card reversed suggests resistance to what comes. ';
    } else {
      synthesis += 'The cards speak clearly. ';
    }
    
    if (uniqueElements.length === 1) {
      synthesis += `The reading is dominated by ${uniqueElements[0]} — this element rules all three positions. The question is singular in nature. `;
    } else if (uniqueElements.length === 3) {
      synthesis += `Three elements cross the spread — ${elements.join(', ')}. The question touches multiple domains. Integration is the work ahead. `;
    } else {
      synthesis += `${past.element || 'The first'} flows into ${present.element || 'the second'} and toward ${future.element || 'the third'}. The elements guide the arc. `;
    }
    
    if (past.domain === present.domain) {
      synthesis += `The domain of ${past.domain} appears twice — this force has been with you and remains. `;
    }
    
    if (past.domain === future.domain) {
      synthesis += `What began in the domain of ${past.domain} returns at the end. A cycle completes. `;
    }
    
    synthesis += 'The three cards form a triptych. Past, present, future — not separate, but a single image split across time. Read them as one.';
    
    return synthesis;
  }

  // ─── REVEAL ─────────────────────────────
  async function reveal() {
    const btn = document.getElementById('revealBtn');
    btn.disabled = true;
    btn.textContent = 'Shuffling...';
    
    await loadDecks();
    
    if (majorDeck.length === 0) {
      btn.textContent = 'Error — Check Console';
      btn.disabled = false;
      console.error('No cards loaded. Check data/deck/major_arcana.json');
      return;
    }
    
    currentDraw = drawCards();
    
    // Build card fronts
    document.getElementById('frontPast').innerHTML = buildCardFront(currentDraw.past);
    document.getElementById('frontPresent').innerHTML = buildCardFront(currentDraw.present);
    document.getElementById('frontFuture').innerHTML = buildCardFront(currentDraw.future);
    
    // Flip cards with stagger
    setTimeout(() => document.getElementById('cardPast').classList.add('flipped'), 100);
    setTimeout(() => document.getElementById('cardPresent').classList.add('flipped'), 400);
    setTimeout(() => document.getElementById('cardFuture').classList.add('flipped'), 700);
    
    // Show reading after flips complete
    setTimeout(() => {
      const readingArea = document.getElementById('readingArea');
      readingArea.innerHTML = buildReading(currentDraw);
      readingArea.classList.add('visible');
      readingArea.scrollIntoView({ behavior: 'smooth' });
      btn.textContent = '▸ Reveal';
      btn.disabled = false;
    }, 1200);
  }

  // ─── RESET ──────────────────────────────
  function reset() {
    currentDraw = null;
    document.getElementById('cardPast').classList.remove('flipped');
    document.getElementById('cardPresent').classList.remove('flipped');
    document.getElementById('cardFuture').classList.remove('flipped');
    document.getElementById('readingArea').classList.remove('visible');
    document.getElementById('readingArea').innerHTML = '';
    document.getElementById('questionInput').value = '';
    document.getElementById('revealBtn').disabled = false;
    
    // Clear fronts after flip animation
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

  // ─── PUBLIC API ─────────────────────────
  return {
    reveal,
    reset,
    setDeck,
    getDraw: () => currentDraw
  };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => {
  // Preload decks
  Divine.loadDecks = (async () => {
    try {
      const [majorRes, minorRes] = await Promise.all([
        fetch('data/deck/major_arcana.json'),
        fetch('data/deck/minor_arcana.json')
      ]);
      const majorData = await majorRes.json();
      const minorData = await minorRes.json();
      // Store in closure — we'll fix the Divine reference
      window._majorDeck = majorData.cards || [];
      window._minorDeck = [];
      if (minorData.cards) {
        Object.values(minorData.cards).forEach(suitCards => {
          window._minorDeck.push(...suitCards);
        });
      }
      // Override loadDecks to use cached
      Divine.loadDecks = async () => {
        if (!Divine._decksReady) {
          Divine._majorDeck = window._majorDeck;
          Divine._minorDeck = window._minorDeck;
          Divine._decksReady = true;
        }
      };
    } catch(e) {
      console.error('Preload failed, will retry on reveal:', e);
    }
  })();
});
