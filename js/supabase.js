/**
 * SUPABASE.JS — Database Client
 * Digital Divination · Ealdforn Republic
 * 
 * Initializes and exports the Supabase client for all modules.
 * Drop your URL and anon key below.
 * 
 * Usage:
 *   const { data, error } = await Gaia.supabase
 *     .from('readings')
 *     .insert({ ... });
 */

const Gaia = (() => {
  // ══════════════════════════════════════════
  // CONFIG — DROP YOUR CREDENTIALS HERE
  // ══════════════════════════════════════════
  const SUPABASE_URL = 'https://kzcucjcyxybypncbdbws.supabase.co;  // ← Your URL
  const SUPABASE_ANON_KEY = 'sb_publishable_saeUHGocDah-T2_709M6Fg_g26JtLXw';                   // ← Your anon key

  // ══════════════════════════════════════════
  // INITIALIZE
  // ══════════════════════════════════════════
  let supabase = null;
  let initialized = false;
  let initError = null;

  function init() {
    if (initialized) return supabase;
    
    try {
      // Check if Supabase CDN script loaded
      if (typeof supabase === 'undefined' && typeof window.supabase === 'undefined') {
        throw new Error('Supabase JS client not loaded. Add: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>');
      }
      
      // Use the global supabase if available, otherwise check window
      const SupabaseClient = window.supabase?.createClient || supabase?.createClient;
      
      if (!SupabaseClient) {
        throw new Error('Supabase createClient not found');
      }
      
      supabase = SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      initialized = true;
      console.log('🔗 Gaia connected to Supabase');
      
      return supabase;
    } catch (e) {
      initError = e.message;
      console.warn('⚠ Gaia Supabase not connected:', e.message);
      console.warn('Readings will be stored locally only.');
      return null;
    }
  }

  // ══════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════
  return {
    get supabase() {
      return init();
    },
    
    get isConnected() {
      return initialized && supabase !== null;
    },
    
    get error() {
      return initError;
    },
    
    // ─── READINGS ──────────────────────────
    async saveReading(reading) {
      const client = init();
      if (!client) return null;
      
      const { data, error } = await client
        .from('readings')
        .insert([{
          id: reading.id,
          question: reading.question,
          timestamp: reading.timestamp,
          sky_context: reading.skyContext,
          cards: reading.cards,
          synthesis: reading.synthesis || null
        }])
        .select()
        .single();
      
      if (error) {
        console.warn('Failed to save reading to Supabase:', error.message);
        return null;
      }
      
      return data;
    },

    async getReadings(limit = 50) {
      const client = init();
      if (!client) return [];
      
      const { data, error } = await client
        .from('readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.warn('Failed to fetch readings:', error.message);
        return [];
      }
      
      return data || [];
    },

    async getReadingById(id) {
      const client = init();
      if (!client) return null;
      
      const { data, error } = await client
        .from('readings')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) return null;
      return data;
    },

    // ─── CELESTIAL SNAPSHOTS ───────────────
    async saveCelestialSnapshot(snapshot) {
      const client = init();
      if (!client) return null;
      
      const { data, error } = await client
        .from('celestial_snapshots')
        .upsert([{
          date: snapshot.date,
          sun_sign: snapshot.sunSign,
          moon_sign: snapshot.moonSign,
          moon_phase: snapshot.moonPhase,
          planets: snapshot.planets,
          ascendant: snapshot.ascendant
        }])
        .select()
        .single();
      
      if (error) {
        console.warn('Failed to save celestial snapshot:', error.message);
        return null;
      }
      
      return data;
    },

    async getCelestialHistory(days = 30) {
      const client = init();
      if (!client) return [];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await client
        .from('celestial_snapshots')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) return [];
      return data || [];
    },

    // ─── PATTERNS ──────────────────────────
    async savePattern(pattern) {
      const client = init();
      if (!client) return null;
      
      const { data, error } = await client
        .from('patterns')
        .insert([{
          pattern_type: pattern.patternType,
          description: pattern.description,
          strength: pattern.strength || 1,
          cards: pattern.cards || [],
          elements: pattern.elements || [],
          discovered_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) return null;
      return data;
    },

    async getPatterns() {
      const client = init();
      if (!client) return [];
      
      const { data, error } = await client
        .from('patterns')
        .select('*')
        .order('strength', { ascending: false })
        .limit(20);
      
      if (error) return [];
      return data || [];
    },

    // ─── SYNTHESES ─────────────────────────
    async saveSynthesis(synthesis) {
      const client = init();
      if (!client) return null;
      
      const { data, error } = await client
        .from('syntheses')
        .insert([{
          reading_id: synthesis.readingId,
          synthesis_text: synthesis.synthesis,
          patterns: synthesis.patterns || [],
          titan: synthesis.titan || 'Hyperion',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) return null;
      return data;
    },

    // ─── STATS ─────────────────────────────
    async getStats() {
      const client = init();
      if (!client) return null;
      
      try {
        const [readingsCount, patternsCount, synthesesCount] = await Promise.all([
          client.from('readings').select('*', { count: 'exact', head: true }),
          client.from('patterns').select('*', { count: 'exact', head: true }),
          client.from('syntheses').select('*', { count: 'exact', head: true })
        ]);
        
        return {
          totalReadings: readingsCount.count || 0,
          totalPatterns: patternsCount.count || 0,
          totalSyntheses: synthesesCount.count || 0
        };
      } catch (e) {
        return null;
      }
    }
  };
})();
