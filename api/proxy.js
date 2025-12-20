// api/proxy.js
// FIXED V1 REST API Version - Properly sends data to Printavo

const PRINTAVO_CONFIG = {
  apiUrlV1: 'https://www.printavo.com/api/v1',
  email: 'aurixlab@gmail.com',
  token: 'Dw9WsBffRzogNyfOCEhswA'
};

const ALLOWED_ORIGINS = [
  'https://budgetpromotion.myshopify.com',
  'https://www.budgetpromotion.com',
  'http://localhost:3000'
];

module.exports = async (req, res) => {
  // CORS headers
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    const isAllowed = ALLOWED_ORIGINS.some(allowed => 
      origin.includes(allowed.replace('https://', '').replace('http://', ''))
    );
    res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      api: 'v1',
      service: 'Printavo V1 REST Proxy',
      timestamp: new Date().toISOString(),
      credentials: {
        email: PRINTAVO_CONFIG.email ? '✅ Set' : '❌ Missing',
        token: PRINTAVO_CONFIG.token ? '✅ Set' : '❌ Missing'
      }
    });
  }
  
  // Process POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('==========================================');
    console.log('📥 V1 API Request from:', origin || 'unknown');
    console.log('Time:', new Date().toISOString());
    
    if (!req.body || !req.body.endpoint) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Body must include "endpoint" field (e.g., "orders", "customers")'
      });
    }
    
    const { endpoint, method = 'GET', data = null } = req.body;
    
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    // Build URL with auth params
    const url = new URL(`${PRINTAVO_CONFIG.apiUrlV1}/${endpoint}`);
    url.searchParams.append('email', PRINTAVO_CONFIG.email);
    url.searchParams.append('token', PRINTAVO_CONFIG.token);
    
    console.log('📤 Calling:', method, url.pathname);
    console.log('📋 Data being sent:', JSON.stringify(data, null, 2));
    
    // Make request to Printavo v1
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    // CRITICAL FIX: Properly send data in request body
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
      console.log('🔧 Body attached:', options.body);
    }
    
    console.log('🌐 Full URL:', url.toString());
    console.log('🔨 Request options:', JSON.stringify(options, null, 2));
    
    const response = await fetch(url.toString(), options);
    const responseText = await response.text();
    
    console.log('📨 Status:', response.status);
    console.log('📨 Response:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Invalid JSON:', responseText.substring(0, 200));
      return res.status(500).json({
        error: 'Invalid response from Printavo',
        response: responseText.substring(0, 500)
      });
    }
    
    if (!response.ok) {
      console.error('❌ Error response:', result);
      return res.status(response.status).json(result);
    }
    
    console.log('✅ Success!');
    console.log('==========================================\n');
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('==========================================');
    console.error('❌ Proxy error:', error.message);
    console.error('Stack:', error.stack);
    console.error('==========================================\n');
    
    return res.status(500).json({ 
      error: 'Proxy server error',
      message: error.message,
      stack: error.stack
    });
  }
};
