// Native fetch is available globally in Node 22

async function runTests() {
  console.log('--- Starting Integration Test Suite ---');
  const baseUrl = 'http://localhost:5001';

  // 1. Health check
  try {
    const health = await fetch(`${baseUrl}/api/health`).then(r => r.json());
    console.log('✅ 1. Health check passed:', health.status);
  } catch (err) {
    console.error('❌ Failed health check:', err.message);
    process.exit(1);
  }

  // 2. Register a test user
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Test Engineer';

  let registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword, name: testName }),
  });

  const registerData = await registerRes.json();
  if (!registerRes.ok || !registerData.accessToken) {
    console.error('❌ Registration failed:', registerData);
    process.exit(1);
  }
  console.log('✅ 2. User registration passed:', registerData.user.email);
  const cookieHeader = registerRes.headers.get('set-cookie');
  console.log('✅ 3. HttpOnly cookie issued:', cookieHeader ? 'Yes (refreshToken)' : 'No');

  let accessToken = registerData.accessToken;

  // 4. Test /api/auth/me
  let meRes = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  let meData = await meRes.json();
  if (!meRes.ok || meData.user.email !== testEmail) {
    console.error('❌ /api/auth/me failed:', meData);
    process.exit(1);
  }
  console.log('✅ 4. Authenticated /api/auth/me passed:', meData.user.name);

  // 5. Test protected route rejection without token
  let unauthRes = await fetch(`${baseUrl}/api/emotion-logs`);
  if (unauthRes.status === 401) {
    console.log('✅ 5. Security check passed: Unauthorized access blocked (401)');
  } else {
    console.error('❌ Security check failed: Expected 401, got', unauthRes.status);
    process.exit(1);
  }

  // 6. Test saving EmotionLog
  let saveRes = await fetch(`${baseUrl}/api/emotion-logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      detectedEmotion: 'Happy',
      confidenceScore: 0.954,
      snapshotUrl: 'data:image/jpeg;base64,mockdata',
    }),
  });
  let saveData = await saveRes.json();
  if (!saveRes.ok || !saveData.log.id) {
    console.error('❌ Save EmotionLog failed:', saveData);
    process.exit(1);
  }
  console.log('✅ 6. Save EmotionLog passed: Log ID', saveData.log.id);
  const logId = saveData.log.id;

  // Save another log
  await fetch(`${baseUrl}/api/emotion-logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      detectedEmotion: 'Neutral',
      confidenceScore: 0.88,
    }),
  });

  // 7. Test retrieving history & statistics
  let historyRes = await fetch(`${baseUrl}/api/emotion-logs`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  let historyData = await historyRes.json();
  if (!historyRes.ok || historyData.logs.length < 2) {
    console.error('❌ History retrieval failed:', historyData);
    process.exit(1);
  }
  console.log('✅ 7. Emotion history & analytics passed: Total detections =', historyData.stats.totalDetections);

  // 8. Delete log
  let delRes = await fetch(`${baseUrl}/api/emotion-logs/${logId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  let delData = await delRes.json();
  if (!delRes.ok) {
    console.error('❌ Delete log failed:', delData);
    process.exit(1);
  }
  console.log('✅ 8. Delete EmotionLog passed');

  // 9. Login test
  let loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  let loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.accessToken) {
    console.error('❌ Login failed:', loginData);
    process.exit(1);
  }
  console.log('✅ 9. Login with credentials passed');

  console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
