// pages/api/test-connection.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Key (first 20 chars):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
    
    // Check if env vars exist
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Missing Supabase environment variables',
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      });
    }
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        details: error
      });
    }
    
    console.log('✅ Connection successful!');
    
    // Test all tables exist
    const tables = ['users', 'subscriptions', 'payments'];
    const tableResults = {};
    
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (tableError) {
        console.error(`❌ Table '${table}' error:`, tableError.message);
        tableResults[table] = { success: false, error: tableError.message };
      } else {
        console.log(`✅ Table '${table}' is accessible`);
        tableResults[table] = { success: true };
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Supabase connection working!',
      userCount: data?.length || 0,
      tables: tableResults,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL
    });
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
}