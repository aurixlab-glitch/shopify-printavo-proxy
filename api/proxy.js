// api/proxy.js  –  Printavo V1 REST helper (safe-line-item version)
const PRINTAVO = {
  base: 'https://www.printavo.com/api/v1',
  email: 'aurixlab@gmail.com',
  token: 'Dw9WsBffRzogNyfOCEhswA'
};

const ALLOWED_ORIGINS = [
  'https://budgetpromotion.myshopify.com',
  'https://www.budgetpromotion.com',
  'http://localhost:3000'
];

/*  helper: turn any value into a string  */
const str = v => (v == null ? '' : String(v)).trim();

/*  helper: build flat form body for Printavo  */
function buildForm({ orderData = {}, lineItems = [] }) {
  const p = new URLSearchParams();

  // 1. root order fields (must be strings)
  Object.entries(orderData).forEach(([k, v]) => p.append(k, str(v)));

  // 2. line-items – ONLY these five keys, all strings
  lineItems.forEach((it, idx) => {
    ['name', 'style', 'quantity', 'unit_price', 'description'].forEach(k => {
      p.append(`lineitems_attributes[${idx}][${k}]`, str(it[k]));
    });
  });

  return p;
}

/* -------------------------------------------------- */
module.exports = async (req, res) => {
  // ------- CORS -----------------------------------------------------------
  const origin = req.headers.origin || req.headers.referer || '';
  const allowed = ALLOWED_ORIGINS.some(o => origin.includes(o.replace(/^https?:\/\//, '')));
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ------- HEALTH ---------------------------------------------------------
  if (req.method === 'GET') {
    return res.json({
      status: 'ok',
      service: 'Printavo V1 REST proxy – safe line-items',
      time: new Date().toISOString(),
      credentials: { email: !!PRINTAVO.email, token: !!PRINTAVO.token }
    });
  }

  // ------- ONLY POST ------------------------------------------------------
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    if (!body.endpoint) throw new Error('Missing "endpoint" in body');

    const { endpoint, method = 'GET', data } = body;

    const url = new URL(`${PRINTAVO.base}/${endpoint}`);
    url.searchParams.set('email', PRINTAVO.email);
    url.searchParams.set('token', PRINTAVO.token);

    const options = { method, headers: { Accept: 'application/json' } };

    // ------- POST/PUT/PATCH  ->  form-urlencoded --------------------------
    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      if (!Array.isArray(data.lineItems)) throw new Error('lineItems must be an array');
      options.body = buildForm(data);
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      console.log('📤 Printavo form body:', options.body.toString().slice(0, 500));
      console.log('📤 FORM BODY (string):', options.body.toString());
console.log('📤 FORM BODY (parsed):', Object.fromEntries(options.body.entries()));
    }

    const resp = await fetch(url, options);
    const text = await resp.text();

    let json;
    try { json = JSON.parse(text); } catch { json = { response: text }; }

    if (!resp.ok) {
      console.warn('❌ Printavo error:', json);
      return res.status(resp.status).json(json);
    }

    console.log('✅ Printavo success id:', json.id);
    return res.status(200).json(json);
  } catch (err) {
    console.error('❌ Proxy catch:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
