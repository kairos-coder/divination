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
    latitude: 40,
    longitude: -74,
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

  // ─── HELPERS ────────────────────────────
  function eclipticToSign(lonDeg) {
    let lon = ((lonDeg % 360) + 360) % 360;
    return SIGNS[Math.min(Math.floor(lon / 30), 11)];
  }

  function getDegreeInSign(lonDeg) {
    let lon = ((lonDeg % 360) + 360) % 360;
    return lon % 30;
  }

  // ─── PLANET POSITION ────────────────────
  function getPlanetPosition(bodyName, date) {
    const observer = new Astronomy.Observer(
      CONFIG.latitude,
      CONFIG.longitude,
      CONFIG.elevation
    );

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
      const eq = Astronomy.Equator(body, date, observer, true, true);
      const ecl = Astronomy.Ecliptic(eq.vec);
      const sign = eclipticToSign(ecl.elon);
      const degree = getDegreeInSign(ecl.elon);

      return {
        sign,
        glyph: SIGN_GLYPHS[sign],
        degree: Math.round(degree * 100) / 100,
        longitude: Math.round(ecl.elon * 100) / 100
      };
    } catch (e) {
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

    // Calculate ascendant approximately (simplified — full calculation needs sidereal time)
    const ascendantSign = eclipticToSign(
      (now.getHours() * 15 + now.getMinutes() * 0.25 + 180) % 360
    );

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
        glyph: SIGN_GLYPHS[ascendantSign]
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

  // ─── PUBLIC API ─────────────────────────
  return {
    getSkyState,
    getCurrentPeriod,
    getMoonAspect,
    CONFIG
  };
})();
