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
    'earth_ace':   'data/images/minor/earth/earth_ace.png',
    'earth_02':    'data/images/minor/earth/earth_02.png',
    'earth_03':    'data/images/minor/earth/earth_03.png',
    'earth_04':    'data/images/minor/earth/earth_04.png',
    'earth_05':    'data/images/minor/earth/earth_05.png',
    'earth_06':    'data/images/minor/earth/earth_06.png',
    'earth_07':    'data/images/minor/earth/earth_07.png',
    'earth_08':    'data/images/minor/earth/earth_08.png',
    'earth_09':    'data/images/minor/earth/earth_09.png',
    'earth_10':    'data/images/minor/earth/earth_10.png',
    'earth_page':  'data/images/minor/earth/earth_page.png',
    'earth_knight':'data/images/minor/earth/earth_knight.png',
    'earth_queen': 'data/images/minor/earth/earth_queen.png',
    'earth_king':  'data/images/minor/earth/earth_king.png',
    'water_ace':   'data/images/minor/water/water_ace.png',
    'water_02':    'data/images/minor/water/water_02.png',
    'water_03':    'data/images/minor/water/water_03.png',
    'water_04':    'data/images/minor/water/water_04.png',
    'water_05':    'data/images/minor/water/water_05.png',
    'water_06':    'data/images/minor/water/water_06.png',
    'water_07':    'data/images/minor/water/water_07.png',
    'water_08':    'data/images/minor/water/water_08.png',
    'water_09':    'data/images/minor/water/water_09.png',
    'water_10':    'data/images/minor/water/water_10.png',
    'water_page':  'data/images/minor/water/water_page.png',
    'water_knight':'data/images/minor/water/water_knight.png',
    'water_queen': 'data/images/minor/water/water_queen.png',
    'water_king':  'data/images/minor/water/water_king.png',
    'air_ace':     'data/images/minor/air/air_ace.png',
    'air_02':      'data/images/minor/air/air_02.png',
    'air_03':      'data/images/minor/air/air_03.png',
    'air_04':      'data/images/minor/air/air_04.png',
    'air_05':      'data/images/minor/air/air_05.png',
    'air_06':      'data/images/minor/air/air_06.png',
    'air_07':      'data/images/minor/air/air_07.png',
    'air_08':      'data/images/minor/air/air_08.png',
    'air_09':      'data/images/minor/air/air_09.png',
    'air_10':      'data/images/minor/air/air_10.png',
    'air_page':    'data/images/minor/air/air_page.png',
    'air_knight':  'data/images/minor/air/air_knight.png',
    'air_queen':   'data/images/minor/air/air_queen.png',
    'air_king':    'data/images/minor/air/air_king.png'
  };

  const ELEMENT_EMOJI = {
    'Fire': '🔥', 'Earth': '🜃', 'Water': '🌊', 'Air': '💨',
    'Primal': '✦', null: '✦'
  };

  const POSITION_LABELS = {
    past: 'The Past',
    present: 'The Present',
    future: 'The Future'
  };

  // ─── UNSUITED MAJORS ────────────────────
  // Cards with element: null that transcend elemental classification.
  // Tagged 'Primal' so synthesis can handle them distinctly.
  const PRIMAL_MAJORS = new Set([
    'major_09', 'major_10', 'major_12', 'major_13', 'major_14',
    'major_15', 'major_17', 'major_18', 'major_20', 'major_21'
  ]);

  // ─── KEYWORD THEMES ─────────────────────
  // Each theme maps to a set of keywords to scan across cards.
  // When a theme appears in 2+ cards, it surfaces in deep synthesis.
  const THEMES = {
    veil:       { words: ['veil', 'hidden', 'mystery', 'unseen', 'behind', 'secret', 'covenant'],
                  voice: 'The veil appears more than once in this spread. What is being kept — and by whom — is the real question.' },
    threshold:  { words: ['threshold', 'gate', 'crossing', 'between', 'liminal', 'doorkeeper', 'crossroad', 'in-between'],
                  voice: 'The threshold appears more than once. You are not yet through the door. That is not failure — that is the work.' },
    wound:      { words: ['wound', 'grief', 'loss', 'pain', 'mourning', 'sacrifice', 'suffering', 'poisoned'],
                  voice: 'Wound runs through this spread. Something has been paid for. The question is whether the debt is yours or one you inherited.' },
    cycle:      { words: ['cycle', 'return', 'again', 'spinning', 'wheel', 'season', 'rebirth', 'completion'],
                  voice: 'The cycle is moving through this spread. You have been here before. The question is whether you recognize it this time.' },
    fire_motif: { words: ['burn', 'forge', 'flame', 'spark', 'ignite', 'eruption', 'ash', 'ember', 'volcano'],
                  voice: 'Fire moves through this spread beyond the suit. Something is burning or wants to. Let it finish.' },
    shadow:     { words: ['shadow', 'darkness', 'underworld', 'hades', 'below', 'depth', 'buried', 'hidden wealth', 'ghost'],
                  voice: 'The shadow runs beneath all three cards. What is underground is not dead — it is waiting.' },
    madness:    { words: ['madness', 'half-mad', 'spiral', 'doomscroll', '3am', 'haunting', 'ghost', 'illusion', 'deception'],
                  voice: 'The mind under pressure appears in more than one position. Not all of what you are seeing is false. But not all of it is true.' },
    sovereignty:{ words: ['sovereignty', 'authority', 'throne', 'command', 'queen', 'king', 'rule', 'judgment', 'order'],
                  voice: 'Authority appears more than once. The question is not whether you have power — it is whether you are using it.' },
    messenger:  { words: ['messenger', 'message', 'conduit', 'courier', 'translation', 'leak', 'word', 'writing', 'record'],
                  voice: 'Something is trying to be communicated across this spread. The message is not lost. It may simply not have arrived yet.' },
    trickster:  { words: ['trickster', 'trick', 'deception', 'shape-shifter', 'coyote', 'loki', 'anansi', 'mockery', 'satire'],
                  voice: 'The trickster moves through more than one card. Not everything is what it appears. That may be a warning — or an invitation.' },
    harvest:    { words: ['harvest', 'seed', 'grow', 'plant', 'abundance', 'maize', 'grain', 'field', 'cultivated'],
                  voice: 'The harvest appears in more than one position. Something is ready. The question is whether you will gather it.' },
    water_motif:{ words: ['sea', 'ocean', 'river', 'depth', 'drown', 'tide', 'harbor', 'wave', 'flood'],
                  voice: 'Water moves through this spread beyond the suit. Something runs deeper than it appears on the surface.' }
  };

  // ─── RANK REGISTRY ──────────────────────
  const MAJOR_RANKS = new Set(['0','1','2','3','4','5','6','7','8','9',
    '10','11','12','13','14','15','16','17','18','19','20','21','hidden']);
  const COURT_RANKS = new Set(['page','knight','queen','king']);
  const NUMBERED_RANKS = new Set(['ace','two','three','four','five','six',
    'seven','eight','nine','ten']);

  function getRankType(card) {
    const r = (card.rank || '').toString().toLowerCase();
    if (MAJOR_RANKS.has(r)) return 'major';
    if (COURT_RANKS.has(r))  return 'court';
    if (NUMBERED_RANKS.has(r)) return 'numbered';
    return 'unknown';
  }

  // ─── ELEMENT RESOLUTION ─────────────────
  // Resolves element for unsuited Majors.
  // Returns the card's element, 'Primal' for unsuited Majors, or null.
  function resolveElement(card) {
    if (card.element) return card.element;
    if (PRIMAL_MAJORS.has(card.id)) return 'Primal';
    return null;
  }

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
  function getFullDeck()  { return [...majorDeck, ...minorDeck]; }
  function isLoaded()     { return decksLoaded; }

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
      return shuffle(pool).slice(0, count);
    }

    const entries = [];
    pool.forEach(card => {
      const w = weights[card.id] || 1.0;
      if (w > 0) entries.push({ card, weight: w });
    });

    const drawn = [];
    const used  = new Set();

    for (let i = 0; i < count && entries.length > 0; i++) {
      const available = entries.filter(e => !used.has(e.card.id));
      if (available.length === 0) break;

      const totalWeight = available.reduce((s, e) => s + e.weight, 0);
      let rand = Math.random() * totalWeight;

      for (const entry of available) {
        rand -= entry.weight;
        if (rand <= 0) {
          drawn.push({ ...entry.card, isReversed: Math.random() < 0.3 });
          used.add(entry.card.id);
          break;
        }
      }
    }

    return drawn;
  }

  // ─── UNIFORM DRAW ───────────────────────
  function uniformDraw(pool, count) {
    const shuffled = shuffle(pool);
    const drawn = [];
    const used  = new Set();

    for (const card of shuffled) {
      if (drawn.length >= count) break;
      if (!used.has(card.id)) {
        drawn.push({ ...card, isReversed: Math.random() < 0.3 });
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
      pool = minorDeck.filter(c =>
        c.element && c.element.toLowerCase() === mode
      );
    } else {
      pool = getFullDeck();
    }

    if (pool.length === 0) throw new Error(`No cards available for mode: ${mode}`);

    return (weights && Object.keys(weights).length > 0)
      ? weightedDraw(pool, count, weights)
      : uniformDraw(pool, count);
  }

  // ─── GET IMAGE ──────────────────────────
  function getImage(card) {
    if (IMAGE_MAP[card.id]) return IMAGE_MAP[card.id];
    if (card.image) return card.image;
    return null;
  }

  // ─── GET MEANING ────────────────────────
  function getMeaning(card) {
    return card.isReversed
      ? (card.reversed || card.upright || '')
      : (card.upright  || '');
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
    const imgPath      = getImage(card);
    const element      = resolveElement(card);
    const elementClass = element ? `element-${element.toLowerCase()}` : '';
    const elementEmoji = ELEMENT_EMOJI[element] || ELEMENT_EMOJI[null];
    const meaning      = getMeaning(card);
    const reversedMark = card.isReversed ? ' ⥮ Reversed' : '';
    const posLabel     = POSITION_LABELS[position] || position;

    const imgHTML = imgPath
      ? `<img src="${imgPath}" alt="${escapeHTML(card.name)}"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
         <div class="img-placeholder" style="display:none;">${elementEmoji}</div>`
      : `<div class="img-placeholder">${elementEmoji}</div>`;

    return `
      ${imgHTML}
      <div class="card-info">
        <div class="card-position">${posLabel}${reversedMark}</div>
        <div class="card-name ${elementClass}">${escapeHTML(card.name)}</div>
        <div class="card-domain">${escapeHTML(card.domain || card.title || '')}</div>
        <div class="card-overlay">${escapeHTML(meaning)}</div>
      </div>
    `;
  }

  // ─── DETECT THEMES ──────────────────────
  // Scans keywords across all three cards.
  // Returns array of theme voices for themes appearing in 2+ cards.
  function detectThemes(cards) {
    const hits = [];

    for (const [, theme] of Object.entries(THEMES)) {
      let matchCount = 0;

      for (const card of cards) {
        const keywords = (card.keywords || []).map(k => k.toLowerCase());
        const meaning  = (getMeaning(card) || '').toLowerCase();
        const combined = keywords.join(' ') + ' ' + meaning;

        const matched = theme.words.some(w => combined.includes(w));
        if (matched) matchCount++;
      }

      if (matchCount >= 2) hits.push(theme.voice);
    }

    return hits;
  }

  // ─── RANK PORTRAIT ──────────────────────
  // Returns a synthesis note based on the rank pattern across the spread.
  function rankPortrait(past, present, future) {
    const types = [past, present, future].map(getRankType);
    const majorCount   = types.filter(t => t === 'major').length;
    const courtCount   = types.filter(t => t === 'court').length;
    const numberedCount= types.filter(t => t === 'numbered').length;

    if (majorCount === 3) {
      return 'Three archetypes preside over this reading. The forces at work are larger than circumstance. You are inside something mythic.';
    }
    if (majorCount === 0 && courtCount === 0) {
      return 'Three numbered cards. No archetypes, no courts — only situation. The work is immediate and practical. Do the next thing.';
    }
    if (majorCount === 2) {
      return 'Two Major Arcana anchor this spread. The personal is not separate from the archetypal here — what you are living has a larger shape.';
    }
    if (courtCount === 3) {
      return 'Three court figures. This reading is about people — who holds power, who carries the fire, who stands at the gate. Look at the players, not just the situation.';
    }
    if (courtCount === 2) {
      return 'Two court figures and a situation card. The dynamics between people shape the outcome more than circumstance.';
    }
    if (types[0] === 'major' && types[2] === 'numbered') {
      return 'The past speaks with an archetype\'s voice. The future answers in the practical. The mythic is giving way to the immediate.';
    }
    if (types[0] === 'numbered' && types[2] === 'major') {
      return 'A practical past moves toward an archetypal future. The situation is becoming something larger than itself.';
    }
    if (types[1] === 'major') {
      return 'The Major Arcana holds the center. Whatever surrounds it, the present moment carries the weight of something larger.';
    }

    return '';
  }

  // ─── BUILD ELEMENT SYNTHESIS ────────────
  // Handles element logic with Primal awareness.
  function buildElementSynthesis(past, present, future) {
    const elements = [past, present, future].map(resolveElement);
    const elemental = elements.filter(e => e && e !== 'Primal');
    const primalCount = elements.filter(e => e === 'Primal').length;
    const unique = [...new Set(elemental)];

    // All three are Primal (unsuited Majors)
    if (primalCount === 3) {
      return 'Three Primal cards — no element holds this spread. The question has moved beyond the elemental. The forces here answer to nothing but themselves.';
    }

    // Two or more Primals with one elemental
    if (primalCount >= 2) {
      const el = elemental[0] || '';
      return `${el ? el + ' touches this spread, but ' : ''}two Primal forces surround it. The elemental is not in control here.`;
    }

    // One Primal among the three
    if (primalCount === 1) {
      if (unique.length === 1) {
        return `${unique[0]} runs through two positions, but a Primal force interrupts the line. The pattern is present — something else is also present.`;
      }
      return `${unique.join(' and ')} move through this spread alongside a force that belongs to no element. The reading does not resolve cleanly. That is information.`;
    }

    // Standard element logic — no Primals
    if (unique.length === 1) {
      return `${unique[0]} holds all three positions. Past, present, and future speak in one voice. The path is not hidden — the question is whether you are ready to walk it.`;
    }
    if (unique.length === 3) {
      return `${elemental[0]}, ${elemental[1]}, ${elemental[2]} — three elements cross the spread. Nothing here is simple. The work is not to resolve the tension — but to let it carry you through.`;
    }
    if (unique.length === 2) {
      return `${elemental[0]} opens the spread. ${elemental[1]} answers it. Two forces — not opposed, but in conversation. Listen for what they are negotiating — and what they are asking you to negotiate.`;
    }

    return '';
  }

  // ─── BUILD TITLE VOICE ──────────────────
  // Surfaces the mythological figures by name when notable patterns exist.
  function buildTitleVoice(past, present, future) {
    const cards = [past, present, future];
    const titled = cards.filter(c => c.title && c.title !== 'Unknown');

    // Check for same culture appearing twice
    const cultures = cards.map(c => c.culture).filter(Boolean);
    const cultureCounts = {};
    cultures.forEach(c => { cultureCounts[c] = (cultureCounts[c] || 0) + 1; });
    const sharedCulture = Object.entries(cultureCounts).find(([, v]) => v >= 2);

    // Check for same ruling_god appearing across cards
    const gods = cards.map(c => c.ruling_god).filter(Boolean);
    const godCounts = {};
    gods.forEach(g => { godCounts[g] = (godCounts[g] || 0) + 1; });
    const sharedGod = Object.entries(godCounts).find(([, v]) => v >= 2);

    const lines = [];

    if (sharedGod) {
      lines.push(`${sharedGod[0]}'s influence runs through more than one position in this spread.`);
    }

    if (sharedCulture && !sharedGod) {
      lines.push(`The ${sharedCulture[0]} current moves through more than one card here.`);
    }

    // Surface the three figures by name if all are titled
    if (titled.length === 3) {
      const names = titled.map(c => c.title);
      lines.push(`${names[0]} in the past. ${names[1]} in the present. ${names[2]} in the future. Read the myth — it already knows the answer.`);
    } else if (titled.length === 2) {
      const [a, b] = titled;
      lines.push(`${a.title} and ${b.title} both speak in this reading.`);
    }

    return lines.join(' ');
  }

  // ─── BUILD REVERSAL VOICE ───────────────
  function buildReversalVoice(past, present, future) {
    const reversals = [past, present, future].filter(c => c.isReversed);
    const count = reversals.length;

    if (count === 0) return '';
    if (count === 3) return 'All three cards arrive reversed. The spread is not blocked — it is asking you to approach everything differently than you planned.';
    if (count === 2) {
      const upright = [past, present, future].find(c => !c.isReversed);
      const pos = upright === past ? 'the past' : upright === present ? 'the present' : 'the future';
      return `Two reversals in this spread. Only ${pos} speaks without resistance.`;
    }
    if (future.isReversed) {
      return 'The future arrives reversed — not blocked, but asking to be met on its own terms, not yours.';
    }
    if (present.isReversed) {
      return 'The present card reversed. The current moment resists easy reading. Move carefully.';
    }
    if (past.isReversed) {
      return 'The past arrives reversed — what came before is not fully resolved. It is still moving.';
    }

    return '';
  }

  // ─── BUILD DOMAIN CYCLE ─────────────────
  function buildDomainCycle(past, future) {
    const pastDomain   = past.domain   || past.title   || '';
    const futureDomain = future.domain || future.title || '';
    if (pastDomain && pastDomain === futureDomain) {
      return `${pastDomain} appears at both ends. What began here returns. The cycle is not finished with you yet — and that is not a failure. It is an invitation.`;
    }
    return '';
  }

  // ─── BUILD SYNTHESIS ────────────────────
  // Assembles all synthesis layers into a structured output.
  // Returns { structural, deep } — two separate blocks for rendering.
  function buildSynthesis(past, present, future) {
    // Layer 1: Element + rank (structural read)
    const elementLine  = buildElementSynthesis(past, present, future);
    const rankLine     = rankPortrait(past, present, future);
    const reversalLine = buildReversalVoice(past, present, future);
    const domainLine   = buildDomainCycle(past, future);

    const structural = [elementLine, reversalLine, domainLine]
      .filter(Boolean)
      .join(' ');

    // Layer 2: Theme + title voice (deep read)
    const themeLines  = detectThemes([past, present, future]);
    const titleLine   = buildTitleVoice(past, present, future);

    const deepParts = [...themeLines];
    if (rankLine)  deepParts.push(rankLine);
    if (titleLine) deepParts.push(titleLine);

    const deep = deepParts.filter(Boolean).join(' ');

    return { structural, deep };
  }

  // ─── BUILD SKY LINE ─────────────────────
  function buildSkyLine(skyContext) {
    if (!skyContext || (!skyContext.sunIn && !skyContext.moonIn)) return '';
    const sun  = skyContext.sunIn  ? `☀️ Sun in ${skyContext.sunIn}`  : '';
    const moon = skyContext.moonIn
      ? `🌙 Moon in ${skyContext.moonIn}${skyContext.moonPhase ? ` (${skyContext.moonPhase})` : ''}`
      : '';
    return `<div class="sky-line">${[sun, moon].filter(Boolean).join(' · ')}</div>`;
  }

  // ─── RENDER READING ─────────────────────
  function renderReading(reading) {
    const past     = reading.cards?.past    || reading.past;
    const present  = reading.cards?.present || reading.present;
    const future   = reading.cards?.future  || reading.future;
    const question    = reading.question    || 'The unspoken question';
    const skyContext  = reading.skyContext   || {};

    const skyLine = buildSkyLine(skyContext);
    const { structural, deep } = buildSynthesis(past, present, future);

    const deepBlock = deep
      ? `<div class="reading-synthesis reading-synthesis--deep">✦<br>${escapeHTML(deep)}</div>`
      : '';

    return `
      <div class="reading-header">✦ The Reading ✦</div>
      ${skyLine}
      <div class="reading-question">Asked: "${escapeHTML(question)}"</div>

      <div class="reading-block">
        <div class="reading-position">Past · ${escapeHTML(past.name)}</div>
        <div class="reading-text">${escapeHTML(getMeaning(past))}</div>
      </div>

      <div class="reading-block">
        <div class="reading-position">Present · ${escapeHTML(present.name)}</div>
        <div class="reading-text">${escapeHTML(getMeaning(present))}</div>
      </div>

      <div class="reading-block">
        <div class="reading-position">Future · ${escapeHTML(future.name)}</div>
        <div class="reading-text">${escapeHTML(getMeaning(future))}</div>
      </div>

      <div class="reading-synthesis">${escapeHTML(structural)}</div>
      ${deepBlock}
    `;
  }

  // ─── PUBLIC API ─────────────────────────
  return {
    loadDecks,
    getMajorDeck,
    getMinorDeck,
    getFullDeck,
    isLoaded,
    draw,
    uniformDraw,
    weightedDraw,
    renderCard,
    renderReading,
    getImage,
    getMeaning,
    resolveElement,
    buildSynthesis,
    detectThemes,
    IMAGE_MAP,
    ELEMENT_EMOJI,
    POSITION_LABELS,
    THEMES
  };

})();
