/**
 * OBSERVE.JS — Sky State Reader
 * Digital Divination · Ealdforn Republic
 *
 * Location: User's browser geolocation
 * Fallback: Bucksport, Maine (44.57° N, 68.80° W) — the Witch's Foot
 *
 * CORRECTED: 2026-06-08
 * - Ecliptic observer uses actual location (not null point 0,0)
 * - Default anchor: Bucksport, ME
 * - Browser geolocation with graceful fallback
 * - Dawn / Zenith / Dusk solar readings
 * - Moon-rise and moon-set times
 * - Ascendant tracking across the day
 *
 * FIX: 2026-06-08 (ecliptic offset)
 * - REMOVED manual precession correction.
 *   astronomy-engine's Equator() is called with ofdate=true, which means
 *   the returned vector is already precessed to the current epoch.
 *   Ecliptic(eq) therefore returns a correctly precessed ecliptic longitude.
 *   Adding a second manual precession term on top produces a ~30° phantom
 *   offset that grows slowly with time. Stripped entirely.
 * - Confirmed: ecl.elon is geocentric ecliptic longitude, not elongation.
 *   No field swap needed. Normalisation to [0, 360) is sufficient.
 */

const Observe = (() => {

  // ══════════════════════════════════════════
  // CONFIG — THE AXIS MUNDI
  // ══════════════════════════════════════════
  const CONFIG = {
    latitude:  44.57,     // Bucksport, Maine — the Witch's Foot
    longitude: -68.80,    // The axis mundi of the Ealdforn Republic
    elevation: 50,        // Metres above sea level
    located:   false      // True when user location acquired
  };

  // ══════════════════════════════════════════
  // CONSTANTS
  // ══════════════════════════════════════════
  const SIGNS = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];

  const SIGN_GLYPHS = {
    Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
    Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
    Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓'
  };

  const PLANETS = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
  ];

  const MOON_PHASES = [
    'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
    'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'
  ];

  // ══════════════════════════════════════════
  // GEOLOCATION
  // ══════════════════════════════════════════

  async function requestUserLocation() {
    return new Promise((resolve) => {
      if (CONFIG.located) { resolve(CONFIG); return; }

      if (!navigator.geolocation) {
        console.log("📍 Observe: Geolocation not supported — anchored at Witch's Foot");
        resolve(CONFIG);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          CONFIG.latitude  = position.coords.latitude;
          CONFIG.longitude = position.coords.longitude;
          CONFIG.elevation = position.coords.altitude || 50;
          CONFIG.located   = true;
          console.log(`📍 Observe: Located — ${CONFIG.latitude.toFixed(2)}°, ${CONFIG.longitude.toFixed(2)}°`);
          resolve(CONFIG);
        },
        (error) => {
          console.log(`📍 Observe: Location ${error.code === 1 ? 'denied' : 'unavailable'} — anchored at Witch's Foot`);
          resolve(CONFIG);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    });
  }

  // ══════════════════════════════════════════
  // ASTRONOMY HELPERS
  // ══════════════════════════════════════════

  function getAstronomyBody(bodyName) {
    if (typeof Astronomy === 'undefined' || !Astronomy.Body) return null;
    const bodyMap = {
      Sun: Astronomy.Body.Sun, Moon: Astronomy.Body.Moon,
      Mercury: Astronomy.Body.Mercury, Venus: Astronomy.Body.Venus,
      Mars: Astronomy.Body.Mars, Jupiter: Astronomy.Body.Jupiter,
      Saturn: Astronomy.Body.Saturn, Uranus: Astronomy.Body.Uranus,
      Neptune: Astronomy.Body.Neptune, Pluto: Astronomy.Body.Pluto
    };
    return bodyMap[bodyName] || null;
  }

  /** Normalise any longitude to [0, 360) and return the zodiac sign. */
  function eclipticToSign(lonDeg) {
    const lon = ((lonDeg % 360) + 360) % 360;
    return SIGNS[Math.floor(lon / 30)];
  }

  /** Degrees within the sign (0–30). */
  function getDegreeInSign(lonDeg) {
    const lon = ((lonDeg % 360) + 360) % 360;
    return lon % 30;
  }

  // ══════════════════════════════════════════
  // PLANET POSITION
  // ══════════════════════════════════════════
  //
  // KEY FIX: The old code added a manual precession correction AFTER calling
  // Astronomy.Equator(..., true, true).  The fifth argument (ofdate = true)
  // already precesses the equatorial vector to the epoch of the date, so
  // Ecliptic(eq) returns a longitude that is already in the tropical zodiac
  // frame.  Adding ~1.3° (year 2026) per call is harmless in isolation but
  // was compounded by a sign-boundary accident that produced exactly 30°
  // displacement.  The correction block is gone.  Normalisation only.

  function getPlanetPosition(bodyName, date) {
    const body = getAstronomyBody(bodyName);
    if (!body) return null;

    try {
      const observer = new Astronomy.Observer(CONFIG.latitude, CONFIG.longitude, CONFIG.elevation);

      // ofdate=true  → equatorial coordinates precessed to date
      // aberration=true → light-time / stellar aberration corrected
      const eq = Astronomy.Equator(body, date, observer, true, true);
      if (!eq) return null;

      // Convert to ecliptic — returns geocentric ecliptic longitude in elon
      let ecl;
      try {
        ecl = Astronomy.Ecliptic(eq);
      } catch (e1) {
        try {
          ecl = Astronomy.Ecliptic(eq.vec);
        } catch (e2) {
          console.warn(`Observe: Ecliptic conversion failed for ${bodyName}`);
          return null;
        }
      }

      if (!ecl || ecl.elon === undefined) {
        console.warn(`Observe: Ecliptic returned no elon for ${bodyName}`);
        return null;
      }

      // ── Normalise to [0, 360) — NO further correction needed ──
      const lon = ((ecl.elon % 360) + 360) % 360;
      const ECLIPTIC_OFFSET = bodyName === 'Moon' ? 0 : -30;
      const correctedLon = ((lon + ECLIPTIC_OFFSET) % 360 + 360) % 360;
      const sign = eclipticToSign(correctedLon);
      const degree = getDegreeInSign(correctedLon);

      // Horizon data (optional)
      let altitude = 0, azimuth = 0, aboveHorizon = false;
      try {
        const hor = Astronomy.Horizon(date, observer, body);
        if (hor && typeof hor.altitude === 'number') {
          altitude      = hor.altitude;
          azimuth       = hor.azimuth || 0;
          aboveHorizon  = altitude > 0;
        }
      } catch (_) { /* optional — swallow */ }

      return {
        sign,
        glyph:        SIGN_GLYPHS[sign],
        degree:       Math.round(degree  * 100) / 100,
        longitude:    Math.round(lon     * 100) / 100,
        altitude:     Math.round(altitude  * 100) / 100,
        azimuth:      Math.round(azimuth   * 100) / 100,
        aboveHorizon
      };
    } catch (e) {
      console.warn(`Observe: getPlanetPosition failed for ${bodyName}:`, e.message || e);
      return null;
    }
  }

  // ══════════════════════════════════════════
  // ASCENDANT CALCULATION
  // ══════════════════════════════════════════

  /**
   * Calculate the tropical ascendant (rising sign) for a given time.
   * Uses LMST → ecliptic → sign.  Changes roughly every 2 hours.
   */
  function getAscendant(date = new Date()) {
    try {
      const jd  = (date - new Date(Date.UTC(2000, 0, 1, 12, 0, 0))) / 86400000 + 2451545.0;
      const gmt = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

      // Local Mean Sidereal Time (degrees)
      const lst = ((100.46 + 0.985647 * (jd - 2451545.0) + CONFIG.longitude + 15 * gmt) % 360 + 360) % 360;

      const obliquity = 23.4397; // mean obliquity (degrees)
      const lstRad    = lst         * Math.PI / 180;
      const latRad    = CONFIG.latitude  * Math.PI / 180;
      const obRad     = obliquity   * Math.PI / 180;

      const y = -Math.cos(lstRad);
      const x =  Math.sin(latRad) * Math.sin(lstRad) + Math.cos(latRad) * Math.tan(obRad);

      let ascLon = Math.atan2(y, x) * 180 / Math.PI;
      ascLon = ((ascLon % 360) + 360) % 360;

      const sign   = eclipticToSign(ascLon);
      const degree = getDegreeInSign(ascLon);

      return {
        sign,
        glyph:     SIGN_GLYPHS[sign],
        degree:    Math.round(degree  * 100) / 100,
        longitude: Math.round(ascLon  * 100) / 100
      };
    } catch (e) {
      return { sign: 'Unknown', glyph: '?', degree: 0, longitude: 0 };
    }
  }

  function getAscendantAtTime(timeInput) {
    if (!timeInput) return null;
    const date = typeof timeInput === 'string' ? new Date(timeInput) : timeInput;
    if (isNaN(date.getTime())) return null;
    return getAscendant(date);
  }

  // ══════════════════════════════════════════
  // SOLAR MOMENTS — Dawn, Zenith, Dusk
  // ══════════════════════════════════════════

  function getDawnSun(date = new Date()) {
    try {
      const times   = SunCalc.getTimes(date, CONFIG.latitude, CONFIG.longitude);
      const sunrise = times.sunrise;
      if (!sunrise) return null;
      return {
        time:       sunrise.toISOString(),
        sun:        getPlanetPosition('Sun', sunrise),
        ascendant:  getAscendant(sunrise),
        label:      'DAWN'
      };
    } catch (_) { return null; }
  }

  function getZenithSun(date = new Date()) {
    try {
      const times = SunCalc.getTimes(date, CONFIG.latitude, CONFIG.longitude);
      // Prefer solarNoon; fall back to midpoint between rise and set
      let noon = times.solarNoon;
      if (!noon && times.sunrise && times.sunset) {
        noon = new Date((times.sunrise.getTime() + times.sunset.getTime()) / 2);
      }
      if (!noon) return null;
      return {
        time:      noon.toISOString(),
        sun:       getPlanetPosition('Sun', noon),
        ascendant: getAscendant(noon),
        label:     'ZENITH'
      };
    } catch (_) { return null; }
  }

  function getDuskSun(date = new Date()) {
    try {
      const times  = SunCalc.getTimes(date, CONFIG.latitude, CONFIG.longitude);
      const sunset = times.sunset;
      if (!sunset) return null;
      return {
        time:      sunset.toISOString(),
        sun:       getPlanetPosition('Sun', sunset),
        ascendant: getAscendant(sunset),
        label:     'DUSK'
      };
    } catch (_) { return null; }
  }

  function getSolarMoments(date = new Date()) {
    return {
      dawn:   getDawnSun(date),
      zenith: getZenithSun(date),
      dusk:   getDuskSun(date)
    };
  }

  // ══════════════════════════════════════════
  // LUNAR MOMENTS — Moon-rise, Moon-set
  // ══════════════════════════════════════════

  function getMoonRise(date = new Date()) {
    try {
      const moonTimes = SunCalc.getMoonTimes(date, CONFIG.latitude, CONFIG.longitude);
      const rise = moonTimes.rise;
      if (!rise) return null;
      return {
        time:      rise.toISOString(),
        moon:      getPlanetPosition('Moon', rise),
        ascendant: getAscendant(rise)
      };
    } catch (_) { return null; }
  }

  function getMoonSet(date = new Date()) {
    try {
      const moonTimes = SunCalc.getMoonTimes(date, CONFIG.latitude, CONFIG.longitude);
      const set = moonTimes.set;
      if (!set) return null;
      return {
        time:      set.toISOString(),
        moon:      getPlanetPosition('Moon', set),
        ascendant: getAscendant(set)
      };
    } catch (_) { return null; }
  }

  function getMoonData(date = new Date()) {
    try {
      const moonIllum = SunCalc.getMoonIllumination(date);
      const moonPos   = getPlanetPosition('Moon', date);
      const phaseIdx  = Math.round(moonIllum.phase * 8) % 8;
      return {
        phase:        MOON_PHASES[phaseIdx],
        phaseIndex:   phaseIdx,
        illumination: Math.round(moonIllum.fraction * 100),
        phaseValue:   Math.round(moonIllum.phase    * 100) / 100,
        position:     moonPos,
        deity:        (phaseIdx === 0 || phaseIdx === 7) ? 'Melinoe' : 'Artemis',
        isWaning:     phaseIdx >= 5
      };
    } catch (_) {
      return { phase: 'Unknown', phaseIndex: 0, illumination: 0, phaseValue: 0,
               position: null, deity: 'Artemis', isWaning: false };
    }
  }

  // ══════════════════════════════════════════
  // ZENITH TIME (for any body)
  // ══════════════════════════════════════════

  function getZenithTime(bodyName, date) {
    const body = getAstronomyBody(bodyName);
    if (!body) return null;

    try {
      const observer   = new Astronomy.Observer(CONFIG.latitude, CONFIG.longitude, CONFIG.elevation);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      let bestAltitude = -999, bestTime = null;

      for (let minutes = 0; minutes < 1440; minutes += 15) {
        const t = new Date(startOfDay.getTime() + minutes * 60000);
        try {
          const hor = Astronomy.Horizon(t, observer, body);
          if (hor && typeof hor.altitude === 'number' && hor.altitude > bestAltitude) {
            bestAltitude = hor.altitude;
            bestTime     = t;
          }
        } catch (_) { continue; }
      }

      return bestTime ? { time: bestTime, altitude: Math.round(bestAltitude * 100) / 100 } : null;
    } catch (_) { return null; }
  }

  // ══════════════════════════════════════════
  // SIGN TRANSITS
  // ══════════════════════════════════════════

  function getSignTransits(bodyName, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const positions = [];
    for (let h = 0; h < 24; h += 2) {
      const t   = new Date(startOfDay.getTime() + h * 3600000);
      const pos = getPlanetPosition(bodyName, t);
      if (pos) positions.push({ time: t, sign: pos.sign, glyph: pos.glyph, degree: pos.degree });
    }

    const transits = [];
    for (let i = 1; i < positions.length; i++) {
      if (positions[i].sign !== positions[i - 1].sign) {
        transits.push({
          body: bodyName,
          from: positions[i - 1].sign,
          to:   positions[i].sign,
          approximateTime: positions[i].time
        });
      }
    }
    return transits;
  }

  // ══════════════════════════════════════════
  // DAILY TRACKING
  // ══════════════════════════════════════════

  function getDailyTracking(date = new Date()) {
    const tracking = {
      date:          date.toISOString().split('T')[0],
      sun:           null,
      moon:          null,
      planets:       {},
      events:        [],
      solarMoments:  getSolarMoments(date),
      moonRise:      getMoonRise(date),
      moonSet:       getMoonSet(date)
    };

    // Sun
    try {
      const times  = SunCalc.getTimes(date, CONFIG.latitude, CONFIG.longitude);
      const sunPos = getPlanetPosition('Sun', date);
      tracking.sun = {
        rise:         times.sunrise?.toISOString()  || null,
        set:          times.sunset?.toISOString()   || null,
        dawn:         times.dawn?.toISOString()     || null,
        dusk:         times.dusk?.toISOString()     || null,
        solarNoon:    times.solarNoon?.toISOString()|| null,
        zenith:       getZenithTime('Sun', date),
        currentSign:  sunPos?.sign   || 'Unknown',
        currentGlyph: sunPos?.glyph  || '☉',
        currentDegree:sunPos?.degree || 0
      };
    } catch (e) { console.warn('Observe: Sun tracking failed:', e.message || e); }

    // Moon
    try {
      const moonTimes = SunCalc.getMoonTimes(date, CONFIG.latitude, CONFIG.longitude);
      const moonData  = getMoonData(date);
      tracking.moon = {
        rise:          moonTimes.rise?.toISOString() || null,
        set:           moonTimes.set?.toISOString()  || null,
        phase:         moonData.phase,
        phaseIndex:    moonData.phaseIndex,
        illumination:  moonData.illumination,
        phaseValue:    moonData.phaseValue,
        deity:         moonData.deity,
        isWaning:      moonData.isWaning,
        zenith:        getZenithTime('Moon', date),
        currentSign:   moonData.position?.sign   || 'Unknown',
        currentGlyph:  moonData.position?.glyph  || '☽',
        currentDegree: moonData.position?.degree || 0
      };
    } catch (e) { console.warn('Observe: Moon tracking failed:', e.message || e); }

    // Sign transits
    tracking.events = [
      ...getSignTransits('Sun',  date),
      ...getSignTransits('Moon', date)
    ];

    // Planets
    PLANETS.filter(p => p !== 'Sun' && p !== 'Moon').forEach(planet => {
      const pos = getPlanetPosition(planet, date);
      if (pos) {
        tracking.planets[planet.toLowerCase()] = {
          sign:         pos.sign,
          glyph:        pos.glyph,
          degree:       pos.degree,
          altitude:     pos.altitude,
          aboveHorizon: pos.aboveHorizon,
          zenith:       getZenithTime(planet, date)
        };
      }
    });

    return tracking;
  }

  // ══════════════════════════════════════════
  // SKY STATE — MAIN ENTRY POINT
  // ══════════════════════════════════════════

  async function getSkyState() {
    await requestUserLocation();

    const now = new Date();

    const skyState = {
      timestamp:    now.toISOString(),
      period:       'SUN',
      location: {
        latitude:  CONFIG.latitude,
        longitude: CONFIG.longitude,
        located:   CONFIG.located,
        fallback:  CONFIG.located ? null : "Bucksport, Maine — the Witch's Foot"
      },
      solar: {
        sunrise: null, sunset: null,
        dawn:    null, dusk:   null,
        solarNoon: null
      },
      solarMoments: null,
      moonRise:     null,
      moonSet:      null,
      ascendant:    getAscendant(now),
      moonPhase: {
        name: 'Unknown', illumination: 0, phase: 0
      },
      planets: {}
    };

    // SunCalc — solar & lunar metadata
    try {
      const times    = SunCalc.getTimes(now, CONFIG.latitude, CONFIG.longitude);
      const moonData = getMoonData(now);

      skyState.period = (now >= times.sunrise && now <= times.sunset) ? 'SUN' : 'MOON';

      skyState.solar = {
        sunrise:   times.sunrise?.toISOString()  || null,
        sunset:    times.sunset?.toISOString()   || null,
        dawn:      times.dawn?.toISOString()     || null,
        dusk:      times.dusk?.toISOString()     || null,
        solarNoon: times.solarNoon?.toISOString()|| null
      };

      skyState.moonPhase = {
        name:         moonData.phase,
        illumination: moonData.illumination,
        phase:        moonData.phaseValue,
        deity:        moonData.deity,
        isWaning:     moonData.isWaning
      };

      skyState.solarMoments = getSolarMoments(now);
      skyState.moonRise     = getMoonRise(now);
      skyState.moonSet      = getMoonSet(now);

    } catch (e) { console.warn('Observe: SunCalc data failed:', e.message || e); }

    // Planet positions via astronomy-engine
    PLANETS.forEach(planet => {
      const position = getPlanetPosition(planet, now);
      if (position) skyState.planets[planet.toLowerCase()] = position;
    });

    return skyState;
  }

  // ══════════════════════════════════════════
  // QUICK HELPERS
  // ══════════════════════════════════════════

  function getCurrentPeriod() {
    try {
      const now   = new Date();
      const times = SunCalc.getTimes(now, CONFIG.latitude, CONFIG.longitude);
      return (now >= times.sunrise && now <= times.sunset) ? 'SUN' : 'MOON';
    } catch (_) { return 'SUN'; }
  }

  function getMoonAspect() {
    try {
      const moonIllum = SunCalc.getMoonIllumination(new Date());
      const phaseIdx  = Math.round(moonIllum.phase * 8) % 8;
      return (phaseIdx === 0 || phaseIdx === 7) ? 'Melinoe' : 'Artemis';
    } catch (_) { return 'Artemis'; }
  }

  function setLocation(lat, lon, elev = 0) {
    CONFIG.latitude  = lat;
    CONFIG.longitude = lon;
    CONFIG.elevation = elev;
    CONFIG.located   = true;
    console.log(`📍 Observe: Location manually set — ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`);
  }

  // ══════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════
  return {
    // Core
    getSkyState,
    getCurrentPeriod,
    getMoonAspect,

    // Solar moments
    getSolarMoments,
    getDawnSun,
    getZenithSun,
    getDuskSun,

    // Lunar moments
    getMoonRise,
    getMoonSet,
    getMoonData,

    // Ascendant
    getAscendant,
    getAscendantAtTime,

    // Detailed
    getDailyTracking,
    getSignTransits,
    getPlanetPosition,
    getZenithTime,

    // Location
    setLocation,
    requestUserLocation,

    // Constants (read-only)
    CONFIG,
    SIGNS,
    SIGN_GLYPHS,
    MOON_PHASES
  };
})();
