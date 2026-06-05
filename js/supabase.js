/**
 * SUPABASE.JS — DivineDB Client
 * Digital Divination · Ealdforn Republic
 * kairos-coder.github.io/divination
 * 
 * Connected to DivineDB on Supabase.
 * All readings, patterns, and celestial snapshots persist here.
 */

const Gaia = (() => {
  // ══════════════════════════════════════════
  // DIVINEDB CONNECTION
  // ══════════════════════════════════════════
  const SUPABASE_URL = 'https://kzcucjcyxybypncbdbws.supabase.co';  // ← Your URL
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3VjamN5eHlieXBuY2JkYndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzIwMTYsImV4cCI6MjA5MjAwODAxNn0.Z8A74B-Rck1POzWkvMXAnfNP6XObJ-MZxLpvOcAC_ig';                   // ← Your anon key

  let supabase = null;
  let initialized = false;

  function init() {
    if (initialized) return supabase;
    
    try {
      const SupabaseClient = window.supabase?.createClient;
      if (!SupabaseClient) throw new Error('Supabase CDN not loaded');
      
      supabase = SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      initialized = true;
      console.log('🔗 DivineDB connected');
      return supabase;
    } catch (e) {
      console.warn('⚠ DivineDB offline:', e.message);
      return null;
    }
  }

  return {
    get supabase() { return init(); },
    get isConnected() { return initialized && supabase !== null; },

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
      
      if (error) { console.warn('Save failed:', error.message); return null; }
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
      
      return error ? [] : data || [];
    },

    async getReadingById(id) {
      const client = init();
      if (!client) return null;
      const { data } = await client.from('readings').select('*').eq('id', id).single();
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
      
      return error ? null : data;
    },

    async getCelestialHistory(days = 30) {
      const client = init();
      if (!client) return [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data } = await client
        .from('celestial_snapshots')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      return data || [];
    },

    // ─── STATS ─────────────────────────────
    async getStats() {
      const client = init();
      if (!client) return { totalReadings: 0, totalPatterns: 0, totalSyntheses: 0 };
      
      try {
        const [r, p, s] = await Promise.all([
          client.from('readings').select('*', { count: 'exact', head: true }),
          client.from('patterns').select('*', { count: 'exact', head: true }),
          client.from('syntheses').select('*', { count: 'exact', head: true })
        ]);
        return {
          totalReadings: r.count || 0,
          totalPatterns: p.count || 0,
          totalSyntheses: s.count || 0
        };
      } catch (e) {
        return { totalReadings: 0, totalPatterns: 0, totalSyntheses: 0 };
      }
    }
  };
})();
