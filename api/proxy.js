// api/proxy.js
// FIXED V1 REST API - Sends data as URL-encoded form data

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
      service: 'Printavo V1 REST Proxy - Form Data Edition',
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
        message: 'Body must include "endpoint" field'
      });
    }
    
    const { endpoint, method = 'GET', data = null } = req.body;
    
    console.log('📦 Request:', { endpoint, method });
    console.log('📋 Data:', JSON.stringify(data, null, 2));
    
    // Build base URL
    const url = new URL(`${PRINTAVO_CONFIG.apiUrlV1}/${endpoint}`);
    url.searchParams.append('email', PRINTAVO_CONFIG.email);
    url.searchParams.append('token', PRINTAVO_CONFIG.token);
    
    console.log('🌐 URL:', url.toString());
    
    // CRITICAL FIX: Send as form data, not JSON
    const options = {
      method: method,
      headers: {
        'Accept': 'application/json'
      }
    };
    
    // For POST/PUT/PATCH, send as form-urlencoded
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      // Flatten nested object into form params
      const formParams = flattenObject(data);
      const formBody = new URLSearchParams();
      
      for (const [key, value] of Object.entries(formParams)) {
        formBody.append(key, value);
      }
      
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.body = formBody.toString();
      
      console.log('📤 Form body:', options.body);
    }
    
    const response = await fetch(url.toString(), options);
    const responseText = await response.text();
    
    console.log('📨 Status:', response.status);
    console.log('📨 Response:', responseText.substring(0, 500));
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Invalid JSON response');
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
    console.error('==========================================\n');
    
    return res.status(500).json({ 
      error: 'Proxy server error',
      message: error.message
    });
  }
};

// Helper function to flatten nested objects for form encoding
function flattenObject(obj, prefix = '') {
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(flattened, flattenObject(value, fullKey));
    } else if (Array.isArray(value)) {
      // Handle arrays
      value.forEach((item, index) => {
        if (item && typeof item === 'object') {
          Object.assign(flattened, flattenObject(item, `${fullKey}[${index}]`));
        } else {
          flattened[`${fullKey}[${index}]`] = item;
        }
      });
    } else {
      flattened[fullKey] = value;
    }
  }
  
  return flattened;
}
