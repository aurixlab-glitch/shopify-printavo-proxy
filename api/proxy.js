// This runs as a serverless function on Vercel
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('Proxying request to Printavo...');
    
    // Your Printavo credentials
    const PRINTAVO_CONFIG = {
      apiUrl: 'https://www.printavo.com/api/v2',
      email: 'aurixlab@gmail.com',
      token: 'Sb3OElnenVelaFw8-xGz5A'
    };
    
    // Forward request to Printavo
    const response = await fetch(PRINTAVO_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'email': PRINTAVO_CONFIG.email,
        'token': PRINTAVO_CONFIG.token
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.json();
    
    console.log('Printavo response:', data);
    
    // Return response
    res.status(200).json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message 
    });
  }
};
