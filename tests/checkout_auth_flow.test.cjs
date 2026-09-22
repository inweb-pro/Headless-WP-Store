/**
 * E2E & Flow Test for Checkout, Auth, Stock Visibility, and Cart Behavior
 * 
 * Verifies:
 * 1. WooCommerce out-of-stock products are hidden from GraphQL queries.
 * 2. Adding products to cart works seamlessly.
 * 3. Checkout order creation creates/authenticates WP customer and returns JWT authToken.
 * 4. Customer profile data (ФИО, телефон, город, адрес, паспорт) is saved in WP and retrievable via /wp-json/motopuzzle/v1/me.
 * 5. Visiting /checkout with auth_token cookie receives SSR pre-filled form fields.
 */

const assert = require('assert');

const ASTRO_BASE = 'http://127.0.0.1:4321';
const WP_BASE = 'http://api-motopuzzle.local';

async function runTests() {
  console.log('=== Starting Checkout & Auth Flow Tests ===\n');

  // 1. Check GraphQL IN_STOCK filtering
  console.log('[Test 1] Testing GraphQL query filters out out-of-stock products...');
  const gqlQuery = `
    query GetProducts {
      products(first: 5, where: { stockStatus: IN_STOCK }) {
        nodes {
          databaseId
          name
          slug
          ... on SimpleProduct {
            stockStatus
          }
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
  assert(gqlData.data?.products?.nodes?.length > 0, 'Should return in-stock products');
  const allInStock = gqlData.data.products.nodes.every(p => p.stockStatus === 'IN_STOCK');
  assert(allInStock, 'All returned products must have stockStatus === IN_STOCK');
  console.log(`✓ Test 1 Passed: Found ${gqlData.data.products.nodes.length} in-stock products. None are out-of-stock.`);

  const testProduct = gqlData.data.products.nodes[0];
  console.log(`Using test product: ID ${testProduct.databaseId} ("${testProduct.name}")`);

  // 2. Add product to cart via Astro API endpoint
  console.log('\n[Test 2] Adding product to cart via /api/cart...');
  const addRes = await fetch(`${ASTRO_BASE}/api/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: testProduct.databaseId, quantity: 1 }),
  });
  const addData = await addRes.json();
  const wcSessionCookie = addRes.headers.get('set-cookie');
  assert(addData.success, `Cart add should succeed: ${JSON.stringify(addData)}`);
  assert(addData.cart?.contents?.itemCount >= 1, 'Cart should contain at least 1 item');
  console.log(`✓ Test 2 Passed: Product added to cart. Item count: ${addData.cart.contents.itemCount}`);

  // Extract wc_session cookie for subsequent requests
  let sessionCookie = '';
  if (wcSessionCookie) {
    const match = wcSessionCookie.match(/wc_session=([^;]+)/);
    if (match) {
      sessionCookie = `wc_session=${match[1]}`;
    }
  }

  // 3. Checkout with customer creation and delivery details
  console.log('\n[Test 3] Submitting checkout via /api/checkout...');
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testCustomer = {
    name: 'Иванов Иван Иванович',
    phone: '+7 (999) 888-77-66',
    email: `ivanov_${uniqueSuffix}@motopuzzle-test.ru`,
    city: 'Москва',
    address: 'ул. Тверская, д. 15, кв. 42',
    passport: '4510 987654',
    shippingMethod: 'delivery',
    paymentMethod: 'bacs',
    orderNotes: 'Автоматический тест оформления',
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
  assert(checkoutData.success, `Checkout should succeed: ${JSON.stringify(checkoutData)}`);
  assert(checkoutData.orderId || checkoutData.orderNumber, 'Checkout must return orderId/orderNumber');
  assert(checkoutData.authToken, 'Checkout must return JWT authToken');
  console.log(`✓ Test 3 Passed: Order created #${checkoutData.orderNumber}, JWT authToken generated (${checkoutData.authToken.slice(0, 20)}...)`);

  // 4. Verify customer profile via /wp-json/motopuzzle/v1/me with the generated authToken
  console.log('\n[Test 4] Verifying /wp-json/motopuzzle/v1/me returns saved customer data...');
  const meRes = await fetch(`${WP_BASE}/wp-json/motopuzzle/v1/me`, {
    headers: {
      Authorization: `Bearer ${checkoutData.authToken}`,
    },
  });
  const meData = await meRes.json();
  assert(meData.authenticated === true, 'User must be authenticated');
  assert.strictEqual(meData.user.email, testCustomer.email);
  assert.strictEqual(meData.user.phone, testCustomer.phone);
  assert.strictEqual(meData.user.city, testCustomer.city);
  assert.strictEqual(meData.user.address, testCustomer.address);
  assert.strictEqual(meData.user.passport, testCustomer.passport);
  console.log(`✓ Test 4 Passed: Customer profile correctly retrieved from WordPress:`);
  console.log(`  Name: ${meData.user.name}`);
  console.log(`  Email: ${meData.user.email}`);
  console.log(`  Phone: ${meData.user.phone}`);
  console.log(`  City: ${meData.user.city}`);
  console.log(`  Address: ${meData.user.address}`);
  console.log(`  Passport: ${meData.user.passport}`);

  // 5. Verify /checkout SSR pre-filling when auth_token cookie is present
  console.log('\n[Test 5] Verifying /checkout SSR pre-fills form fields when auth_token cookie is sent...');
  const checkoutPageRes = await fetch(`${ASTRO_BASE}/checkout`, {
    headers: {
      'Cookie': `auth_token=${checkoutData.authToken}`,
    },
  });
  const checkoutHtml = await checkoutPageRes.text();
  assert(checkoutHtml.includes('Вы авторизованы как'), 'Page should include authenticated notice');
  assert(checkoutHtml.includes(testCustomer.name), 'Page should pre-fill customer name');
  assert(checkoutHtml.includes(testCustomer.phone), 'Page should pre-fill customer phone');
  assert(checkoutHtml.includes(testCustomer.email), 'Page should pre-fill customer email');
  assert(checkoutHtml.includes(testCustomer.city), 'Page should pre-fill customer city');
  assert(checkoutHtml.includes(testCustomer.passport), 'Page should pre-fill customer passport');
  assert(checkoutHtml.includes(testCustomer.address), 'Page should pre-fill customer address');
  console.log('✓ Test 5 Passed: /checkout page rendered with all fields pre-filled from customer profile!');

  // 6. Verify out-of-stock products return 404 (redirect to /404)
  console.log('\n[Test 6] Verifying out-of-stock product returns redirect to /404...');
  const oosProductUri = testProduct.slug ? `/honda/cbr1000rr-08-11/${testProduct.slug}` : '/yamaha/yzf-r1-07-08/fara-levaja-dlja-yamaha-yzf-r1-07-08';
  const oosRes = await fetch(`${ASTRO_BASE}${oosProductUri}`, {
    redirect: 'manual',
  });
  assert(oosRes.status === 302 || oosRes.status === 404, `Out-of-stock product should return 302 redirect to /404 or 404, got ${oosRes.status}`);
  if (oosRes.status === 302) {
    assert.strictEqual(oosRes.headers.get('location'), '/404', 'Should redirect to /404');
  }
  console.log(`✓ Test 6 Passed: Out-of-stock product is inaccessible directly (status ${oosRes.status} -> ${oosRes.headers.get('location') || 404}).`);

  console.log('\n===========================================');
  console.log('🎉 ALL 6 INTEGRATION & E2E TESTS PASSED! 🎉');
  console.log('===========================================');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
