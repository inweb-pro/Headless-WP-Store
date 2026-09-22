const assert = require('assert');

const ASTRO_BASE = 'http://127.0.0.1:4321';
const WP_BASE = 'http://api-motopuzzle.local';

async function run() {
  console.log('Testing COD Checkout with Pickup...');

  // 1. Get an in-stock product
  const gqlQuery = `
    query GetProducts {
      products(first: 1, where: { stockStatus: IN_STOCK }) {
        nodes {
          databaseId
          name
        }
      }
    }
  `;
  const gqlRes = await fetch(`${WP_BASE}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: gqlQuery }),
  });
  const gqlData = await gqlRes.json();
  const prod = gqlData.data.products.nodes[0];
  console.log(`Product: ID ${prod.databaseId} ("${prod.name}")`);

  // 2. Add to cart
  const addRes = await fetch(`${ASTRO_BASE}/api/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: prod.databaseId, quantity: 1 }),
  });
  const addData = await addRes.json();
  assert(addData.success, 'Cart add failed');
  const sessionCookie = addRes.headers.get('set-cookie')?.match(/wc_session=([^;]+)/)?.[0];

  // 3. Checkout with pickup and COD (Наличными)
  const testCustomer = {
    name: 'Петров Петр',
    phone: '+7 (931) 267-34-62',
    email: `petrov_${Date.now().toString().slice(-5)}@example.com`,
    shippingMethod: 'pickup',
    paymentMethod: 'cod',
    orderNotes: 'Самовывоз со склада, оплата наличными',
  };

  const checkoutRes = await fetch(`${ASTRO_BASE}/api/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie,
    },
    body: JSON.stringify(testCustomer),
  });
  const checkoutData = await checkoutRes.json();
  console.log('Checkout response:', checkoutData);
  assert(checkoutData.success === true, `Checkout failed: ${checkoutData.error}`);
  assert(checkoutData.orderNumber, 'Missing order number');
  console.log(`✓ COD Checkout successful! Order #${checkoutData.orderNumber}`);
}

run().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
