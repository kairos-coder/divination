/**
 * OBSERVE.JS — Enhanced Sky State Reader
 * Digital Divination · Ealdforn Republic
 */

const Observe = (() => {
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

  function getAstronomyBody(bodyName) {
    if (typeof Astronomy === 'undefined' || !Astronomy.Body) {
      return null;
    }
    
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

  function getPlanetPosition(bodyName, date) {
    const body = getAstronomyBody(bodyName);
    if (!body) {
      console.warn(`Could not resolve body: ${bodyName}`);
      return null;
    }

    try {
      // TEST: Try different parameter combinations
      let eq;
      
      // Try 1: Standard v2.x call
      try {
        eq = Astronomy.Equator(body, date, null, true, true);
      } catch (e1) {
        console.warn(`Equator call 1 failed for ${bodyName}:`, e1);
        
        // Try 2: Without the last two parameters
        try {
          eq = Astronomy.Equator(body, date, null);
        } catch (e2) {
          console.warn(`Equator call 2 failed for ${bodyName}:`, e2);
          
          // Try 3: With observer object
          try {
            const observer = new Astronomy.Observer(CONFIG.latitude, CONFIG.longitude, CONFIG.elevation);
            eq = Astronomy.Equator(body, date, observer);
          } catch (e3) {
            console.warn(`Equator call 3 failed for ${bodyName}:`, e3);
            return null;
          }
        }
      }
      
      if (!eq) {
        console.warn(`Equator returned null for ${bodyName}`);
        return null;
      }
      
      console.log(`${bodyName} Equator result:`, eq);
      
      // Try to get ecliptic longitude
      let lon;
      if (eq.elon !== undefined) {
        lon = eq.elon; // v2.x returns degrees directly
      } else if (eq.lon !== undefined) {
        lon = eq.lon;
      } else if (eq.ra !== undefined) {
        // If we only have equatorial coordinates, approximate ecliptic longitude
        // This is a rough approximation
        lon = eq.ra * 15; // Convert hours to degrees
        console.warn(`Using RA approximation for ${bodyName} ecliptic longitude`);
      } else {
        console.error(`Cannot extract longitude for ${bodyName}:`, Object.keys(eq));
        return null;
      }
      
      // Add precession correction
      const daysSinceJ2000 = (date - new Date(Date.UTC(2000, 0, 1, 12, 0, 0))) / (1000 * 60 * 60 * 24);
      const centuries = daysSinceJ2000 / 36525;
      const precession = (0.01397 * centuries) * 360;
      
      lon = (lon + precession) % 360;
      if (lon < 0) lon += 360;
      
      const sign = eclipticToSign(lon);
      const degree = getDegreeInSign(lon);

      // Calculate horizon position
      let altitude = 0;
      let azimuth = 0;
      let aboveHorizon = false;
      
      try {
        if (Astronomy.Observer && Astronomy.Horizon) {
          const observer = new Astronomy.Observer(CONFIG.latitude, CONFIG.longitude, CONFIG.elevation);
          const hor = Astronomy.Horizon(date, observer, body);
          
          if (hor && hor.altitude !== undefined) {
            altitude = hor.altitude;
            azimuth = hor.azimuth || 0;
            aboveHorizon = altitude > 0;
          }
        }
      } catch (e) {
        // Horizon calculation optional
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
      console.error(`Unexpected error getting ${bodyName} position:`, e);
      return null;
    }
  }

  function getZenithTime(bodyName, date) {
    const body = getAstronomyBody(bodyName);
    if (!body || !Astronomy.Observer || !Astronomy.Horizon) return null;

    try {
      const observer = new Astronomy.Observer(CONFIG.latitude, CONFIG.longitude, CONFIG.elevation);
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      
      let bestAltitude = -999;
      let bestTime = null;
      
      for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
        const sampleTime = new Date(searchDate.getTime() + minutes * 60000);
        
        try {
          const hor = Astronomy.Horizon(sampleTime, observer, body);
          if (hor && hor.altitude !== undefined && hor.altitude > bestAltitude) {
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
      console.warn(`Zenith calculation failed for ${bodyName}:`, e);
    }
    return null;
  }

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
      tracking.sun = {
        rise: times.sunrise?.toISOString() || null,
        set: times.sunset?.toISOString() || null,
        dawn: times.dawn?.toISOString() || null,
        dusk: times.dusk?.toISOString() || null,
        zenith: getZenithTime('Sun', date),
        currentSign: 'Unknown',
        currentGlyph: '☉'
      };
      
      const sunPos = getPlanetPosition('Sun', date);
      if (sunPos) {
        tracking.sun.currentSign = sunPos.sign;
        tracking.sun.currentGlyph = sunPos.glyph;
      }
    } catch (e) {
      console.warn('Sun tracking failed:', e);
    }

    // Moon tracking
    try {
      const moonTimes = SunCalc.getMoonTimes(date, CONFIG.latitude, CONFIG.longitude);
      const moonIllum = SunCalc.getMoonIllumination(date);
      
      tracking.moon = {
        rise: moonTimes.rise?.toISOString() || null,
        set: moonTimes.set?.toISOString() || null,
        phase: MOON_PHASES[Math.round(moonIllum.phase * 8) % 8],
        illumination: Math.round(moonIllum.fraction * 100),
        phaseValue: Math.round(moonIllum.phase * 100) / 100,
        zenith: getZenithTime('Moon', date),
        currentSign: 'Unknown',
        currentGlyph: '☽'
      };
      
      const moonPos = getPlanetPosition('Moon', date);
      if (moonPos) {
        tracking.moon.currentSign = moonPos.sign;
        tracking.moon.currentGlyph = moonPos.glyph;
      }
    } catch (e) {
      console.warn('Moon tracking failed:', e);
    }

    // Sign transits
    tracking.events = [
      ...getSignTransits('Sun', date),
      ...getSignTransits('Moon', date)
    ];

    // Other planets
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

  async function getSkyState() {
    const now = new Date();
    
    const skyState = {
      timestamp: now.toISOString(),
      period: 'SUN',
      location: { latitude: CONFIG.latitude, longitude: CONFIG.longitude },
      solar: { sunrise: null, sunset: null, dawn: null, dusk: null },
      ascendant: { sign: 'Unknown', glyph: '?', longitude: 0 },
      moonPhase: { name: 'Unknown', illumination: 0, phase: 0 },
      planets: {}
    };

    try {
      const times = SunCalc.getTimes(now, CONFIG.latitude, CONFIG.longitude);
      const moonIllum = SunCalc.getMoonIllumination(now);
      
      skyState.period = (now >= times.sunrise && now <= times.sunset) ? 'SUN' : 'MOON';
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

      // Ascendant
      const gmt = now.getUTCHours() + now.getUTCMinutes() / 60;
      const jd = (now - new Date(Date.UTC(2000, 0, 1, 12, 0, 0))) / (1000 * 60 * 60 * 24) + 2451545.0;
      const lst = (100.46 + 0.985647 * jd + CONFIG.longitude + 15 * gmt) % 360;
      const ascendantLon = Math.atan2(Math.sin(lst * Math.PI / 180), Math.cos(lst * Math.PI / 180)) * 180 / Math.PI;
      
      skyState.ascendant = {
        sign: eclipticToSign(ascendantLon),
        glyph: SIGN_GLYPHS[eclipticToSign(ascendantLon)],
        longitude: Math.round(ascendantLon * 100) / 100
      };
    } catch (e) {
      console.warn('SunCalc data failed:', e);
    }

    // Get planet positions
    console.log('Getting planet positions...');
    PLANETS.forEach(planet => {
      const position = getPlanetPosition(planet, now);
      if (position) {
        skyState.planets[planet.toLowerCase()] = position;
      }
    });
    console.log('Got positions for:', Object.keys(skyState.planets));

    return skyState;
  }

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
  }

  async function testSkyState() {
    console.log('=== TESTING ASTRONOMY ENGINE ===');
    console.log('Astronomy version check:');
    console.log('  Body.Sun:', Astronomy.Body.Sun);
    
    // Test single call
    console.log('\nTesting Equator call for Sun:');
    try {
      const result = Astronomy.Equator(Astronomy.Body.Sun, new Date(), null, true, true);
      console.log('  Result:', result);
      console.log('  elon:', result?.elon);
    } catch (e) {
      console.error('  Error:', e);
    }
    
    const state = await getSkyState();
    console.log('\nSky State:', state);
    return state;
  }

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
