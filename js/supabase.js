/**
 * SUPABASE.JS — DivineDB Client
 * Digital Divination · Ealdforn Republic
 * kairos-coder.github.io/divination
 */

const Gaia = (() => {
  const SUPABASE_URL = 'https://kzcucjcyxybypncbdbws.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3VjamN5eHlieXBuY2JkYndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzIwMTYsImV4cCI6MjA5MjAwODAxNn0.Z8A74B-Rck1POzWkvMXAnfNP6XObJ-MZxLpvOcAC_ig';

  let supabase = null;
  let initialized = false;

  function init() {
    if (initialized && supabase) return supabase;
    
    console.log('🔌 Attempting DivineDB connection...');
    console.log('  URL:', SUPABASE_URL);
    console.log('  Key prefix:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
    console.log('  window.supabase:', typeof window.supabase);
    
    try {
      // Check if Supabase CDN loaded
      if (typeof window.supabase === 'undefined') {
        throw new Error('Supabase CDN not loaded. Missing: <script src="supabase-js">');
      }
      
      if (typeof window.supabase.createClient !== 'function') {
        throw new Error('window.supabase.createClient is not a function. Type: ' + typeof window.supabase.createClient);
      }
      
      // Create client
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      if (!supabase) {
        throw new Error('createClient returned null');
      }
      
      initialized = true;
      console.log('✅ DivineDB connected successfully!');
      
      // Test the connection
      testConnection();
      
      return supabase;
    } catch (e) {
      console.error('❌ DivineDB connection failed:', e.message);
      console.error('  Error details:', e);
      return null;
    }
  }

  async function testConnection() {
    if (!supabase) return;
    try {
      const { data, error, count } = await supabase
        .from('readings')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.warn('⚠ DivineDB test query failed:', error.message);
        console.warn('  Code:', error.code);
        console.warn('  Details:', error.details);
        console.warn('  Hint:', error.hint);
        console.warn('  Make sure you ran the SQL to create the readings table.');
      } else {
        console.log('✅ DivineDB test query successful! Readings count:', count);
      }
    } catch (e) {
      console.warn('⚠ DivineDB test query error:', e.message);
    }
  }

  return {
    get supabase() { return init(); },
    get isConnected() { return initialized && supabase !== null; },

    async saveReading(reading) {
      const client = init();
      if (!client) {
        console.warn('⚠ Cannot save: DivineDB not connected');
        return null;
      }
      
      console.log('📖 Saving reading to DivineDB...');
      
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
        console.error('❌ Save failed:', error.message);
        console.error('  Code:', error.code);
        console.error('  Details:', error.details);
        return null; 
      }
      
      console.log('✅ Reading saved to DivineDB:', data?.id);
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
        console.warn('Get readings failed:', error.message);
        return [];
      }
      
      return data || [];
    },

    async getStats() {
      const client = init();
      if (!client) return { totalReadings: 0 };
      
      try {
        const { count, error } = await client
          .from('readings')
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.warn('Stats failed:', error.message);
          return { totalReadings: 0 };
        }
        
        return { totalReadings: count || 0 };
      } catch (e) {
        return { totalReadings: 0 };
      }
    }
  };
})();
