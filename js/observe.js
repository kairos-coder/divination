/**
 * OBSERVE.JS — Sky State Reader + DivineDB Persistence
 * 
 * Reads real astronomical data using Astronomy Engine + SunCalc.
 * Automatically saves each unique sky state to DivineDB (sky_states table).
 */

const Observe = (() => {
  // ─── CONFIG ─────────────────────────────────────
  const CONFIG = {
    latitude: 40.7128,
    longitude: -74.0060,
    elevation: 0,
    supabaseUrl: 'https://kzcucjcyxybypncbdbws.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3VjamN5eHlieXBuY2JkYndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzIwMTYsImV4cCI6MjA5MjAwODAxNn0.Z8A74B-Rck1POzWkvMXAnfNP6XObJ-MZxLpvOcAC_ig'
  };

  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const SIGN_GLYPHS = { 'Aries':'♈','Taurus':'♉','Gemini':'♊','Cancer':'♋','Leo':'♌','Virgo':'♍','Libra':'♎','Scorpio':'♏','Sagittarius':'♐','Capricorn':'♑','Aquarius':'♒','Pisces':'♓' };

  let supabaseClient = null;
  let lastSavedHash = null;

  // ─── INIT SUPABASE ──────────────────────────────
  function initSupabase() {
    if (window.supabase && !supabaseClient) {
      supabaseClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
      console.log('DivineDB: sky_states ready');
    }
  }

  // ─── HELPER: Generate unique hash for sky state ─
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

  // ─── HELPER: Sign from longitude ────────────────
  function eclipticToSign(lonDeg) {
    let lon = ((lonDeg % 360) + 360) % 360;
    return SIGNS[Math.floor(lon / 30)];
  }

  function getDegreeInSign(lonDeg) {
    let lon = ((lonDeg % 360) + 360) % 360;
    return lon % 30;
  }

  // ─── GET PLANET POSITION ────────────────────────
  function getPlanetPosition(bodyName, date) {
    const bodyMap = {
      'Sun': Astronomy.Body.Sun,
      'Moon': Astronomy.Body.Moon,
      'Mercury': Astronomy.Body.Mercury,
      'Venus': Astronomy.Body.Venus,
      'Mars': Astronomy.Body.Mars,
      'Jupiter': Astronomy.Body.Jupiter,
      'Saturn': Astronomy.Body.Saturn,
      'Uranus': Astronomy.Body.Uranus,
      'Neptune': Astronomy.Body.Neptune,
      'Pluto': Astronomy.Body.Pluto
    };

    const body = bodyMap[bodyName];
    if (!body) return null;

    try {
      const eq = Astronomy.Equator(body, date, undefined, true, false);
      const ecl = Astronomy.Ecliptic(eq);
      let lon = ecl.elon * 180 / Math.PI;
      
      // Precession correction (tropical coordinates)
      const daysSinceJ2000 = (date - new Date(Date.UTC(2000, 0, 1, 12, 0, 0))) / (1000 * 60 * 60 * 24);
      const centuries = daysSinceJ2000 / 36525;
      const precession = (0.01397 * centuries) * 360;
      lon = (lon + precession) % 360;
      
      const sign = eclipticToSign(lon);
      const degree = getDegreeInSign(lon);

      return {
        sign,
        glyph: SIGN_GLYPHS[sign],
        degree: Math.round(degree * 100) / 100,
        longitude: Math.round(lon * 100) / 100
      };
    } catch (e) {
      console.warn(`Failed to get ${bodyName} position:`, e.message);
      return null;
    }
  }

  // ─── GET MOON PHASE NAME ────────────────────────
  function getMoonPhaseName(phase) {
    const phases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
                    'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    return phases[Math.round(phase * 8) % 8];
  }

  // ─── SAVE TO DIVINEDB ───────────────────────────
  async function saveSkyState(skyState) {
    if (!supabaseClient) return null;
    
    // Deduplication: check if we've already saved this exact configuration
    const currentHash = getSkyStateHash(skyState);
    if (lastSavedHash === currentHash) {
      console.log('DivineDB: sky_state unchanged, skipping save');
      return null;
    }
    
    try {
      const record = {
        id: crypto.randomUUID(),
        timestamp: skyState.timestamp,
        period: skyState.period,
        sun_sign: skyState.planets?.sun?.sign || null,
        sun_degree: skyState.planets?.sun?.degree || null,
        moon_sign: skyState.planets?.moon?.sign || null,
        moon_degree: skyState.planets?.moon?.degree || null,
        moon_phase: skyState.moonPhase?.name || null,
        moon_illumination: skyState.moonPhase?.illumination || null,
        planets: skyState.planets || {},
        ascendant_sign: skyState.ascendant?.sign || null
      };
      
      const { error } = await supabaseClient.from('sky_states').insert([record]);
      if (error) {
        console.warn('DivineDB: failed to save sky_state', error.message);
        return null;
      }
      
      lastSavedHash = currentHash;
      console.log('✅ DivineDB: sky_state saved', record.timestamp);
      return record;
    } catch (err) {
      console.warn('DivineDB: save exception', err.message);
      return null;
    }
  }

  // ─── GET SKY STATE (MAIN FUNCTION) ──────────────
  async function getSkyState(saveToDB = true) {
    initSupabase();
    const now = new Date();
    const times = SunCalc.getTimes(now, CONFIG.latitude, CONFIG.longitude);
    const moonIllum = SunCalc.getMoonIllumination(now);
    
    const isDaytime = now >= times.sunrise && now <= times.sunset;
    const period = isDaytime ? 'SUN' : 'MOON';

    // Calculate ascendant (simplified)
    const gmt = now.getUTCHours() + now.getUTCMinutes() / 60;
    const jd = (now - new Date(Date.UTC(2000, 0, 1, 12, 0, 0))) / (1000 * 60 * 60 * 24) + 2451545.0;
    const lst = (100.46 + 0.985647 * jd + CONFIG.longitude + 15 * gmt) % 360;
    const ascendantLon = Math.atan2(Math.sin(lst * Math.PI / 180), Math.cos(lst * Math.PI / 180)) * 180 / Math.PI;
    const ascendantSign = eclipticToSign(ascendantLon);

    const planets = {};
    const planetNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
    
    for (const name of planetNames) {
      const pos = getPlanetPosition(name, now);
      if (pos) planets[name.toLowerCase()] = pos;
    }

    const skyState = {
      timestamp: now.toISOString(),
      period,
      ascendant: { sign: ascendantSign, glyph: SIGN_GLYPHS[ascendantSign] },
      moonPhase: {
        name: getMoonPhaseName(moonIllum.phase),
        illumination: Math.round(moonIllum.fraction * 100),
        phase: Math.round(moonIllum.phase * 100) / 100
      },
      planets
    };

    // Save to DivineDB if requested
    if (saveToDB && supabaseClient) {
      await saveSkyState(skyState);
    }

    return skyState;
  }

  // ─── GET HISTORICAL SKY STATE ───────────────────
  async function getHistoricalSkyState(date) {
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
      console.warn('Failed to fetch historical sky:', error);
      return null;
    }
    return data?.[0] || null;
  }

  // ─── GET CURRENT PERIOD (NO ASTRONOMY) ──────────
  function getCurrentPeriod() {
    const now = new Date();
    const times = SunCalc.getTimes(now, CONFIG.latitude, CONFIG.longitude);
    return (now >= times.sunrise && now <= times.sunset) ? 'SUN' : 'MOON';
  }

  // ─── GET MOON ASPECT ────────────────────────────
  function getMoonAspect() {
    const now = new Date();
    const moonIllum = SunCalc.getMoonIllumination(now);
    const phaseIdx = Math.round(moonIllum.phase * 8) % 8;
    return (phaseIdx === 0 || phaseIdx === 7) ? 'Melinoe' : 'Artemis';
  }

  // ─── PUBLIC API ─────────────────────────────────
  return {
    getSkyState,
    getHistoricalSkyState,
    getCurrentPeriod,
    getMoonAspect,
    CONFIG
  };
})();
