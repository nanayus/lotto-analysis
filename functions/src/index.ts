import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { importPKCS8, SignJWT } from 'jose';

export { syncLatestLottoDraw } from './lottoData.js';

initializeApp();

const appleKeyId = defineSecret('APPLE_KEY_ID');
const appleNativeClientId = defineSecret('APPLE_NATIVE_CLIENT_ID');
const applePrivateKey = defineSecret('APPLE_PRIVATE_KEY');
const appleServiceClientId = defineSecret('APPLE_SERVICE_CLIENT_ID');
const appleTeamId = defineSecret('APPLE_TEAM_ID');
const revenueCatSecretApiKey = defineSecret('REVENUECAT_SECRET_API_KEY');

async function deleteRevenueCatCustomer(uid: string) {
  const apiKey = revenueCatSecretApiKey.value().trim();
  if (!apiKey) return;
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      method: 'DELETE',
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!response.ok && response.status !== 404) {
    throw new HttpsError('unavailable', 'Purchase data could not be deleted.');
  }
}

async function buildAppleClientSecret(clientId: string) {
  const key = await importPKCS8(applePrivateKey.value().replace(/\\n/g, '\n'), 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: appleKeyId.value() })
    .setIssuer(appleTeamId.value())
    .setAudience('https://appleid.apple.com')
    .setSubject(clientId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

async function revokeAppleAuthorization(authorizationCode: string, clientId: string) {
  const clientSecret = await buildAppleClientSecret(clientId);
  const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: 'authorization_code',
    }),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  if (!tokenResponse.ok) throw new Error(`Apple token exchange failed: ${tokenResponse.status}`);
  const tokens = await tokenResponse.json() as { access_token?: string; refresh_token?: string };
  const token = tokens.refresh_token ?? tokens.access_token;
  if (!token) throw new Error('Apple token exchange returned no revocable token.');
  const revokeResponse = await fetch('https://appleid.apple.com/auth/revoke', {
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token,
      token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
    }),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  if (!revokeResponse.ok) throw new Error(`Apple token revocation failed: ${revokeResponse.status}`);
}

export const deleteAccount = onCall({
  enforceAppCheck: false,
  region: 'asia-northeast3',
  secrets: [
    appleKeyId,
    appleNativeClientId,
    applePrivateKey,
    appleServiceClientId,
    appleTeamId,
    revenueCatSecretApiKey,
  ],
}, async (request) => {
  const authentication = request.auth;
  if (!authentication) throw new HttpsError('unauthenticated', 'Authentication is required.');
  const uid = authentication.uid;
  const authenticatedAt = Number(authentication.token.auth_time ?? 0);
  const signInProvider = authentication.token.firebase?.sign_in_provider;
  const isAnonymous = signInProvider === 'anonymous';
  if (!isAnonymous && (!authenticatedAt || Date.now() / 1000 - authenticatedAt > 5 * 60)) {
    throw new HttpsError('failed-precondition', 'Recent authentication is required.');
  }

  const authorizationCode = typeof request.data?.appleAuthorizationCode === 'string'
    ? request.data.appleAuthorizationCode
    : null;
  if (authorizationCode) {
    const clientId = request.data?.appleClientKind === 'service'
      ? appleServiceClientId.value()
      : appleNativeClientId.value();
    // Revocation failure must not prevent the user from exercising account deletion.
    await revokeAppleAuthorization(authorizationCode, clientId).catch((error) => {
      console.error('Apple authorization revocation failed', { uid, error });
    });
  }

  await deleteRevenueCatCustomer(uid);

  const database = getFirestore();
  const monetization = await database.doc(`users/${uid}/monetization/access`).get();
  const inviteCode = monetization.data()?.inviteCode;
  await database.recursiveDelete(database.doc(`users/${uid}`));
  if (typeof inviteCode === 'string') {
    await database.doc(`inviteCodes/${inviteCode}`).delete().catch(() => undefined);
  }
  await database.doc(`referrals/${uid}`).delete().catch(() => undefined);
  const invitedReferrals = await database.collection('referrals')
    .where('inviterUid', '==', uid)
    .get();
  await Promise.all(invitedReferrals.docs.map((item) => item.ref.delete()));
  await getAuth().deleteUser(uid).catch((error: { code?: string }) => {
    if (error.code !== 'auth/user-not-found') throw error;
  });
  return { deleted: true };
});
