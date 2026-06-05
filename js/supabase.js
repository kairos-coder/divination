const Gaia = (() => {
  const SUPABASE_URL = 'https://kzcucjcyxybypncbdbws.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3VjamN5eHlieXBuY2JkYndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzIwMTYsImV4cCI6MjA5MjAwODAxNn0.Z8A74B-Rck1POzWkvMXAnfNP6XObJ-MZxLpvOcAC_ig';

  let supabase = null;
  let initialized = false;

  function init() {
    if (initialized && supabase) return supabase;
    
    console.log('🔌 Attempting DivineDB connection...');
    
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase CDN not loaded');
      return null;
    }
    
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    initialized = true;
    console.log('✅ DivineDB connected');
    
    return supabase;
  }

  return {
    get supabase() { return init(); },
    get isConnected() { return initialized && supabase !== null; },

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
          cards: reading.cards
        }])
        .select()
        .single();
      
      if (error) { console.warn('Save failed:', error.message); return null; }
      console.log('📖 Saved to DivineDB');
      return data;
    },

    async getReadings(limit = 50) {
      const client = init();
      if (!client) return [];
      const { data } = await client.from('readings').select('*').order('timestamp', { ascending: false }).limit(limit);
      return data || [];
    },

    async getStats() {
      const client = init();
      if (!client) return { totalReadings: 0 };
      try {
        const { count } = await client.from('readings').select('*', { count: 'exact', head: true });
        return { totalReadings: count || 0 };
      } catch (e) {
        return { totalReadings: 0 };
      }
    }
  };
})();
