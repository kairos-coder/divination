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

  function getPlanetPosition(bodyName, date) {
    const body = getAstronomyBody(bodyName);
    if (!body) return null;

    try {
      const earthObserver = new Astronomy.Observer(0, 0, 0);
      
      // Get equatorial coordinates
      const eq = Astronomy.Equator(body, date, earthObserver, true, true);
      
      if (!eq) return null;
      
      // Convert equatorial to ecliptic
      // Astronomy.Ecliptic takes equatorial coordinates and returns ecliptic
      // v2.x: Ecliptic(equ) where equ has .ra and .dec, OR Ecliptic(elon, elat)
      let ecl;
      try {
        // Try passing the equatorial object directly
        ecl = Astronomy.Ecliptic(eq);
      } catch (e1) {
        try {
          // Try with vec
          ecl = Astronomy.Ecliptic(eq.vec);
        } catch (e2) {
          console.warn(`Ecliptic conversion failed for ${bodyName}:`, e2.message);
          return null;
        }
      }
      
      if (!ecl || ecl.elon === undefined) {
        console.warn(`Ecliptic returned no elon for ${bodyName}`);
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
        const locObserver = new Astronomy.Observer(CONFIG.latitude, CONFIG.longitude, CONFIG.elevation);
        const hor = Astronomy.Horizon(date, locObserver, body);
        if (hor && typeof hor.altitude === 'number') {
          altitude = hor.altitude;
          azimuth = hor.azimuth || 0;
          aboveHorizon = altitude > 0;
        }
      } catch (e) {
        // Optional
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
      console.warn(`getPlanetPosition failed for ${bodyName}:`, e.message || e);
      return null;
    }
  }

  function getZenithTime(bodyName, date) {
    const body = getAstronomyBody(bodyName);
    if (!body) return null;

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
    }

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
    }

    tracking.events = [
      ...getSignTransits('Sun', date),
      ...getSignTransits('Moon', date)
    ];

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

    PLANETS.forEach(planet => {
      const position = getPlanetPosition(planet, now);
      if (position) {
        skyState.planets[planet.toLowerCase()] = position;
      }
    });

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

  return {
    getSkyState,
    getCurrentPeriod,
    getMoonAspect,
    getDailyTracking,
    getSignTransits,
    getPlanetPosition,
    getZenithTime,
    setLocation,
    CONFIG,
    SIGNS,
    SIGN_GLYPHS,
    MOON_PHASES
  };
})();
