const assert = require('assert');

async function testRender() {
  console.log('Testing /my-account HTML render for mail-6@mail.ru...');
  const authRes = await fetch('http://api-motopuzzle.local/wp-json/motopuzzle/v1/checkout-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mail-6@mail.ru' })
  });
  const auth = await authRes.json();
  const token = auth.authToken;
  assert(token, 'Token must exist');

  const pageRes = await fetch('http://localhost:4321/my-account', {
    headers: { Cookie: `auth_token=${token}` }
  });
  const html = await pageRes.text();

  // 1. Breadcrumbs should NOT exist in account container
  const domStart = html.lastIndexOf('account-container');
  const domSlice = html.slice(domStart, domStart + 200);
  assert(!domSlice.includes('breadcrumbs'), 'No breadcrumbs in account container');
  assert(!domSlice.includes('Главная'), 'No breadcrumb link to Главная in account container');
  console.log('✓ Breadcrumbs removed from account container');

  // 2. Title centered
  assert(html.includes('text-align: center'), 'Page title should be centered');
  console.log('✓ Page title centered');

  // 3. Product name instead of "Товар"
  assert(html.includes('Диск колесный задний для Ducati 749'), 'Should show exact product name');
  console.log('✓ Product name rendered');

  // 4. Mini photo
  assert(html.includes('order-item-thumb'), 'Should have order-item-thumb');
  console.log('✓ Mini photo thumbnail rendered');

  // 5. Only title without link
  assert(!html.includes('order-item-link-text'), 'Should NOT have link under product title');
  console.log('✓ Only product title rendered (link removed)');

  // 6. Payment method mini text
  assert(html.includes('Банковской картой'), 'Should show payment method');
  console.log('✓ Payment method rendered');

  // 7. Delivery address mini text
  assert(html.includes('Адрес доставки:') || html.includes('awdwdawdaw a a da ad awd231 101'), 'Should show delivery address');
  console.log('✓ Delivery address rendered');

  console.log('\n🎉 ALL CHECKS PASSED SUCCESSFULLY!');
}

testRender().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
