// api/proxy.js
// Serverless function for Vercel/Netlify
// Proxies requests from Shopify to Printavo (bypasses CORS)

const fetch = require('node-fetch');

// Your Printavo API credentials
const PRINTAVO_CONFIG = {
  apiUrl: 'https://www.printavo.com/api/v2',
  email: 'aurixlab@gmail.com',
  token: 'Sb3OElnenVelaFw8-xGz5A'
};

// Optional: Add your store domain for security
const ALLOWED_ORIGINS = [
  'https://budgetpromotion.myshopify.com',
  'https://www.budgetpromotion.com', // Add your custom domain if you have one
  'http://localhost:3000' // For local testing
];

module.exports = async (req, res) => {
  const startTime = Date.now();
  
  // ==========================================
  // CORS Configuration
  // ==========================================
  const origin = req.headers.origin;
  
  // Check if origin is allowed
  if (origin && ALLOWED_ORIGINS.some(allowed => origin.includes(allowed.replace('https://', '').replace('http://', '')))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all for now, restrict later
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // ==========================================
  // Handle Preflight Request
  // ==========================================
  if (req.method === 'OPTIONS') {
    console.log('✓ Preflight request handled');
    return res.status(200).end();
  }
  
  // ==========================================
  // Only Allow POST Requests
  // ==========================================
  if (req.method !== 'POST') {
    console.log('✗ Invalid method:', req.method);
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed: ['POST']
    });
  }
  
  // ==========================================
  // Optional: API Key Security
  // ==========================================
  // Uncomment these lines to add API key protection:
  /*
  const apiKey = req.headers['x-api-key'];
  const VALID_API_KEY = 'your-secret-key-here'; // Change this!
  
  if (apiKey !== VALID_API_KEY) {
    console.log('✗ Invalid API key');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  */
  
  // ==========================================
  // Process Request
  // ==========================================
  try {
    console.log('==========================================');
    console.log('📥 Incoming request from:', origin || 'unknown');
    console.log('Time:', new Date().toISOString());
    
    // Validate request body
    if (!req.body || !req.body.query) {
      console.log('✗ Missing query in request body');
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Request body must include "query" field'
      });
    }
    
    console.log('📤 Forwarding to Printavo API...');
    console.log('Query type:', req.body.query.includes('mutation') ? 'Mutation' : 'Query');
    
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
    
    // Parse response
    const data = await response.json();
    
    // Check for errors
    if (data.errors) {
      console.log('⚠️ Printavo returned errors:', JSON.stringify(data.errors, null, 2));
    } else if (data.data) {
      console.log('✅ Success! Data received from Printavo');
      
      // Log what was created/retrieved
      if (data.data.quoteCreate) {
        console.log('   Quote created:', data.data.quoteCreate.quote?.visualId);
      } else if (data.data.quotes) {
        console.log('   Quotes retrieved:', data.data.quotes.nodes?.length);
      } else if (data.data.statuses) {
        console.log('   Statuses retrieved:', data.data.statuses.nodes?.length);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log('⏱️ Request completed in', duration, 'ms');
    console.log('==========================================\n');
    
    // Return response to client
    return res.status(response.status).json(data);
    
  } catch (error) {
    console.error('==========================================');
    console.error('❌ Proxy error:', error.message);
    console.error('Stack:', error.stack);
    console.error('==========================================\n');
    
    return res.status(500).json({ 
      error: 'Proxy server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==========================================
// Health Check Endpoint
// ==========================================
// If you want a separate health check, create api/health.js:
/*
module.exports = async (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Shopify-Printavo Proxy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};
*/
