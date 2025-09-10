// pages/api/test-raw.js
export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Testing raw HTTP request to Supabase...');
    console.log('URL:', supabaseUrl);
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Missing environment variables',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
    }
    
    // Test raw fetch to Supabase REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/users?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    const data = await response.text();
    console.log('Response data:', data);
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: 'HTTP request failed',
        status: response.status,
        data: data
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Raw HTTP request successful!',
      status: response.status,
      data: JSON.parse(data)
    });
    
  } catch (err) {
    console.error('Raw request error:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      type: err.constructor.name
    });
  }
}