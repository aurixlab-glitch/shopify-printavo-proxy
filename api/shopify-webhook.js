// /api/shopify-webhook.js
import crypto from 'crypto';
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

const PRINTAVO = {
  url:'https://www.printavo.com/api/v1/orders',
  email:'aurixlab@gmail.com',
  token:'Dw9WsBffRzogNyfOCEhswA'
};

export default async (req,res) => {
  // 1. verify Shopify webhook
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const sig  = crypto.createHmac('sha256', process.env.SHOPIFY_SECRET)
                     .update(req.body,'utf8').digest('base64');
  if (hmac !== sig) return res.status(401).send('Unauthorized');

  const order = JSON.parse(req.body);
  const cart  = await redis.get(`cart:${order.cart_token}`);
  if (!cart) { console.warn('no cached cart for',order.cart_token); return res.status(200).send('ok'); }

  const cartData = JSON.parse(cart);
  await redis.del(`cart:${order.cart_token}`);          // clean-up

  // 2. build Printavo payload exactly like your proxy expects
  const due = new Date();  due.setDate(due.getDate()+7);
  const dueStr = `${(due.getMonth()+1).toString().padStart(2,'0')}/${due.getDate().toString().padStart(2,'0')}/${due.getFullYear()}`;

  const lineItems = cartData.items.map((it,idx) => ({
    name:        it.title,
    style:       it.variant || 'Default',
    quantity:    String(it.qty),
    unit_price:  String((it.price/100).toFixed(2)),
    description: Object.entries(it.properties||{})
                       .map(([k,v])=>`${k}: ${v}`).join('\n') || 'Shopify item'
  }));

  const orderData = {
    user_id: String(87416),
    customer_id: String(10238441),
    formatted_due_date: dueStr,
    formatted_customer_due_date: dueStr,
    order_nickname: `Shopify #${order.name}`,
    visualid: `WEB-${order.checkout_token}`,
    production_notes: cartData.note || '',
    notes: `Total paid: $${(order.total_price/100).toFixed(2)}`
  };

  // 3. forward to Printavo via your own proxy (or direct – same code you already have)
  const form = new URLSearchParams();
  Object.entries(orderData).forEach(([k,v])=>form.append(k,v));
  lineItems.forEach((it,i)=>{
    Object.entries(it).forEach(([k,v])=>form.append(`lineitems_attributes[${i}][${k}]`,v));
  });

  const pr = await fetch(PRINTAVO.url,{
    method:'POST',
    headers:{ 'content-type':'application/x-www-form-urlencoded' },
    body: form
  });

  if (!pr.ok) {
    const txt = await pr.text();
    console.error('Printavo refused order',txt);
    return res.status(500).send('Printavo error');
  }

  const printavoOrder = await pr.json();
  console.log('Printavo order created',printavoOrder.id);
  res.status(200).send('ok');
};
