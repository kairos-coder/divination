/**
 * ARCANA.JS — The Major Arcana Deck
 * 22 + 1 cards mapped to Greek Olympians & Primordials
 * Digital Divination · Ealdforn Republic
 */
const Arcana = (() => {
  const deck = { /* your full deck JSON here */ };
  
  // ── PUBLIC API ──────────────────────────────────────────────────────────
  
  /** Get a card by its ID */
  function getCard(id) {
    return deck.cards.find(c => c.id === id) || null;
  }
  
  /** Get all cards ruled by a specific god */
  function getCardsByGod(godName) {
    return deck.cards.filter(c => 
      c.ruling_god && c.ruling_god.toLowerCase() === godName.toLowerCase()
    );
  }
  
  /** Get the triad cards for an element */
  function getTriad(element) {
    const suit = deck.divine_suits[element.toLowerCase()];
    if (!suit) return [];
    return suit.cards.map(id => getCard(id)).filter(Boolean);
  }
  
  /** Get the ruling triad gods for an element */
  function getTriadGods(element) {
    const suit = deck.divine_suits[element.toLowerCase()];
    return suit ? suit.ruling_triad : [];
  }
  
  /** Get all unsuited cards (threshold/void cards) */
  function getUnsuited() {
    return deck.unsuited.map(id => getCard(id)).filter(Boolean);
  }
  
  /** Map a chthonic resident name to their Arcana card */
  const CHTHONIC_CARD_MAP = {
    // Fire — Phlegethon
    'Hecate':    'major_18',  // The Moon
    'Zagreus':   'major_13',  // Death
    'Melinoë':   'major_18',  // The Moon (shares with Hecate)
    
    // Air — Cocytus
    'Hypnos':    'major_12',  // The Hanged Man
    'Angelos':   'major_20',  // Judgement
    'Oneiroi':   'major_17',  // The Star
    
    // Earth — Acheron
    'Thanatos':  'major_13',  // Death
    'Minos':     'major_20',  // Judgement
    'Rhadamanthus': 'major_20', // Judgement
    'Aeacus':    'major_09',  // The Hermit
    'Cerberus':  'major_11',  // Strength (Hephaestus — but unsuited here)
    
    // Water — Styx
    'Styx':      'major_02',  // The High Priestess
    'Charon':    'major_07',  // The Chariot (threshold crossing)
    'Nyx':       'major_18',  // The Moon
    'Erinyes':   'major_16',  // The Tower
    
    // Primordial
    'Chaos':     'major_00',  // The Fool
    
    // Threshold
    'Hades':     'major_15',  // The Devil
  };
  
  /** Get the Major Arcana card for a chthonic resident */
  function getChthonicCard(residentName) {
    const cardId = CHTHONIC_CARD_MAP[residentName];
    return cardId ? getCard(cardId) : null;
  }
  
  /** Get the element for a card */
  function getCardElement(card) {
    return card?.element || null;
  }
  
  /** Check if a card is suited (belongs to an Olympian triad) */
  function isSuited(card) {
    return card?.element !== null && card?.ruling_god !== null;
  }
  
  /** Check if a card is unsuited (threshold/void territory) */
  function isUnsuited(card) {
    return card?.element === null || card?.ruling_god === null;
  }
  
  /** Get the hidden card */
  function getHidden() {
    return deck.hidden_card;
  }
  
  /** Get deck metadata */
  function getDeckInfo() {
    return {
      name: deck.deck_name,
      cardCount: deck.card_count,
      hiddenCount: deck.hidden_count,
      divineSuits: deck.divine_suits,
      unsuitedCount: deck.unsuited.length
    };
  }
  
  return {
    deck,
    getCard,
    getCardsByGod,
    getTriad,
    getTriadGods,
    getUnsuited,
    getChthonicCard,
    getCardElement,
    isSuited,
    isUnsuited,
    getHidden,
    getDeckInfo,
    CHTHONIC_CARD_MAP
  };
})();
