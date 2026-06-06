/**
 * ALMANAC.JS — Celestial Almanac Data & Narrative + Persistence
 * Digital Divination · Ealdforn Republic
 * 
 * Contains celestial mappings, whispers, narrative generation.
 * NOW with Supabase persistence for sky states.
 */

const Almanac = (() => {
  // ══════════════════════════════════════════
  // SUPABASE CONFIG
  // ══════════════════════════════════════════
  const SUPABASE_URL = 'https://kzcucjcyxybypncbdbws.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3VjamN5eHlieXBuY2JkYndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzIwMTYsImV4cCI6MjA5MjAwODAxNn0.Z8A74B-Rck1POzWkvMXAnfNP6XObJ-MZxLpvOcAC_ig';
  
  let supabaseClient = null;
  let lastSavedHash = null;

  function initSupabase() {
    if (window.supabase && !supabaseClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Almanac: DivineDB connected');
    }
  }

  // Generate hash of current sky to avoid duplicates
  function getSkyStateHash(skyState) {
    const data = {
      period: skyState.period,
      sun_sign: skyState.planets?.sun?.sign,
      moon_sign: skyState.planets?.moon?.sign,
      planet_signs: Object.fromEntries(
        Object.entries(skyState.planets || {}).map(([k, v]) => [k, v.sign])
      )
    };
    return JSON.stringify(data);
  }

  // ══════════════════════════════════════════
  // SKY STATE PERSISTENCE
  // ══════════════════════════════════════════
  
  // Save current sky state to DivineDB
  async function recordCurrentSky() {
    initSupabase();
    if (!supabaseClient) {
      console.warn('Almanac: Supabase not available');
      return null;
    }

    if (typeof Observe === 'undefined') {
      console.warn('Almanac: Observe.js not loaded');
      return null;
    }

    try {
      const rawSky = await Observe.getSkyState();
      const currentHash = getSkyStateHash(rawSky);
      
      if (lastSavedHash === currentHash) {
        console.log('Almanac: Sky unchanged, skipping save');
        return null;
      }

      const record = {
        id: crypto.randomUUID(),
        timestamp: rawSky.timestamp,
        period: rawSky.period,
        sun_sign: rawSky.planets?.sun?.sign || null,
        sun_degree: rawSky.planets?.sun?.degree || null,
        moon_sign: rawSky.planets?.moon?.sign || null,
        moon_degree: rawSky.planets?.moon?.degree || null,
        moon_phase: rawSky.moonPhase?.name || null,
        moon_illumination: rawSky.moonPhase?.illumination || null,
        planets: rawSky.planets || {},
        ascendant_sign: rawSky.ascendant?.sign || null
      };

      const { error } = await supabaseClient.from('sky_states').insert([record]);
      if (error) {
        console.warn('Almanac: Failed to save sky_state', error.message);
        return null;
      }

      lastSavedHash = currentHash;
      console.log('✅ Almanac: Sky state recorded', record.timestamp);
      return record;
    } catch (err) {
      console.warn('Almanac: Record failed', err.message);
      return null;
    }
  }

  // Get the most recent sky state from DivineDB
  async function getLatestSkyState() {
    initSupabase();
    if (!supabaseClient) return null;

    const { data, error } = await supabaseClient
      .from('sky_states')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Almanac: Failed to fetch latest', error);
      return null;
    }
    return data?.[0] || null;
  }

  // Get sky state for a specific date
  async function getSkyStateForDate(date) {
    initSupabase();
    if (!supabaseClient) return null;

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabaseClient
      .from('sky_states')
      .select('*')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('Almanac: Failed to fetch for date', error);
      return null;
    }
    return data?.[0] || null;
  }

  // Get all sky states in a date range
  async function getSkyStatesInRange(startDate, endDate) {
    initSupabase();
    if (!supabaseClient) return [];

    const { data, error } = await supabaseClient
      .from('sky_states')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      console.warn('Almanac: Failed to fetch range', error);
      return [];
    }
    return data || [];
  }

  // Auto-refresh every hour
  let refreshInterval = null;
  function startAutoRefresh(intervalMinutes = 60) {
    if (refreshInterval) clearInterval(refreshInterval);
    recordCurrentSky();
    refreshInterval = setInterval(() => {
      recordCurrentSky();
    }, intervalMinutes * 60 * 1000);
    console.log(`Almanac: Auto-refresh every ${intervalMinutes} minutes`);
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
      console.log('Almanac: Auto-refresh stopped');
    }
  }

  // ══════════════════════════════════════════
  // CELESTIAL MAPPINGS (preserved)
  // ══════════════════════════════════════════
  const CELESTIAL_OLYMPIANS = {
    'sun':     { olympian:'Apollo',     arcana:'The Sun (XIX)',              icon:'☉', image:'data/images/major/sun.png' },
    'moon':    { olympian:'Artemis',    arcana:'The Chariot (VII)',          icon:'☽', image:'data/images/artemis-card.jpg',
                 moonShadow:'Melinoe',  moonShadowArcana:'The Moon (XVIII)' },
    'mercury': { olympian:'Hermes',     arcana:'The Magician (I)',           icon:'☿', image:'data/images/major/magician.png' },
    'venus':   { olympian:'Aphrodite',  arcana:'The Lovers (VI)',            icon:'♀', image:'data/images/aphrodite-card.jpg' },
    'mars':    { olympian:'Ares',       arcana:'The Hierophant (V)',         icon:'♂', image:'data/images/ares-card.jpg' },
    'jupiter': { olympian:'Zeus',       arcana:'The Emperor (IV)',           icon:'♃', image:'data/images/zeus-card.jpg' },
    'saturn':  { olympian:'Hera',       arcana:'The High Priestess (II)',    icon:'♄', image:'data/images/hera-card.jpg' },
    'uranus':  { olympian:'Hephaestus', arcana:'Strength (XI)',              icon:'♅', image:'data/images/hephaestus-card.jpg' },
    'neptune': { olympian:'Poseidon',   arcana:'The Tower (XVI)',            icon:'♆', image:'data/images/poseidon-card.jpg' },
    'pluto':   { olympian:'Hades',      arcana:'Death (XIII)',               icon:'♇', image:'data/images/hades-card.jpg' },
    'ceres':   { olympian:'Demeter',    arcana:'The Empress (III)',          icon:'⚳', image:'data/images/demeter-card.jpg' },
    'eros':    { olympian:'Dionysus',   arcana:'The Fool (0)',               icon:'⚴', image:'data/images/dionysus-card.jpg',
                 attendant:'Ares', attendantRole:'Desire follows the spear — where Ares strikes, Dionysus pours.' },
    'phobos':  { olympian:'Athena',     arcana:'Justice (VIII)',             icon:'⚵', image:'data/images/athena-card.jpg',
                 attendant:'Ares', attendantRole:'Strategic fear — Athena rides with Ares so the war god remembers what victory costs.' }
  };

  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const SIGN_GLYPHS = {Aries:'♈',Taurus:'♉',Gemini:'♊',Cancer:'♋',Leo:'♌',Virgo:'♍',Libra:'♎',Scorpio:'♏',Sagittarius:'♐',Capricorn:'♑',Aquarius:'♒',Pisces:'♓'};
  const SIGN_NAMES  = {Aries:'the Ram',Taurus:'the Bull',Gemini:'the Twins',Cancer:'the Crab',Leo:'the Lion',Virgo:'the Maiden',Libra:'the Scales',Scorpio:'the Scorpion',Sagittarius:'the Archer',Capricorn:'the Sea-Goat',Aquarius:'the Water-Bearer',Pisces:'the Fish'};

  // ══════════════════════════════════════════
  // WHISPERS (preserved)
  // ══════════════════════════════════════════
  const WHISPERS = {
    Apollo:    ['The sun does not negotiate with shadows. It simply rises.','Your radiance is not an offering. It is a demand on the world.','Apollo does not wait for permission to set the sky on fire.'],
    Artemis:   ['Sovereignty begins the moment you stop waiting to be chosen.','The arrow is already in flight. The question is whether you aimed true.','Artemis hunts alone — not because she is lonely, but because she is complete.'],
    Melinoe:   ['The ghosts are not haunting you. They are trying to finish something.','Not all visions are prophecy, but not all are fear. Learn the difference.','The madness is a message. Translate it before it translates you.'],
    Hermes:    ['Every locked door has a word that opens it. Find the word.','You are the conduit. What passes through you is changed by passing through you.','The boundary is not a wall. It is a threshold.'],
    Aphrodite: ['Desire is a current. The question is whether you swim or drown.','The mirror shows what you want. It also shows what you are afraid to want.','Aphrodite was born from violence and became the goddess of love. So can you.'],
    Ares:      ['The spear knows where to strike. Does the hand that holds it?','Every tradition was once a fresh wound. Ask what this one is still protecting.','War asks only one question: what are you willing to destroy to protect what matters?'],
    Zeus:      ['Authority is not claimed. It is demonstrated in the silence before the thunder.','The crown is a sentence. Read the terms before you accept it.','Order made from chaos requires that you first understand what chaos was protecting.'],
    Hera:      ['Not all truths are spoken. Some are kept — that is not weakness, that is covenant.','The veil is not a lie. It is a boundary. Honor it.','What you guard in silence, you are also fed by in silence.'],
    Hephaestus:['The forge does not care that you were cast out. It only cares that you returned.','What you build in the dark will be recognized by the light eventually.','The lame god built thrones for those who exiled him. That is not forgiveness. That is power.'],
    Poseidon:  ['What was built on sand will not be saved by argument. Only by rebuilding.','The wave does not negotiate. It arrives. So does the truth.','The sea has swallowed cities that believed themselves permanent.'],
    Hades:     ['The underworld is not a punishment. It is where things go when they are finished.','Everything you have buried is still down there. Hades keeps meticulous records.','The door to the underworld is unlocked. It always was.'],
    Demeter:   ['The harvest comes from the field she starved. Even grief is a season.','The soil does not owe you an answer. Only a cycle. Trust the cycle.','The earth does not rush. Neither should the thing you are growing.'],
    Dionysus:  ['The vine does not ask the wall for permission to climb it.','Where Ares burns, Dionysus pours. One destroys. One transforms.','Madness is not the absence of wisdom. Sometimes it is wisdom with the lid off.'],
    Athena:    ['The battle is already won or lost in the mind. The sword only confirms it.','Wisdom is knowing which question to ask before you move.','Phobos is not cowardice. It is the intelligence of fear — the kind that keeps you alive.']
  };

  // ══════════════════════════════════════════
  // UTILITY FUNCTIONS (preserved)
  // ══════════════════════════════════════════
  function dailySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }

  function seededInt(seed, max) {
    let s = (seed * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(s) % max;
  }

  function getWhisper(god, offset = 0) {
    const w = WHISPERS[god];
    if (!w) return '';
    return w[seededInt(dailySeed() + god.charCodeAt(0) * 31 + offset, w.length)];
  }

  // ══════════════════════════════════════════
  // BUILD SKY STATE WITH MAPPINGS (preserved)
  // ══════════════════════════════════════════
  function buildSkyState(raw) {
    const state = [];

    Object.entries(raw.planets).forEach(([key, pos]) => {
      const deity = CELESTIAL_OLYMPIANS[key];
      if (!deity) return;
      state.push({
        body: key,
        sign: pos.sign,
        glyph: pos.glyph,
        signName: SIGN_NAMES[pos.sign],
        olympian: deity.olympian,
        arcana: deity.arcana,
        icon: deity.icon,
        image: deity.image,
        moonShadow: deity.moonShadow || null,
        moonShadowArcana: deity.moonShadowArcana || null,
        approximate: false,
        attendant: null,
        aboveHorizon: pos.aboveHorizon || false
      });
    });

    const mars = state.find(s => s.body === 'mars');
    if (mars) {
      ['eros', 'phobos'].forEach(moonName => {
        const d = CELESTIAL_OLYMPIANS[moonName];
        if (!d) return;
        state.push({
          body: moonName,
          sign: mars.sign,
          glyph: mars.glyph,
          signName: mars.signName,
          olympian: d.olympian,
          arcana: d.arcana,
          icon: d.icon,
          image: d.image,
          approximate: true,
          attendant: 'Ares',
          attendantRole: d.attendantRole,
          aboveHorizon: mars.aboveHorizon
        });
      });
    }

    return state;
  }

  // ══════════════════════════════════════════
  // NARRATIVE GENERATOR (preserved)
  // ══════════════════════════════════════════
  function generateNarrative(skyState, raw, tracking) {
    const signGroups = {};
    skyState.forEach(s => {
      if (!signGroups[s.sign]) signGroups[s.sign] = [];
      signGroups[s.sign].push(s);
    });

    const sorted = Object.entries(signGroups).sort((a, b) => b[1].length - a[1].length);
    const empty = SIGNS.filter(s => !signGroups[s]);

    const sun = skyState.find(s => s.body === 'sun');
    const moon = skyState.find(s => s.body === 'moon');
    const ares = skyState.find(s => s.body === 'mars');
    const moonPhase = raw.moonPhase.name.toLowerCase();

    let html = `<div class="narr-title">✦ Today's Horoscope ✦</div>`;

    if (sorted.length > 0) {
      const [sign, watchers] = sorted[0];
      const count = watchers.length;
      const glyph = SIGN_GLYPHS[sign];
      const names = watchers.map(w => `<strong>${w.olympian}</strong>`);
      const attendants = watchers.filter(w => w.attendant);

      if (count >= 4) {
        html += `<p class="narr-headline">There are ${count} celestial bodies in <strong>${sign} ${glyph}</strong> today. ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} all align with you, <span class="sign-address">${sign}</span>! I feel like you're probably very busy?!?</p>`;
      } else if (count === 3) {
        html += `<p class="narr-headline">Three gods walk <strong>${sign} ${glyph}</strong> today — ${names.join(', ')}. That's a council, <span class="sign-address">${sign}</span>.${attendants.length > 0 ? ' Two of them followed Ares here.' : ''}</p>`;
      } else if (count === 2) {
        html += `<p class="narr-headline">${names[0]} and ${names[1]} share <strong>${sign} ${glyph}</strong> today. Two currents in the ${SIGN_NAMES[sign].replace('the ', '')}, <span class="sign-address">${sign}</span>.${attendants.length > 0 ? ' One followed the other.' : ''}</p>`;
      } else {
        html += `<p class="narr-headline">${names[0]} walks <strong>${sign} ${glyph}</strong> alone. A private audience, <span class="sign-address">${sign}</span>.</p>`;
      }
    }

    if (sun && tracking?.sun) {
      const rise = new Date(tracking.sun.rise).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const set = new Date(tracking.sun.set).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const zenith = tracking.sun.zenith?.time;
      const zenithTime = zenith ? new Date(zenith).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;

      html += `<p class="narr-body">The Sun rose in <strong>${sun.sign} ${sun.glyph}</strong> at ${rise}, so <strong>${sun.olympian}</strong> blesses the ${sun.signName}.`;
      if (zenithTime) {
        html += ` The Sun reaches its zenith at ${zenithTime} — the moment of greatest clarity for <span class="sign-address">${sun.sign}</span>.`;
      }
      html += ` It sets at ${set}, carrying Apollo's radiance below the horizon.</p>`;
      html += `<p class="narr-whisper">${getWhisper('Apollo', 1)}</p>`;
    }

    if (moon && tracking?.moon) {
      const moonRise = tracking.moon.rise ? new Date(tracking.moon.rise).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;
      const moonSet = tracking.moon.set ? new Date(tracking.moon.set).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;
      const moonZenith = tracking.moon.zenith?.time;
      const moonZenithTime = moonZenith ? new Date(moonZenith).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null;

      html += `<p class="narr-body">The Moon rises in <strong>${moon.sign} ${moon.glyph}</strong>`;
      if (moonRise) html += ` at ${moonRise}`;
      html += ` under a ${moonPhase}. `;
      
      if (moon.moonShadow) {
        html += `Will your Moon Aspect be <strong>${moon.olympian}</strong> or <strong>${moon.moonShadow}</strong>? `;
      } else {
        html += `<strong>${moon.olympian}</strong> watches the house of ${SIGN_NAMES[moon.sign].replace('the ', '')} tonight. `;
      }
      
      if (moonZenithTime) {
        html += `The Moon reaches its highest point at ${moonZenithTime} — the veil thinnest for <span class="sign-address">${moon.sign}</span>. `;
      }
      
      if (moonSet) {
        html += `It sets at ${moonSet}, leaving ${moon.sign} in darkness.`;
      }
      html += `</p>`;
      
      const shadowGod = moon.moonShadow && seededInt(dailySeed() + 77, 2) === 0 ? moon.moonShadow : moon.olympian;
      html += `<p class="narr-whisper">${getWhisper(shadowGod, 2)}</p>`;
    }

    if (tracking?.events?.length > 0) {
      html += `<p class="narr-body"><strong>Sign Transits Today:</strong></p>`;
      tracking.events.forEach(event => {
        const time = event.approximateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        html += `<p class="narr-whisper">Around ${time}: Transition from ${event.from} ${SIGN_GLYPHS[event.from]} to ${event.to} ${SIGN_GLYPHS[event.to]}</p>`;
      });
    }

    const visibleBodies = skyState.filter(s => s.aboveHorizon && s.body !== 'sun');
    const hiddenBodies = skyState.filter(s => !s.aboveHorizon && s.body !== 'sun' && s.body !== 'moon');
    
    if (visibleBodies.length > 0) {
      const names = visibleBodies.map(s => `<strong>${s.olympian}</strong>`).join(', ');
      html += `<p class="narr-body">Currently above the horizon: ${names}. These gods walk the visible sky.</p>`;
    }
    
    if (hiddenBodies.length > 2) {
      html += `<p class="narr-body">${hiddenBodies.length} celestial bodies walk below the horizon — their influence is felt but not seen.</p>`;
    }

    if (ares) {
      const eros = skyState.find(s => s.body === 'eros');
      const phobos = skyState.find(s => s.body === 'phobos');
      if (eros && phobos) {
        html += `<p class="narr-body"><strong>Ares</strong> moves through <strong>${ares.sign} ${ares.glyph}</strong> today, and he brought company. <strong>Dionysus</strong> rides as Eros — desire that follows the spear. <strong>Athena</strong> rides as Phobos — not cowardice, but the intelligence of fear.</p>`;
      }
    }

    const otherGroups = sorted.filter(([sign, watchers]) => {
      if (watchers.filter(w => !w.attendant).length < 2) return false;
      if (sign === ares?.sign) return false;
      return true;
    });
    otherGroups.forEach(([sign, watchers]) => {
      const names = watchers.filter(w => !w.attendant).map(w => `<strong>${w.olympian}</strong>`);
      const last = names.pop();
      const nameStr = names.length ? names.join(', ') + ' and ' + last : last;
      html += `<p class="narr-body">${nameStr} share <strong>${sign} ${SIGN_GLYPHS[sign]}</strong> — ${SIGN_NAMES[sign]} holds more than one current today.</p>`;
    });

    const solos = sorted.filter(([sign, watchers]) => {
      const nonAtt = watchers.filter(w => !w.attendant);
      if (nonAtt.length !== 1) return false;
      const w = nonAtt[0];
      if (w.body === 'sun' || w.body === 'moon' || w.body === 'mars') return false;
      return true;
    });
    solos.forEach(([sign, watchers]) => {
      const w = watchers.find(w => !w.attendant);
      html += `<p class="narr-body"><strong>${w.olympian}</strong> walks <strong>${sign} ${SIGN_GLYPHS[sign]}</strong> alone — a private audience with ${SIGN_NAMES[sign]}.</p>`;
      html += `<p class="narr-whisper">${getWhisper(w.olympian, 10 + solos.indexOf([sign, watchers]))}</p>`;
    });

    if (empty.length > 0) {
      if (empty.length <= 3) {
        empty.forEach(sign => {
          html += `<p class="narr-empty"><span class="sign-address">${sign} ${SIGN_GLYPHS[sign]}</span> — the house is empty tonight. No Olympian walks your sign. This is not abandonment. This is <strong>privacy</strong>.</p>`;
        });
      } else {
        const listed = empty.slice(0, 3).map(s => `<span class="sign-address">${s}</span>`).join(', ');
        html += `<p class="narr-empty">${listed} and ${empty.length - 3} other houses stand empty tonight.</p>`;
      }
    }

    html += `<p class="narr-closing">There are more divinations at <strong>Digital Divination: Aspects of the Divine</strong> — draw your cards, check the Dashboard, or wander the archive. The sky is not a clock. It is a conversation.</p>`;
    return html;
  }

  // ══════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════
  return {
    // Persistence
    recordCurrentSky,
    getLatestSkyState,
    getSkyStateForDate,
    getSkyStatesInRange,
    startAutoRefresh,
    stopAutoRefresh,
    
    // Legacy exports (preserved)
    CELESTIAL_OLYMPIANS,
    SIGNS,
    SIGN_GLYPHS,
    SIGN_NAMES,
    WHISPERS,
    dailySeed,
    seededInt,
    getWhisper,
    buildSkyState,
    generateNarrative
  };
})();
