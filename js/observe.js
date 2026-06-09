/**
 * OBSERVE.JS — Sky State Reader
 * Digital Divination · Ealdforn Republic
 * 
 * Location: User's browser geolocation
 * Fallback: Bucksport, Maine (44.57° N, 68.80° W) — the Witch's Foot
 * 
 * CORRECTED: 2026-06-08
 * - Ecliptic observer now uses actual location (not null point 0,0)
 * - Default anchor changed from NYC to Bucksport, ME
 * - Added browser geolocation with graceful fallback
 * - NEW: Dawn/Zenith/Dusk solar readings
 * - NEW: Moon-rise and moon-set times
 * - NEW: Ascendant tracking across the day
 * - Previous readings (pre-correction) computed from phantom skies
 */

const Observe = (() => {
  
  // ══════════════════════════════════════════
  // CONFIG — THE AXIS MUNDI
  // ══════════════════════════════════════════
  const CONFIG = {
    latitude: 44.57,      // Bucksport, Maine — the Witch's Foot
    longitude: -68.80,    // The axis mundi of the Ealdforn Republic
    elevation: 50,        // Meters above sea level
    located: false        // True when user location acquired
  };

  // ══════════════════════════════════════════
  // CONSTANTS
  // ══════════════════════════════════════════
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

  // ══════════════════════════════════════════
  // GEOLOCATION
  // ══════════════════════════════════════════
  
  async function requestUserLocation() {
    return new Promise((resolve) => {
      if (CONFIG.located) {
        resolve(CONFIG);
        return;
      }
      
      if (!navigator.geolocation) {
        console.log('📍 Observe: Geolocation not supported — anchored at Witch\'s Foot');
        resolve(CONFIG);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          CONFIG.latitude = position.coords.latitude;
          CONFIG.longitude = position.coords.longitude;
          CONFIG.elevation = position.coords.altitude || 50;
          CONFIG.located = true;
          console.log(`📍 Observe: Located — ${CONFIG.latitude.toFixed(2)}°, ${CONFIG.longitude.toFixed(2)}°`);
          resolve(CONFIG);
        },
        (error) => {
          console.log(`📍 Observe: Location ${error.code === 1 ? 'denied' : 'unavailable'} — anchored at Witch\'s Foot`);
          resolve(CONFIG);
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 600000
        }
      );
    });
  }

  // ══════════════════════════════════════════
  // ASTRONOMY HELPERS
  // ══════════════════════════════════════════

  function getAstronomyBody(bodyName) {
    if (typeof Astronomy === 'undefined' || !Astronomy.Body) return null;
    
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
    
    return bodyMap[bodyName] || null;
  }

  function eclipticToSign(lonDeg) {
    let lon = ((lonDeg % 360) + 360) % 360;
    return SIGNS[Math.floor(lon / 30)];
  }

  function getDegreeInSign(lonDeg) {
    let lon = ((lonDeg % 360) + 360) % 360;
    return lon % 30;
  }

  // ══════════════════════════════════════════
  // PLANET POSITION
  // ══════════════════════════════════════════

  function getPlanetPosition(bodyName, date) {
    const body = getAstronomyBody(bodyName);
    if (!body) return null;

    try {
      const earthObserver = new Astronomy.Observer(
        CONFIG.latitude, 
        CONFIG.longitude, 
        CONFIG.elevation
      );
      
      const eq = Astronomy.Equator(body, date, earthObserver, true, true);
      if (!eq) return null;
      
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
      
      let lon = ecl.elon;
      
      // Precession correction
      const daysSinceJ2000 = (date - new Date(Date.UTC(2000, 0, 1, 12, 0, 0))) / (1000 * 60 * 60 * 24);
      const centuries = daysSinceJ2000 / 36525;
      const precession = (0.01397 * centuries) * 360;
      
      lon = (lon + precession) % 360;
      if (lon < 0) lon += 360;
      
      const sign = eclipticToSign(lon);
      const degree = getDegreeInSign(lon);

      // Horizon position
      let altitude = 0;
      let azimuth = 0;
      let aboveHorizon = false;
      
      try {
        const locObserver = new Astronomy.Observer(
          CONFIG.latitude, 
          CONFIG.longitude, 
          CONFIG.elevation
        );
        const hor = Astronomy.Horizon(date, locObserver, body);
        if (hor && typeof hor.altitude === 'number') {
          altitude = hor.altitude;
          azimuth = hor.azimuth || 0;
          aboveHorizon = altitude > 0;
        }
      } catch (e) {
        // Horizon data is optional
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
      console.warn(`Observe: getPlanetPosition failed for ${bodyName}:`, e.message || e);
      return null;
    }
  }

  // ══════════════════════════════════════════
  // ASCENDANT CALCULATION
  // ══════════════════════════════════════════

  /**
   * Calculate the ascendant (rising sign) for a given time.
   * The ascendant changes roughly every 2 hours.
   */
  function getAscendant(date = new Date()) {
    try {
      const gmt = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
      const jd = (date - new Date(Date.UTC(2000, 0, 1, 12, 0, 0))) / (1000 * 60 * 60 * 24) + 2451545.0;
      const lst = (100.46 + 0.985647 * jd + CONFIG.longitude + 15 * gmt) % 360;
      const obliquity = 23.44;
      
      const lstRad = lst * Math.PI / 180;
      const latRad = CONFIG.latitude * Math.PI / 180;
      const obRad = obliquity * Math.PI / 180;
      
      const y = -Math.cos(lstRad);
      const x = Math.sin(latRad) * Math.sin(lstRad) + Math.cos(latRad) * Math.tan(obRad);
      
      let ascLon = Math.atan2(y, x) * 180 / Math.PI;
      if (ascLon < 0) ascLon += 360;
      
      const sign = eclipticToSign(ascLon);
      const degree = getDegreeInSign(ascLon);
      
      return {
        sign,
        glyph: SIGN_GLYPHS[sign],
        degree: Math.round(degree * 100) / 100,
        longitude: Math.round(ascLon * 100) / 100
      };
    } catch (e) {
      return { sign: 'Unknown', glyph: '?', degree: 0, longitude: 0 };
    }
  }

  /**
   * Get the ascendant at a specific time (ISO string or Date).
   */
  function getAscendantAtTime(timeInput) {
    if (!timeInput) return null;
    const date = typeof timeInput === 'string' ? new Date(timeInput) : timeInput;
    if (isNaN(date.getTime())) return null;
    return getAscendant(date);
  }

  // ══════════════════════════════════════════
  // SOLAR MOMENTS — Dawn, Zenith, Dusk
  // ══════════════════════════════════════════

  /**
   * Get the sun's position at dawn (sunrise).
   */
  function getDawnSun(date = new Date()) {
    try {
      const times = SunCalc.getTimes(date, CONFIG.latitude, CONFIG.longitude);
      const sunrise = times.sunrise;
      if (!sunrise) return null;
      
      const sunPos = getPlanetPosition('Sun', sunrise);
      const asc = getAscendant(sunrise);
      
      return {
        time: sunrise.toISOString(),
        sun: sunPos,
        ascendant: asc,
        label: 'DAWN'
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Get the sun's position at solar noon (zenith/culmination).
   */
  function getZenithSun(date = new Date()) {
    try {
      const times = SunCalc.getTimes(date, CONFIG.latitude, CONFIG.longitude);
      const solarNoon = times.solarNoon || times.sunrise 
        ? new Date((new Date(times.sunrise).getTime() + new Date(times.sunset).getTime()) / 2)
        : null;
      
      if (!solarNoon) return null;
      
      const sunPos = getPlanetPosition('Sun', solarNoon);
      const asc = getAscendant(solarNoon);
      
      return {
        time: solarNoon.toISOString(),
        sun: sunPos,
        ascendant: asc,
        label: 'ZENITH'
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Get the sun's position at dusk (sunset).
   */
  function getDuskSun(date = new Date()) {
    try {
      const times = SunCalc.getTimes(date, CONFIG.latitude, CONFIG.longitude);
      const sunset = times.sunset;
      if (!sunset) return null;
      
      const sunPos = getPlanetPosition('Sun', sunset);
      const asc = getAscendant(sunset);
      
      return {
        time: sunset.toISOString(),
        sun: sunPos,
        ascendant: asc,
        label: 'DUSK'
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Get all three solar moments for the day.
   */
  function getSolarMoments(date = new Date()) {
    return {
      dawn: getDawnSun(date),
      zenith: getZenithSun(date),
      dusk: getDuskSun(date)
    };
  }

  // ══════════════════════════════════════════
  // LUNAR MOMENTS — Moon-rise, Moon-set
  // ══════════════════════════════════════════

  /**
   * Get moon-rise time and moon position at rise.
   */
  function getMoonRise(date = new Date()) {
    try {
      const moonTimes = SunCalc.getMoonTimes(date, CONFIG.latitude, CONFIG.longitude);
      const rise = moonTimes.rise;
      if (!rise) return null;
      
      const moonPos = getPlanetPosition('Moon', rise);
      const asc = getAscendant(rise);
      
      return {
        time: rise.toISOString(),
        moon: moonPos,
        ascendant: asc
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Get moon-set time and moon position at set.
   */
  function getMoonSet(date = new Date()) {
    try {
      const moonTimes = SunCalc.getMoonTimes(date, CONFIG.latitude, CONFIG.longitude);
      const set = moonTimes.set;
      if (!set) return null;
      
      const moonPos = getPlanetPosition('Moon', set);
      const asc = getAscendant(set);
      
      return {
        time: set.toISOString(),
        moon: moonPos,
        ascendant: asc
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Get moon illumination and phase data.
   */
  function getMoonData(date = new Date()) {
    try {
      const moonIllum = SunCalc.getMoonIllumination(date);
      const moonPos = getPlanetPosition('Moon', date);
      const phaseIdx = Math.round(moonIllum.phase * 8) % 8;
      
      return {
        phase: MOON_PHASES[phaseIdx],
        phaseIndex: phaseIdx,
        illumination: Math.round(moonIllum.fraction * 100),
        phaseValue: Math.round(moonIllum.phase * 100) / 100,
        position: moonPos,
        deity: (phaseIdx === 0 || phaseIdx === 7) ? 'Melinoe' : 'Artemis',
        isWaning: phaseIdx >= 5
      };
    } catch (e) {
      return {
        phase: 'Unknown',
        phaseIndex: 0,
        illumination: 0,
        phaseValue: 0,
        position: null,
        deity: 'Artemis',
        isWaning: false
      };
    }
  }

  // ══════════════════════════════════════════
  // ZENITH TIME (for any body)
  // ══════════════════════════════════════════

  function getZenithTime(bodyName, date) {
    const body = getAstronomyBody(bodyName);
    if (!body) return null;

    try {
      const observer = new Astronomy.Observer(
        CONFIG.latitude, 
        CONFIG.longitude, 
        CONFIG.elevation
      );
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      
      let bestAltitude = -999;
      let bestTime = null;
      
      for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
        const sampleTime = new Date(searchDate.getTime() + minutes * 60000);
        try {
          const hor = Astronomy.Horizon(sampleTime, observer, body);
          if (hor && typeof hor.altitude === 'number' && hor.altitude > bestAltitude) {
            bestAltitude = hor.altitude;
            bestTime = sampleTime;
          }
        } catch (e) {
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
      // Silent
    }
    return null;
  }

  // ══════════════════════════════════════════
  // SIGN TRANSITS
  // ══════════════════════════════════════════

  function getSignTransits(bodyName, date) {
    const positions = [];
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
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

  // ══════════════════════════════════════════
  // DAILY TRACKING
  // ══════════════════════════════════════════

  function getDailyTracking(date = new Date()) {
    const tracking = {
      date: date.toISOString().split('T')[0],
      sun: null,
      moon: null,
      planets: {},
      events: [],
      // 🜏 NEW: Solar moments
      solarMoments: getSolarMoments(date),
      // 🜏 NEW: Lunar moments
      moonRise: getMoonRise(date),
      moonSet: getMoonSet(date)
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
        solarNoon: times.solarNoon?.toISOString() || null,
        zenith: getZenithTime('Sun', date),
        currentSign: sunPos?.sign || 'Unknown',
        currentGlyph: sunPos?.glyph || '☉',
        currentDegree: sunPos?.degree || 0
      };
    } catch (e) {
      console.warn('Observe: Sun tracking failed:', e.message || e);
    }

    // Moon tracking
    try {
      const moonTimes = SunCalc.getMoonTimes(date, CONFIG.latitude, CONFIG.longitude);
      const moonData = getMoonData(date);
      tracking.moon = {
        rise: moonTimes.rise?.toISOString() || null,
        set: moonTimes.set?.toISOString() || null,
        phase: moonData.phase,
        phaseIndex: moonData.phaseIndex,
        illumination: moonData.illumination,
        phaseValue: moonData.phaseValue,
        deity: moonData.deity,
        isWaning: moonData.isWaning,
        zenith: getZenithTime('Moon', date),
        currentSign: moonData.position?.sign || 'Unknown',
        currentGlyph: moonData.position?.glyph || '☽',
        currentDegree: moonData.position?.degree || 0
      };
    } catch (e) {
      console.warn('Observe: Moon tracking failed:', e.message || e);
    }

    // Sign transits
    tracking.events = [
      ...getSignTransits('Sun', date),
      ...getSignTransits('Moon', date)
    ];

    // Planet tracking
    PLANETS.filter(p => p !== 'Sun' && p !== 'Moon').forEach(planet => {
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
    });

    return tracking;
  }

  // ══════════════════════════════════════════
  // SKY STATE (MAIN ENTRY POINT)
  // ══════════════════════════════════════════

  async function getSkyState() {
    await requestUserLocation();
    
    const now = new Date();
    
    const skyState = {
      timestamp: now.toISOString(),
      period: 'SUN',
      location: {
        latitude: CONFIG.latitude,
        longitude: CONFIG.longitude,
        located: CONFIG.located,
        fallback: CONFIG.located ? null : 'Bucksport, Maine — the Witch\'s Foot'
      },
      solar: {
        sunrise: null,
        sunset: null,
        dawn: null,
        dusk: null,
        solarNoon: null
      },
      // 🜏 NEW: Solar moments (dawn/zenith/dusk)
      solarMoments: null,
      // 🜏 NEW: Lunar rise/set
      moonRise: null,
      moonSet: null,
      // 🜏 NEW: Current ascendant
      ascendant: getAscendant(now),
      moonPhase: {
        name: 'Unknown',
        illumination: 0,
        phase: 0
      },
      planets: {}
    };

    // Solar and lunar data via SunCalc
    try {
      const times = SunCalc.getTimes(now, CONFIG.latitude, CONFIG.longitude);
      const moonData = getMoonData(now);
      
      skyState.period = (now >= times.sunrise && now <= times.sunset) ? 'SUN' : 'MOON';
      
      skyState.solar = {
        sunrise: times.sunrise?.toISOString() || null,
        sunset: times.sunset?.toISOString() || null,
        dawn: times.dawn?.toISOString() || null,
        dusk: times.dusk?.toISOString() || null,
        solarNoon: times.solarNoon?.toISOString() || null
      };
      
      skyState.moonPhase = {
        name: moonData.phase,
        illumination: moonData.illumination,
        phase: moonData.phaseValue,
        deity: moonData.deity,
        isWaning: moonData.isWaning
      };

      // 🜏 Solar moments: dawn, zenith, dusk
      skyState.solarMoments = getSolarMoments(now);
      
      // 🜏 Lunar rise and set
      skyState.moonRise = getMoonRise(now);
      skyState.moonSet = getMoonSet(now);
      
    } catch (e) {
      console.warn('Observe: SunCalc data failed:', e.message || e);
    }

    // Planet positions via astronomy-engine
    PLANETS.forEach(planet => {
      const position = getPlanetPosition(planet, now);
      if (position) {
        skyState.planets[planet.toLowerCase()] = position;
      }
    });

    return skyState;
  }

  // ══════════════════════════════════════════
  // QUICK HELPERS
  // ══════════════════════════════════════════

  function getCurrentPeriod() {
    try {
      const now = new Date();
      const times = SunCalc.getTimes(now, CONFIG.latitude, CONFIG.longitude);
      return (now >= times.sunrise && now <= times.sunset) ? 'SUN' : 'MOON';
    } catch (e) {
      return 'SUN';
    }
  }

  function getMoonAspect() {
    try {
      const moonIllum = SunCalc.getMoonIllumination(new Date());
      const phaseIdx = Math.round(moonIllum.phase * 8) % 8;
      return (phaseIdx === 0 || phaseIdx === 7) ? 'Melinoe' : 'Artemis';
    } catch (e) {
      return 'Artemis';
    }
  }

  function setLocation(lat, lon, elev = 0) {
    CONFIG.latitude = lat;
    CONFIG.longitude = lon;
    CONFIG.elevation = elev;
    CONFIG.located = true;
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
    
    // 🜏 Solar moments
    getSolarMoments,
    getDawnSun,
    getZenithSun,
    getDuskSun,
    
    // 🜏 Lunar moments
    getMoonRise,
    getMoonSet,
    getMoonData,
    
    // 🜏 Ascendant
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
