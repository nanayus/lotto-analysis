import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { importPKCS8, SignJWT } from 'jose';

initializeApp();

const appleKeyId = defineSecret('APPLE_KEY_ID');
const appleNativeClientId = defineSecret('APPLE_NATIVE_CLIENT_ID');
const applePrivateKey = defineSecret('APPLE_PRIVATE_KEY');
const appleServiceClientId = defineSecret('APPLE_SERVICE_CLIENT_ID');
const appleTeamId = defineSecret('APPLE_TEAM_ID');

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
  secrets: [appleKeyId, appleNativeClientId, applePrivateKey, appleServiceClientId, appleTeamId],
}, async (request) => {
  const authentication = request.auth;
  if (!authentication) throw new HttpsError('unauthenticated', 'Authentication is required.');
  const uid = authentication.uid;
  const authenticatedAt = Number(authentication.token.auth_time ?? 0);
  if (!authenticatedAt || Date.now() / 1000 - authenticatedAt > 5 * 60) {
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

  const database = getFirestore();
  await database.recursiveDelete(database.doc(`users/${uid}`));
  await getAuth().deleteUser(uid).catch((error: { code?: string }) => {
    if (error.code !== 'auth/user-not-found') throw error;
  });
  return { deleted: true };
});
