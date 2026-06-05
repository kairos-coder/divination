/**
 * OBSERVE.JS — Sky State Reader
 * Digital Divination · Ealdforn Republic
 * 
 * Reads real astronomical data using Astronomy Engine + SunCalc.
 * Pure observation. No interpretation. No narrative.
 * 
 * Dependencies:
 *   - Astronomy Engine (astronomy.browser.min.js)
 *   - SunCalc (suncalc.min.js)
 * 
 * Usage:
 *   const sky = await Observe.getSkyState();
 *   // { period: 'SUN', sun: { sign: 'Gemini', degree: 15, ... }, moon: { ... }, planets: [...] }
 */

const Observe = (() => {
  // ─── CONFIG ─────────────────────────────
  const CONFIG = {
    latitude: 40.7128,
    longitude: -74.0060,
    elevation: 0
  };

  const SIGNS = [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
    'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'
  ];

  const SIGN_GLYPHS = {
    'Aries':'♈','Taurus':'♉','Gemini':'♊','Cancer':'♋','Leo':'♌',
    'Virgo':'♍','Libra':'♎','Scorpio':'♏','Sagittarius':'♐',
    'Capricorn':'♑','Aquarius':'♒','Pisces':'♓'
  };

  const PLANETS = [
    'Sun','Moon','Mercury','Venus','Mars',
    'Jupiter','Saturn','Uranus','Neptune','Pluto'
  ];

  const MOON_PHASES = [
    'New Moon','Waxing Crescent','First Quarter','Waxing Gibbous',
    'Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'
  ];

  // ─── HELPER: Ecliptic Longitude to Sign ───
  function eclipticToSign(lonDeg) {
    let lon = ((lonDeg % 360) + 360) % 360;
    return SIGNS[Math.floor(lon / 30)];
  }

  function getDegreeInSign(lonDeg) {
    let lon = ((lonDeg % 360) + 360) % 360;
    return lon % 30;
  }

  // ─── CORRECTED: Get Planet Position ───────
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
      // Use geocentric equatorial coordinates (observer at Earth center)
      // This is correct for zodiac sign calculation
      const eq = Astronomy.Equator(body, date, undefined, true, false);
      const ecl = Astronomy.Ecliptic(eq);
      
      let lon = ecl.elon * 180 / Math.PI;
      
      // Add precession correction (tropical coordinates)
      // Epoch J2000.0 to current date
      const daysSinceJ2000 = (date - new Date(Date.UTC(2000, 0, 1, 12, 0, 0))) / (1000 * 60 * 60 * 24);
      const centuries = daysSinceJ2000 / 36525;
      const precession = (0.01397 * centuries) * 360; // degrees
      
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

  // ─── GET SKY STATE ──────────────────────
  async function getSkyState() {
    const now = new Date();
    const times = SunCalc.getTimes(now, CONFIG.latitude, CONFIG.longitude);
    const moonIllum = SunCalc.getMoonIllumination(now);
    
    const isDaytime = now >= times.sunrise && now <= times.sunset;
    const period = isDaytime ? 'SUN' : 'MOON';

    // Calculate ascendant (rising sign) — simplified but corrected
    // Based on local sidereal time approximation
    const gmt = now.getUTCHours() + now.getUTCMinutes() / 60;
    const jd = (now - new Date(Date.UTC(2000, 0, 1, 12, 0, 0))) / (1000 * 60 * 60 * 24) + 2451545.0;
    const lst = (100.46 + 0.985647 * jd + CONFIG.longitude + 15 * gmt) % 360;
    const ascendantLon = Math.atan2(Math.sin(lst * Math.PI / 180), Math.cos(lst * Math.PI / 180)) * 180 / Math.PI;
    const ascendantSign = eclipticToSign(ascendantLon);

    const skyState = {
      timestamp: now.toISOString(),
      period,
      location: {
        latitude: CONFIG.latitude,
        longitude: CONFIG.longitude
      },
      solar: {
        sunrise: times.sunrise.toISOString(),
        sunset: times.sunset.toISOString(),
        dawn: times.dawn?.toISOString() || null,
        dusk: times.dusk?.toISOString() || null
      },
      ascendant: {
        sign: ascendantSign,
        glyph: SIGN_GLYPHS[ascendantSign],
        longitude: Math.round(ascendantLon * 100) / 100
      },
      moonPhase: {
        name: MOON_PHASES[Math.round(moonIllum.phase * 8) % 8],
        illumination: Math.round(moonIllum.fraction * 100),
        phase: Math.round(moonIllum.phase * 100) / 100
      },
      planets: {}
    };

    // Get positions for all planets
    PLANETS.forEach(planet => {
      const position = getPlanetPosition(planet, now);
      if (position) {
        skyState.planets[planet.toLowerCase()] = position;
      }
    });

    return skyState;
  }

  // ─── GET CURRENT PERIOD ONLY ────────────
  function getCurrentPeriod() {
    const now = new Date();
    const times = SunCalc.getTimes(now, CONFIG.latitude, CONFIG.longitude);
    return (now >= times.sunrise && now <= times.sunset) ? 'SUN' : 'MOON';
  }

  // ─── GET MOON ASPECT ────────────────────
  function getMoonAspect() {
    const now = new Date();
    const moonIllum = SunCalc.getMoonIllumination(now);
    const phaseIdx = Math.round(moonIllum.phase * 8) % 8;
    // New moon or waning crescent = Melinoe (shadow/madness)
    // Otherwise = Artemis (huntress/sovereignty)
    return (phaseIdx === 0 || phaseIdx === 7) ? 'Melinoe' : 'Artemis';
  }

  // ─── TEST FUNCTION (call from console) ───
  async function testSkyState() {
    const state = await getSkyState();
    console.log('\n=== DIGITAL DIVINATION SKY STATE ===');
    console.log(`Period: ${state.period}`);
    console.log(`Ascendant: ${state.ascendant.sign} ${state.ascendant.glyph}`);
    console.log(`Moon: ${state.moonPhase.name} (${state.moonPhase.illumination}%)`);
    console.log('\nPlanets:');
    Object.entries(state.planets).forEach(([name, data]) => {
      console.log(`  ${name.toUpperCase()}: ${data.sign} ${data.glyph} ${data.degree}°`);
    });
    console.log('===================================\n');
    return state;
  }

  // ─── PUBLIC API ─────────────────────────
  return {
    getSkyState,
    getCurrentPeriod,
    getMoonAspect,
    testSkyState,
    CONFIG
  };
})();
