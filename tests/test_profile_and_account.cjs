const assert = require('assert');

async function test() {
  console.log('=== Testing /my-account and Profile Update API ===\n');

  // 1. Auth via checkout-auth for mail-5@mail.ru
  const authRes = await fetch('http://api-motopuzzle.local/wp-json/motopuzzle/v1/checkout-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'mail-5@mail.ru',
      name: 'Иванов Иван Иванович',
      phone: '+7 (999) 111-22-33',
      passport: '1234-567890',
      city: 'Санкт-Петербург',
      address: 'Невский пр., д. 1'
    })
  });
  const auth = await authRes.json();
  assert(auth.success, 'Auth should succeed');
  assert(auth.authToken, 'Token should be returned');
  console.log('✓ Step 1: User authenticated, token received');

  // 2. Fetch /my-account HTML
  const pageRes = await fetch('http://localhost:4321/my-account', {
    headers: { 'Cookie': `auth_token=${auth.authToken}` }
  });
  const html = await pageRes.text();

  assert(html.includes('Требует подтверждения'), 'Should display "Требует подтверждения" instead of "На удержании"');
  assert(!html.includes('На удержании'), 'Should NOT display "На удержании"');
  assert(!html.includes('&nbsp;'), 'Should NOT contain unescaped &nbsp;');
  assert(html.includes('Редактировать данные'), 'Should have "Редактировать данные" button');
  assert(html.includes('Мои данные и адрес'), 'Should have "Мои данные и адрес" tab');
  assert(html.includes('input-disabled'), 'Email should be disabled/readonly');
  assert(html.includes('profile-phone'), 'Should have profile-phone input');
  assert(html.includes('profile-passport'), 'Should have profile-passport input');
  console.log('✓ Step 2: /my-account renders correctly with "Требует подтверждения", no &nbsp;, edit button and profile form');

  // 3. Test POST /api/auth/profile
  const updateRes = await fetch('http://localhost:4321/api/auth/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth_token=${auth.authToken}`
    },
    body: JSON.stringify({
      name: 'Петров Петр Петрович',
      phone: '+7 (911) 222-33-44',
      passport: '4002-123456',
      city: 'Москва',
      address: 'ул. Арбат, д. 20, кв. 5'
    })
  });
  const updateData = await updateRes.json();
  assert(updateData.success, `Profile update should succeed: ${JSON.stringify(updateData)}`);
  assert.strictEqual(updateData.user.name, 'Петров Петр Петрович');
  assert.strictEqual(updateData.user.phone, '+7 (911) 222-33-44');
  assert.strictEqual(updateData.user.passport, '4002-123456');
  assert.strictEqual(updateData.user.city, 'Москва');
  assert.strictEqual(updateData.user.address, 'ул. Арбат, д. 20, кв. 5');
  console.log('✓ Step 3: POST /api/auth/profile successfully updated profile');

  // 4. Verify /me returns updated data from WordPress
  const meRes = await fetch('http://api-motopuzzle.local/wp-json/motopuzzle/v1/me', {
    headers: { Authorization: `Bearer ${auth.authToken}` }
  });
  const me = await meRes.json();
  assert(me.authenticated === true, 'User should remain authenticated');
  assert.strictEqual(me.user.name, 'Петров Петр Петрович');
  assert.strictEqual(me.user.phone, '+7 (911) 222-33-44');
  assert.strictEqual(me.user.passport, '4002-123456');
  assert.strictEqual(me.user.city, 'Москва');
  assert.strictEqual(me.user.address, 'ул. Арбат, д. 20, кв. 5');
  console.log('✓ Step 4: /wp-json/motopuzzle/v1/me confirms all updated fields saved in WordPress');

  console.log('\n===========================================');
  console.log('🎉 ALL ACCOUNT & PROFILE TESTS PASSED! 🎉');
  console.log('===========================================');
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
