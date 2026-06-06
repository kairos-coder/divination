/**
 * CHTHONIC.JS — The Underworld Claims the Void
 * Digital Divination · Ealdforn Republic
 * 
 * When the 12 Olympians abandon a zodiac sign, the Underworld rises.
 * Each empty sign is claimed by a Chthonic resident based on element:
 *   Fire   → Hecate, Phlegethon forces
 *   Earth  → Thanatos, Minos, Rhadamanthus, Aeacus (Judges)
 *   Air    → Hypnos, Oneiroi, Angelos
 *   Water  → Styx, Charon, Nyx, Erinyes
 * 
 * Hades/Pluto is always the threshold — the gate between worlds.
 * 
 * Usage:
 *   const occupant = Chthonic.claim('Leo', planets);
 *   // { name: 'Hecate', title: 'Torchbearer', river: 'Phlegethon', ... }
 */

const Chthonic = (() => {
  // ══════════════════════════════════════════
  // THE UNDERWORLD PANTHEON
  // ══════════════════════════════════════════

  /**
   * FIRE — Phlegethon (River of Fire)
   * Hecate rules the burning void. Zagreus runs ahead. Melinoë haunts the edge.
   */
  const FIRE_RESIDENTS = [
    {
      name: 'Hecate',
      title: 'Torchbearer of the Crossroads',
      river: 'Phlegethon',
      domain: 'Boundaries, thresholds, the burning path between',
      glyph: '🏮',
      whisper: 'Hecate does not ask what door you came through. She asks what door you are afraid to open.'
    },
    {
      name: 'Zagreus',
      title: 'The First Dionysus',
      river: 'Phlegethon',
      domain: 'Rebirth through fire, the hunt that never ends',
      glyph: '🏹',
      whisper: 'Zagreus was torn apart and remade. The fire that destroyed him also birthed him. You are not your first form.'
    },
    {
      name: 'Melinoë',
      title: 'The Phantom Queen',
      river: 'Phlegethon',
      domain: 'Ghosts, madness, the fire that burns without consuming',
      glyph: '👻',
      whisper: 'Melinoë walks where the fire casts no shadow. The ghosts are not haunting you — they are trying to finish something.'
    }
  ];

  /**
   * EARTH — Acheron (River of Woe) + Judgment
   * The Three Judges hold court. Thanatos reaps. Cerberus guards.
   */
  const EARTH_RESIDENTS = [
    {
      name: 'Thanatos',
      title: 'The Gentle Reaper',
      river: 'Acheron',
      domain: 'Peaceful endings, the weight of what settles into earth',
      glyph: '💀',
      whisper: 'Thanatos is not the enemy of life. He is the enemy of clinging to what is already done.'
    },
    {
      name: 'Minos',
      title: 'Judge of the Final Verdict',
      river: 'Acheron',
      domain: 'Judgment, the weighing of deeds, what cannot be appealed',
      glyph: '⚖️',
      whisper: 'Minos does not judge your intentions. He judges what you did with them. The earth remembers.'
    },
    {
      name: 'Rhadamanthus',
      title: 'Judge of the Eastern Dead',
      river: 'Acheron',
      domain: 'Justice without mercy, the law as it is written in the bones',
      glyph: '📜',
      whisper: 'Rhadamanthus reads the law that was carved before the gods. Even Zeus cannot overrule what the earth has already recorded.'
    },
    {
      name: 'Aeacus',
      title: 'Judge of the Western Dead',
      river: 'Acheron',
      domain: 'The key to the earth\'s gate, what is buried and what is kept',
      glyph: '🗝️',
      whisper: 'Aeacus holds the keys to the earth. What you bury is not gone. It is simply under his jurisdiction now.'
    },
    {
      name: 'Cerberus',
      title: 'Guardian of the Gate',
      river: 'Acheron',
      domain: 'Thresholds, vigilance, what must not pass',
      glyph: '🐕',
      whisper: 'Cerberus does not guard against the dead leaving. He guards against the living entering without respect.'
    }
  ];

  /**
   * AIR — Cocytus (River of Lamentation) + Dreams
   * Hypnos weaves dreams. The Oneiroi drift. Angelos carries messages.
   */
  const AIR_RESIDENTS = [
    {
      name: 'Hypnos',
      title: 'The Dream-Weaver',
      river: 'Cocytus',
      domain: 'Sleep, illusion, the fog between thoughts',
      glyph: '🌫️',
      whisper: 'Hypnos walks the Air signs when the gods abandon them. What is not occupied by clarity is occupied by dream.'
    },
    {
      name: 'Angelos',
      title: 'The Underworld Messenger',
      river: 'Cocytus',
      domain: 'Messages from beneath, truths that travel upward',
      glyph: '🪽',
      whisper: 'Angelos carries what the dead want the living to know. The message is not always welcome. It is always true.'
    },
    {
      name: 'Oneiroi',
      title: 'The Dream Spirits',
      river: 'Cocytus',
      domain: 'Collective dreams, the shared unconscious, what floats through the dark',
      glyph: '💭',
      whisper: 'The Oneiroi do not send individual dreams. They send the dreams that belong to everyone — the ones you thought were only yours.'
    }
  ];

  /**
   * WATER — Styx (River of Oaths) + Lethe (River of Forgetting)
   * Styx binds oaths. Charon ferries. Nyx watches. Erinyes pursue.
   */
  const WATER_RESIDENTS = [
    {
      name: 'Styx',
      title: 'The Oath-Binder',
      river: 'Styx',
      domain: 'Unbreakable promises, the river between worlds, what cannot be taken back',
      glyph: '🌊',
      whisper: 'Styx holds Water signs when the Olympians turn away. What you swear here, even to yourself, is binding.'
    },
    {
      name: 'Charon',
      title: 'The Ferryman',
      river: 'Styx',
      domain: 'Passage, transition, the crossing that must be paid for',
      glyph: '🛶',
      whisper: 'Charon does not ask where you are going. He asks what you brought to pay for the crossing. Nothing crosses free.'
    },
    {
      name: 'Nyx',
      title: 'The Primordial Night',
      river: 'Lethe',
      domain: 'Darkness before the gods, the night that even Zeus fears',
      glyph: '🌑',
      whisper: 'Nyx was here before Olympus. She will be here after. The night does not negotiate with the day.'
    },
    {
      name: 'Erinyes',
      title: 'The Furies',
      river: 'Lethe',
      domain: 'Vengeance, pursued truth, what cannot be outrun',
      glyph: '🐍',
      whisper: 'The Erinyes do not punish. They pursue. What you flee from has more stamina than you do.'
    }
  ];

  /**
   * PRIMORDIAL — When all signs of an element are empty
   * The oldest forces emerge from Chaos itself
   */
  const PRIMORDIAL = {
    name: 'Chaos',
    title: 'The First Void',
    river: 'All Rivers',
    domain: 'Before form, before order, before the gods themselves',
    glyph: '⛧',
    whisper: 'Chaos does not threaten. Chaos simply is — and always was, and always will be. The gods emerged from here. They have not forgotten.'
  };

  /**
   * HADES — Always present as the threshold
   * Pluto's sign is the gate between Olympus and the Underworld
   */
  const HADES = {
    name: 'Hades',
    title: 'The Gatekeeper',
    river: 'All Rivers',
    domain: 'The threshold, the wealth beneath, what must pass through death to be reborn',
    glyph: '👑',
    whisper: 'Hades does not guard the dead. He guards the gate. What passes through him is transformed — not ended, but changed.'
  };

  // ══════════════════════════════════════════
  // SIGN → ELEMENT MAP
  // ══════════════════════════════════════════
  const SIGN_ELEMENTS = {
    Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
    Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
    Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water'
  };

  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

  // ══════════════════════════════════════════
  // RESIDENT ALLOCATION
  // ══════════════════════════════════════════

  /** Count Olympian planets in a sign */
  function countOlympiansInSign(planets, sign) {
    return Object.values(planets || {}).filter(p => p && p.sign === sign).length;
  }

  /** Check if ALL signs of an element are empty */
  function isElementFullyVoid(planets, element) {
    const signsOfElement = SIGNS.filter(s => SIGN_ELEMENTS[s] === element);
    return signsOfElement.every(s => countOlympiansInSign(planets, s) === 0);
  }

  /**
   * Claim a sign for the Underworld
   * Returns the Chthonic resident who holds this empty sign
   * Returns null if Olympians occupy the sign
   */
  function claim(sign, planets) {
    const olympianCount = countOlympiansInSign(planets, sign);
    if (olympianCount > 0) return null; // Olympians hold this house
    
    const element = SIGN_ELEMENTS[sign];
    if (!element) return null;
    
    // If all signs of this element are empty → Primordial Chaos
    if (isElementFullyVoid(planets, element)) {
      return { ...PRIMORDIAL, element, isPrimordial: true };
    }
    
    // Pick a resident based on the sign's position within its element
    // First sign gets first resident, second gets second, etc.
    const elementSigns = SIGNS.filter(s => SIGN_ELEMENTS[s] === element);
    const signIndex = elementSigns.indexOf(sign);
    
    let residents;
    switch(element) {
      case 'Fire':  residents = FIRE_RESIDENTS; break;
      case 'Earth': residents = EARTH_RESIDENTS; break;
      case 'Air':   residents = AIR_RESIDENTS; break;
      case 'Water': residents = WATER_RESIDENTS; break;
      default: return null;
    }
    
    // Rotate through residents based on sign position
    const resident = residents[signIndex % residents.length];
    
    return {
      ...resident,
      element,
      isPrimordial: false,
      sign
    };
  }

  /**
   * Get all claimed signs with their Underworld residents
   */
  function getAllClaims(planets) {
    return SIGNS.map(sign => ({
      sign,
      olympianCount: countOlympiansInSign(planets, sign),
      chthonic: claim(sign, planets)
    }));
  }

  /**
   * Get the Underworld resident pool for a specific element
   */
  function getResidents(element) {
    switch(element) {
      case 'Fire':  return [...FIRE_RESIDENTS];
      case 'Earth': return [...EARTH_RESIDENTS];
      case 'Air':   return [...AIR_RESIDENTS];
      case 'Water': return [...WATER_RESIDENTS];
      default: return [];
    }
  }

  /**
   * Get Hades' position as the threshold
   */
  function getThreshold(planets) {
    const pluto = planets?.pluto;
    if (!pluto || !pluto.sign) return null;
    return {
      ...HADES,
      sign: pluto.sign,
      degree: pluto.degree,
      isThreshold: true
    };
  }

  /**
   * War report — Olympian vs Chthonic control
   */
  function getWarReport(planets) {
    const claims = getAllClaims(planets);
    const olympianHouses = claims.filter(c => c.olympianCount > 0);
    const chthonicHouses = claims.filter(c => c.olympianCount === 0);
    
    const byElement = {};
    ['Fire','Earth','Air','Water'].forEach(e => {
      const elementClaims = chthonicHouses.filter(c => SIGN_ELEMENTS[c.sign] === e);
      byElement[e] = {
        count: elementClaims.length,
        signs: elementClaims.map(c => c.sign),
        isFullyVoid: isElementFullyVoid(planets, e),
        residents: elementClaims.map(c => c.chthonic?.name).filter(Boolean)
      };
    });
    
    return {
      olympianHouses: olympianHouses.length,
      chthonicHouses: chthonicHouses.length,
      threshold: getThreshold(planets),
      byElement,
      dominant: olympianHouses.length > chthonicHouses.length ? 'Olympian' : 'Chthonic',
      claims
    };
  }

  /**
   * Get all named Underworld residents (for display)
   */
  function getPantheon() {
    return {
      fire: FIRE_RESIDENTS.map(r => ({ ...r, element: 'Fire' })),
      earth: EARTH_RESIDENTS.map(r => ({ ...r, element: 'Earth' })),
      air: AIR_RESIDENTS.map(r => ({ ...r, element: 'Air' })),
      water: WATER_RESIDENTS.map(r => ({ ...r, element: 'Water' })),
      primordial: PRIMORDIAL,
      hades: HADES
    };
  }

  // ══════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════
  return {
    // Core
    claim,
    getAllClaims,
    getResidents,
    getThreshold,
    getWarReport,
    getPantheon,
    
    // Data
    SIGN_ELEMENTS,
    SIGNS,
    
    // Residents
    FIRE_RESIDENTS,
    EARTH_RESIDENTS,
    AIR_RESIDENTS,
    WATER_RESIDENTS,
    PRIMORDIAL,
    HADES,
    
    // Utility
    countOlympiansInSign,
    isElementFullyVoid
  };
})();
