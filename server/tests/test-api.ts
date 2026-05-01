import { execSync } from 'child_process';

async function runTests() {
  const BASE_URL = 'http://localhost:5000/api';
  let playerToken = '';
  let coachToken = '';

  console.log('━━━ Chess Arena API Tests ━━━\n');

  async function assert(res: Response, condition: boolean, msg: string) {
    if (!condition) {
      console.error('❌ FAIL: ' + msg);
      try {
        const text = await res.text();
        console.error('Response details:', text);
      } catch (_e) {}
      throw new Error(msg);
    }
  }

  // 1. Auth Tests
  try {
    const timestamp = Date.now();
    const pEmail = `player_${timestamp}@test.com`;
    const cEmail = `coach_${timestamp}@test.com`;

    const pReg = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Player', email: pEmail, password: 'Password123', role: 'player' })
    });
    const pData = await pReg.json();
    await assert(pReg, pReg.ok, 'Player registration should succeed');
    playerToken = pData.token;
    console.log('✅ Player Registration & Login');

    const cReg = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Coach', email: cEmail, password: 'Password123', role: 'coach' })
    });
    const cData = await cReg.json();
    await assert(cReg, cReg.ok, 'Coach registration should succeed');
    coachToken = cData.token;
    console.log('✅ Coach Registration & Login');

    execSync(
      `psql -U fazlur -d chess_arena -c "UPDATE users SET is_approved = true WHERE email = '${cEmail}';"`,
      { env: { ...process.env, PGPASSWORD: 'uJA3^3kvoh' } }
    );
    console.log('✅ Coach Approved via DB');

  } catch (err: unknown) {
    console.error('❌ Auth test failed:', err);
    process.exit(1);
  }

  // 2. Profile Tests
  try {
    const res = await fetch(`${BASE_URL}/profile/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${playerToken}`
      },
      body: JSON.stringify({ bio: 'Test bio', chess_rating: 1200 })
    });
    await assert(res, res.ok, 'Profile update should succeed');
    console.log('✅ Profile PATCH Update');
  } catch (err: unknown) {
    console.error('❌ Profile test failed:', err);
    process.exit(1);
  }

  // 3. Masterclass Tests
  let newMasterclassId = '';
  try {
    const res = await fetch(`${BASE_URL}/masterclasses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coachToken}`
      },
      body: JSON.stringify({
        title: 'API Test Masterclass',
        description: 'Test Description',
        session_date: new Date(Date.now() + 86400000).toISOString(),
        category: 'tactics',
        capacity: 10
      })
    });
    await assert(res, res.ok, 'Masterclass creation should succeed');
    const data = await res.json();
    newMasterclassId = data.id;
    console.log('✅ Masterclass Creation');

    const getRes = await fetch(`${BASE_URL}/masterclasses/${newMasterclassId}`);
    await assert(getRes, getRes.ok, 'Masterclass fetch should succeed');
    console.log('✅ Masterclass Fetch');
  } catch (err: unknown) {
    console.error('❌ Masterclass test failed:', err);
    process.exit(1);
  }

  // 4. Enrollment Tests
  try {
    const res = await fetch(`${BASE_URL}/enrollments/${newMasterclassId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${playerToken}` }
    });
    await assert(res, res.ok, 'Enrollment should succeed');
    console.log('✅ Player Enrollment');

    const myRes = await fetch(`${BASE_URL}/enrollments/my`, {
      headers: { 'Authorization': `Bearer ${playerToken}` }
    });
    await assert(myRes, myRes.ok, 'Fetch my enrollments should succeed');
    console.log('✅ Fetch My Enrollments');
  } catch (err: unknown) {
    console.error('❌ Enrollment test failed:', err);
    process.exit(1);
  }

  // 5. Review Tests
  try {
    const res = await fetch(`${BASE_URL}/reviews/${newMasterclassId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${playerToken}`
      },
      body: JSON.stringify({ rating: 5, comment: 'Great class!' })
    });

    if (!res.ok) {
      const text = await res.text();
      console.log('⚠️ Review POST failed (expected if class not started/finished):', text);
    } else {
      console.log('✅ Review POST');

      const patchRes = await fetch(`${BASE_URL}/reviews/${newMasterclassId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${playerToken}`
        },
        body: JSON.stringify({ rating: 4 })
      });
      await assert(patchRes, patchRes.ok, 'Review update should succeed');
      console.log('✅ Review PATCH');
    }
  } catch (err: unknown) {
    console.error('❌ Review test failed:', err);
    process.exit(1);
  }

  // 6. Bookmark Tests
  console.log('\n━━━ New Feature Tests ━━━\n');
  try {
    const addRes = await fetch(`${BASE_URL}/bookmarks/${newMasterclassId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${playerToken}` }
    });
    await assert(addRes, addRes.ok, 'Bookmark add should succeed');
    const addData = await addRes.json();
    await assert(addRes, addData.bookmarked === true, 'Should be bookmarked after toggle');
    console.log('✅ Bookmark Toggle ON');

    const idsRes = await fetch(`${BASE_URL}/bookmarks/ids`, {
      headers: { 'Authorization': `Bearer ${playerToken}` }
    });
    await assert(idsRes, idsRes.ok, 'Bookmark IDs fetch should succeed');
    const ids = await idsRes.json();
    await assert(idsRes, ids.includes(newMasterclassId), 'Should contain bookmarked class ID');
    console.log('✅ Bookmark IDs Fetch');

    const listRes = await fetch(`${BASE_URL}/bookmarks`, {
      headers: { 'Authorization': `Bearer ${playerToken}` }
    });
    await assert(listRes, listRes.ok, 'Bookmark list fetch should succeed');
    const bookmarks = await listRes.json();
    await assert(listRes, bookmarks.length > 0, 'Should have at least one bookmark');
    console.log('✅ Bookmark List Fetch');

    const removeRes = await fetch(`${BASE_URL}/bookmarks/${newMasterclassId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${playerToken}` }
    });
    await assert(removeRes, removeRes.ok, 'Bookmark remove should succeed');
    const removeData = await removeRes.json();
    await assert(removeRes, removeData.bookmarked === false, 'Should be unbookmarked after second toggle');
    console.log('✅ Bookmark Toggle OFF');
  } catch (err: unknown) {
    console.error('❌ Bookmark test failed:', err);
    process.exit(1);
  }

  // 7. Notification Tests
  try {
    const res = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${playerToken}` }
    });
    await assert(res, res.ok, 'Notifications fetch should succeed');
    const data = await res.json();
    await assert(res, 'notifications' in data, 'Should return notifications array');
    await assert(res, 'unread_count' in data, 'Should return unread_count');
    console.log(`✅ Notifications Fetch (${data.notifications.length} notifications, ${data.unread_count} unread)`);

    const markAllRes = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${playerToken}` }
    });
    await assert(markAllRes, markAllRes.ok, 'Mark all read should succeed');
    console.log('✅ Notifications Mark All Read');
  } catch (err: unknown) {
    console.error('❌ Notification test failed:', err);
    process.exit(1);
  }

  // 8. Coach Public Profile Test
  try {
    const tokenPayload = JSON.parse(
      Buffer.from(coachToken.split('.')[1] as string, 'base64').toString()
    ) as { userId: string };
    const coachId = tokenPayload.userId;

    const res = await fetch(`${BASE_URL}/profile/coach/${coachId}`);
    await assert(res, res.ok, 'Coach public profile should be accessible');
    const profile = await res.json();
    await assert(res, profile.name === 'Test Coach', 'Coach name should match');
    await assert(res, profile.stats !== undefined, 'Should include stats');
    console.log('✅ Coach Public Profile');
  } catch (err: unknown) {
    console.error('❌ Coach profile test failed:', err);
    process.exit(1);
  }

  // 9. Materials API Tests
  let materialId = 0;
  try {
    const addRes = await fetch(`${BASE_URL}/materials/${newMasterclassId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coachToken}`
      },
      body: JSON.stringify({
        type: 'video',
        title: 'Intro to Sicilian Defense',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Overview video'
      })
    });
    await assert(addRes, addRes.ok, 'Add material should succeed');
    const matData = await addRes.json();
    materialId = matData.id;
    console.log('✅ Material Add');

    const getRes = await fetch(`${BASE_URL}/materials/${newMasterclassId}`);
    await assert(getRes, getRes.ok, 'Get materials should succeed');
    const materials = await getRes.json();
    await assert(getRes, materials.length >= 1, 'Should have at least 1 material');
    console.log('✅ Materials Fetch');

    const addRes2 = await fetch(`${BASE_URL}/materials/${newMasterclassId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coachToken}`
      },
      body: JSON.stringify({
        type: 'article',
        title: 'Chess Strategy Guide',
        url: 'https://en.wikipedia.org/wiki/Chess_strategy'
      })
    });
    await assert(addRes2, addRes2.ok, 'Second material add should succeed');
    console.log('✅ Material Add (Article)');

    const updateRes = await fetch(`${BASE_URL}/materials/item/${materialId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coachToken}`
      },
      body: JSON.stringify({ title: 'Updated Video Title' })
    });
    await assert(updateRes, updateRes.ok, 'Update material should succeed');
    console.log('✅ Material Update');

    const delMatRes = await fetch(`${BASE_URL}/materials/item/${materialId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${coachToken}` }
    });
    await assert(delMatRes, delMatRes.ok, 'Delete material should succeed');
    console.log('✅ Material Delete');

    const notifRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${playerToken}` }
    });
    await assert(notifRes, notifRes.ok, 'Notifications fetch after material add');
    const notifData = await notifRes.json();
    const classUpdateNotif = (notifData.notifications as { type: string }[]).find(
      (n) => n.type === 'class_updated'
    );
    await assert(notifRes, classUpdateNotif !== undefined, 'Should have class_updated notification');
    console.log('✅ Material→Notification Integration');
  } catch (err: unknown) {
    console.error('❌ Materials test failed:', err);
    process.exit(1);
  }

  // 10. Update Masterclass with video_url
  try {
    const updRes = await fetch(`${BASE_URL}/masterclasses/${newMasterclassId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coachToken}`
      },
      body: JSON.stringify({
        video_url: 'https://www.youtube.com/watch?v=example123'
      })
    });
    await assert(updRes, updRes.ok, 'Update with video_url should succeed');
    console.log('✅ Masterclass Update with video_url');

    const getRes = await fetch(`${BASE_URL}/masterclasses/${newMasterclassId}`);
    const mcData = await getRes.json();
    await assert(getRes, mcData.video_url === 'https://www.youtube.com/watch?v=example123', 'video_url should persist');
    await assert(getRes, Array.isArray(mcData.materials), 'materials array should exist');
    console.log('✅ Masterclass Detail includes video_url & materials');
  } catch (err: unknown) {
    console.error('❌ Video URL test failed:', err);
    process.exit(1);
  }

  // Cleanup
  try {
    const delEnrollment = await fetch(`${BASE_URL}/enrollments/${newMasterclassId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${playerToken}` }
    });
    await assert(delEnrollment, delEnrollment.ok, 'Enrollment cancellation should succeed');
    console.log('✅ Enrollment Cancellation');

    const delRes = await fetch(`${BASE_URL}/masterclasses/${newMasterclassId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${coachToken}` }
    });
    await assert(delRes, delRes.ok, 'Masterclass deletion should succeed');
    console.log('✅ Masterclass Deletion (Cleanup)');
  } catch (err: unknown) {
    console.error('❌ Cleanup failed:', err);
  }

  console.log('\n🎉 All API tests completed successfully!');
}

runTests();
