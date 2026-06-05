/**
 * OBSERVE.JS — Enhanced Sky State Reader
 * Digital Divination · Ealdforn Republic
 * 
 * Reads real astronomical data using Astronomy Engine + SunCalc.
 * Tracks daily movement, rise/set/zenith, and sign transits.
 * Pure observation. No interpretation. No narrative.
 * 
 * Dependencies:
 *   - Astronomy Engine v2.1.8+ (astronomy.browser.min.js)
 *   - SunCalc (suncalc.min.js)
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

  // ─── DEBUG ──────────────────────────────
  function debugAstronomyAPI() {
    console.log('Astronomy Engine API Check:');
    console.log('  typeof Astronomy:', typeof Astronomy);
    if (typeof Astronomy !== 'undefined') {
      console.log('  Astronomy.Body:', typeof Astronomy.Body);
      console.log('  Astronomy.Body keys:', Astronomy.Body ? Object.keys(Astronomy.Body) : 'N/A');
      console.log('  Astronomy.Equator:', typeof Astronomy.Equator);
      console.log('  Astronomy.Ecliptic:', typeof Astronomy.Ecliptic);
      console.log('  Astronomy.Horizon:', typeof Astronomy.Horizon);
      console.log('  Astronomy.Observer:', typeof Astronomy.Observer);
    }
  }

  // ─── ASTRONOMY ENGINE BODY MAP ──────────
  function getAstronomyBody(bodyName) {
    try {
      // Check if Astronomy is loaded
      if (typeof Astronomy === 'undefined') {
        console.error('Astronomy Engine not loaded!');
        return null;
      }

      // Check for Astronomy.Body (v2.x style)
      if (Astronomy.Body) {
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
        if (body !== undefined) {
          return body;
        }
      }

      // Try direct string mapping (some versions use strings)
      return bodyName;
    } catch (e) {
      console.error('Error in getAstronomyBody:', e);
      return null;
    }
  }

  // ─── HELPER: Ecliptic Longitude to Sign ───
  function eclipticToSign(lonDeg) {
    let lon = ((lonDeg % 360) + 360) % 360;
    return SIGNS[Math.floor(lon / 30)];
  }

  function getDegreeInSign(lonDeg) {
    let lon = ((lonDeg % 360) + 360) % 360;
    return lon % 30;
  }

  // ─── GET PLANET POSITION ──────────────────
  function getPlanetPosition(bodyName, date) {
    try {
      const body = getAstronomyBody(bodyName);
      if (!body) {
        console.warn(`Could not resolve body: ${bodyName}`);
        return null;
      }

      let eq, ecl;
      
      // Try v2.x API first
      if (Astronomy.Equator && Astronomy.Ecliptic) {
        // v2.x: Equator(body, date, observer, equdate, aberration)
        eq = Astronomy.Equator(body, date, null, true, false);
        
        // v2.x Ecliptic might take different parameters
        if (typeof Astronomy.Ecliptic === 'function') {
          // Try v2.x style: Ecliptic(elon, elat)
          if (eq.elon !== undefined && eq.elat !== undefined) {
            ecl = Astronomy.Ecliptic(eq.elon, eq.elat);
          } 
          // Try v3.x style: Ecliptic(equ)
          else if (eq.vec) {
            ecl = Astronomy.Ecliptic(eq);
          } else {
            // Assume eq has elon/elat
            ecl = { elon: eq.elon, elat: eq.elat };
          }
        } else {
          ecl = { elon: eq.elon, elat: eq.elat };
        }
      } else {
        console.error('Astronomy.Equator or Astronomy.Ecliptic not available');
        return null;
      }
      
      // Get longitude from ecliptic
      let lon;
      if (typeof ecl.elon === 'number') {
        lon = ecl.elon; // Already in degrees in v2.x
      } else if (ecl.elon && typeof ecl.elon === 'object') {
        // Might be a vector
        lon = Math.atan2(ecl.elon.y, ecl.elon.x) * 180 / Math.PI;
      } else {
        console.error('Cannot extract longitude from ecliptic:', ecl);
        return null;
      }
      
      // Add precession correction (tropical coordinates)
      const daysSinceJ2000 = (date - new Date(Date.UTC(2000, 0, 1, 12, 0, 0))) / (1000 * 60 * 60 * 24);
      const centuries = daysSinceJ2000 / 36525;
      const precession = (0.01397 * centuries) * 360;
      
      lon = (lon + precession) % 360;
      if (lon < 0) lon += 360;
      
      const sign = eclipticToSign(lon);
      const degree = getDegreeInSign(lon);

      // Calculate altitude and azimuth for visibility
      let altitude = 0;
      let azimuth = 0;
      let aboveHorizon = false;
      
      try {
        if (Astronomy.Observer && Astronomy.Horizon) {
          const observer = new Astronomy.Observer(CONFIG.latitude, CONFIG.longitude, CONFIG.elevation);
          const hor = Astronomy.Horizon(date, observer, body);
          altitude = hor.altitude;
          azimuth = hor.azimuth;
          aboveHorizon = altitude > 0;
        }
      } catch (e) {
        // Horizon calculation failed, but position might still be valid
        console.warn(`Horizon calculation failed for ${bodyName}:`, e.message);
      }
      
      return {
        sign,
        glyph: SIGN_GLYPHS[sign],
        degree: Math.round(degree * 100) / 100,
        longitude: Math.round(lon * 100) / 100,
        altitude: Math.round(altitude * 100) / 100,
        azimuth: Math.round(azimuth * 100) / 100,
        aboveHorizon
      };
    } catch (e) {
      console.warn(`Failed to get ${bodyName} position:`, e.message);
      return null;
    }
  }

  // ─── CALCULATE ZENITH TIME ────────────────
  function getZenithTime(bodyName, date) {
    try {
      const body = getAstronomyBody(bodyName);
      if (!body || !Astronomy.Observer || !Astronomy.Horizon) return null;

      const observer = new Astronomy.Observer(CONFIG.latitude, CONFIG.longitude, CONFIG.elevation);
      
      // Search for highest altitude in 24 hours by sampling every 15 minutes
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      
      let bestAltitude = -999;
      let bestTime = null;
      
      for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
        const sampleTime = new Date(searchDate.getTime() + minutes * 60000);
        
        try {
          const hor = Astronomy.Horizon(sampleTime, observer, body);
          const alt = hor.altitude;
          
          if (alt > bestAltitude) {
            bestAltitude = alt;
            bestTime = sampleTime;
          }
        } catch (e) {
          // Skip failed samples
          continue;
        }
      }
      
      if (bestTime && bestAltitude > -90) {
        return {
          time: bestTime,
          altitude: Math.round(bestAltitude * 100) / 100
        };
      }
    } catch (e) {
      console.warn(`Failed to calculate zenith for ${bodyName}:`, e.message);
    }
    return null;
  }

  // ─── GET SIGN TRANSITS ────────────────────
  function getSignTransits(bodyName, date) {
    const positions = [];
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Sample every 2 hours to track sign changes
    for (let h = 0; h < 24; h += 2) {
      const sampleDate = new Date(startOfDay.getTime() + h * 3600000);
      const pos = getPlanetPosition(bodyName, sampleDate);
      if (pos) {
        positions.push({
          time: sampleDate,
          sign: pos.sign,
          glyph: pos.glyph,
          degree: pos.degree
        });
      }
    }
    
    // Detect sign changes
    const transits = [];
    for (let i = 1; i < positions.length; i++) {
      if (positions[i].sign !== positions[i-1].sign) {
        transits.push({
          body: bodyName,
          from: positions[i-1].sign,
          to: positions[i].sign,
          approximateTime: positions[i].time
        });
      }
    }
    
    return transits;
  }

  // ─── DAILY TRACKING ──────────────────────
  function getDailyTracking(date = new Date()) {
    const tracking = {
      date: date.toISOString().split('T')[0],
      sun: null,
      moon: null,
      planets: {},
      events: []
    };

    // Sun tracking
    try {
      const times = SunCalc.getTimes(date, CONFIG.latitude, CONFIG.longitude);
      
      const sunPos = getPlanetPosition('Sun', date);
      tracking.sun = {
        rise: times.sunrise?.toISOString() || null,
        set: times.sunset?.toISOString() || null,
        dawn: times.dawn?.toISOString() || null,
        dusk: times.dusk?.toISOString() || null,
        zenith: getZenithTime('Sun', date),
        currentSign: sunPos?.sign || 'Unknown',
        currentGlyph: sunPos?.glyph || '☉'
      };
    } catch (e) {
      console.warn('Sun tracking failed:', e);
      tracking.sun = {
        rise: null, set: null, dawn: null, dusk: null,
        zenith: null, currentSign: 'Unknown', currentGlyph: '☉'
      };
    }

    // Moon tracking
    try {
      const moonTimes = SunCalc.getMoonTimes(date, CONFIG.latitude, CONFIG.longitude);
      const moonIllum = SunCalc.getMoonIllumination(date);
      const moonPos = getPlanetPosition('Moon', date);
      
      tracking.moon = {
        rise: moonTimes.rise?.toISOString() || null,
        set: moonTimes.set?.toISOString() || null,
        phase: MOON_PHASES[Math.round(moonIllum.phase * 8) % 8],
        illumination: Math.round(moonIllum.fraction * 100),
        phaseValue: Math.round(moonIllum.phase * 100) / 100,
        zenith: getZenithTime('Moon', date),
        currentSign: moonPos?.sign || 'Unknown',
        currentGlyph: moonPos?.glyph || '☽'
      };
    } catch (e) {
      console.warn('Moon tracking failed:', e);
      tracking.moon = {
        rise: null, set: null, phase: 'Unknown', illumination: 0,
        phaseValue: 0, zenith: null, currentSign: 'Unknown', currentGlyph: '☽'
      };
    }

    // Track sign changes (only if planets are available)
    if (getPlanetPosition('Sun', date)) {
      const sunTransits = getSignTransits('Sun', date);
      const moonTransits = getSignTransits('Moon', date);
      tracking.events.push(...sunTransits, ...moonTransits);
    }

    // Planet tracking
    PLANETS.filter(p => p !== 'Sun' && p !== 'Moon').forEach(planet => {
      try {
        const pos = getPlanetPosition(planet, date);
        if (pos) {
          tracking.planets[planet.toLowerCase()] = {
            sign: pos.sign,
            glyph: pos.glyph,
            degree: pos.degree,
            altitude: pos.altitude,
            aboveHorizon: pos.aboveHorizon,
            zenith: getZenithTime(planet, date)
          };
        }
      } catch (e) {
        // Skip planets that fail
      }
    });

    return tracking;
  }

  // ─── GET SKY STATE ────────────────────────
  async function getSkyState() {
    const now = new Date();
    
    let skyState = {
      timestamp: now.toISOString(),
      period: 'SUN',
      location: {
        latitude: CONFIG.latitude,
        longitude: CONFIG.longitude
      },
      solar: {
        sunrise: null,
        sunset: null,
        dawn: null,
        dusk: null
      },
      ascendant: {
        sign: 'Unknown',
        glyph: '?',
        longitude: 0
      },
      moonPhase: {
        name: 'Unknown',
        illumination: 0,
        phase: 0
      },
      planets: {}
    };

    // Get SunCalc data
    try {
      const times = SunCalc.getTimes(now, CONFIG.latitude, CONFIG.longitude);
      const moonIllum = SunCalc.getMoonIllumination(now);
      
      const isDaytime = now >= times.sunrise && now <= times.sunset;
      skyState.period = isDaytime ? 'SUN' : 'MOON';
      
      skyState.solar = {
        sunrise: times.sunrise?.toISOString() || null,
        sunset: times.sunset?.toISOString() || null,
        dawn: times.dawn?.toISOString() || null,
        dusk: times.dusk?.toISOString() || null
      };

      skyState.moonPhase = {
        name: MOON_PHASES[Math.round(moonIllum.phase * 8) % 8],
        illumination: Math.round(moonIllum.fraction * 100),
        phase: Math.round(moonIllum.phase * 100) / 100
      };

      // Calculate ascendant (rising sign)
      const gmt = now.getUTCHours() + now.getUTCMinutes() / 60;
      const jd = (now - new Date(Date.UTC(2000, 0, 1, 12, 0, 0))) / (1000 * 60 * 60 * 24) + 2451545.0;
      const lst = (100.46 + 0.985647 * jd + CONFIG.longitude + 15 * gmt) % 360;
      const ascendantLon = Math.atan2(Math.sin(lst * Math.PI / 180), Math.cos(lst * Math.PI / 180)) * 180 / Math.PI;
      const ascendantSign = eclipticToSign(ascendantLon);
      
      skyState.ascendant = {
        sign: ascendantSign,
        glyph: SIGN_GLYPHS[ascendantSign],
        longitude: Math.round(ascendantLon * 100) / 100
      };
    } catch (e) {
      console.warn('SunCalc data failed:', e);
    }

    // Get planet positions
    PLANETS.forEach(planet => {
      const position = getPlanetPosition(planet, now);
      if (position) {
        skyState.planets[planet.toLowerCase()] = position;
      }
    });

    // If no planets were loaded, use SunCalc moon data as fallback
    if (Object.keys(skyState.planets).length === 0) {
      console.warn('No planet positions available from Astronomy Engine. Using basic SunCalc data only.');
    }

    return skyState;
  }

  // ─── GET CURRENT PERIOD ONLY ──────────────
  function getCurrentPeriod() {
    const now = new Date();
    try {
      const times = SunCalc.getTimes(now, CONFIG.latitude, CONFIG.longitude);
      return (now >= times.sunrise && now <= times.sunset) ? 'SUN' : 'MOON';
    } catch (e) {
      return 'SUN';
    }
  }

  // ─── GET MOON ASPECT ──────────────────────
  function getMoonAspect() {
    const now = new Date();
    try {
      const moonIllum = SunCalc.getMoonIllumination(now);
      const phaseIdx = Math.round(moonIllum.phase * 8) % 8;
      return (phaseIdx === 0 || phaseIdx === 7) ? 'Melinoe' : 'Artemis';
    } catch (e) {
      return 'Artemis';
    }
  }

  // ─── UPDATE CONFIG ────────────────────────
  function setLocation(lat, lon, elev = 0) {
    CONFIG.latitude = lat;
    CONFIG.longitude = lon;
    CONFIG.elevation = elev;
  }

  // ─── TEST FUNCTION ────────────────────────
  async function testSkyState() {
    debugAstronomyAPI();
    
    const state = await getSkyState();
    const tracking = getDailyTracking();
    
    console.log('\n=== DIGITAL DIVINATION SKY STATE ===');
    console.log(`Period: ${state.period}`);
    console.log(`Ascendant: ${state.ascendant.sign} ${state.ascendant.glyph}`);
    console.log(`Moon: ${state.moonPhase.name} (${state.moonPhase.illumination}%)`);
    console.log('\nPlanets:');
    Object.entries(state.planets).forEach(([name, data]) => {
      console.log(`  ${name.toUpperCase()}: ${data.sign} ${data.glyph} ${data.degree}°`);
    });
    
    console.log('\n=== DAILY TRACKING ===');
    if (tracking.sun.rise) {
      console.log(`Sun rises: ${new Date(tracking.sun.rise).toLocaleTimeString()}`);
      console.log(`Sun sets: ${new Date(tracking.sun.set).toLocaleTimeString()}`);
    }
    if (tracking.moon.rise) {
      console.log(`Moon rises: ${new Date(tracking.moon.rise).toLocaleTimeString()}`);
    }
    if (tracking.events.length > 0) {
      console.log('\nSign Transits Today:');
      tracking.events.forEach(e => {
        console.log(`  ${e.body}: ${e.from} → ${e.to} around ${e.approximateTime.toLocaleTimeString()}`);
      });
    }
    console.log('===================================\n');
    return { state, tracking };
  }

  // Run debug on load
  debugAstronomyAPI();

  // ─── PUBLIC API ───────────────────────────
  return {
    getSkyState,
    getCurrentPeriod,
    getMoonAspect,
    getDailyTracking,
    getSignTransits,
    getPlanetPosition,
    getZenithTime,
    setLocation,
    testSkyState,
    CONFIG,
    SIGNS,
    SIGN_GLYPHS,
    MOON_PHASES
  };
})();
