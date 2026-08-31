import { createHash } from 'node:crypto';

import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Transaction } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

const REGION = 'asia-northeast3';
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WELCOME_CREDITS = 3;
const BONUS_CREDIT_LIMIT = 10;
const REWARDED_UNLOCK_LIMIT = 3;
const REFERRAL_INVITER_REWARD = 2;
const REFERRAL_INVITEE_REWARD = 1;
const MONTHLY_REFERRAL_REWARD_LIMIT = 5;

type MonetizationProfile = {
  analysisUnlockCount: number;
  bonusCredits: number;
  createdAt: Timestamp;
  inviteCode: string;
  proExpiresAt: Timestamp | null;
  referralRewardCount: number;
  referralRewardMonthKey: string;
  rewardedUnlocksUsed: number;
  updatedAt: Timestamp;
  weeklyCycleKey: string;
  weeklyFreeAvailable: boolean;
};

type AccessState = {
  bonusAnalysisCredits: number;
  canApplyReferralCode: boolean;
  inviteCode: string;
  isPro: boolean;
  nextWeeklyResetAt: string;
  proExpiresAt: string | null;
  rewardedUnlocksLimit: number;
  rewardedUnlocksUsedThisWeek: number;
  weeklyFreeAvailable: boolean;
};

type ProfileRead = {
  inviteReference: FirebaseFirestore.DocumentReference;
  profile: MonetizationProfile;
  profileReference: FirebaseFirestore.DocumentReference;
};

function requireUid(authentication: { uid: string } | undefined) {
  if (!authentication) throw new HttpsError('unauthenticated', 'Authentication is required.');
  return authentication.uid;
}

function kstCycle(now: Date) {
  const shifted = new Date(now.getTime() + KST_OFFSET_MS);
  const shiftedMidnight = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  const startShifted = shiftedMidnight - shifted.getUTCDay() * 24 * 60 * 60 * 1000;
  const startUtc = startShifted - KST_OFFSET_MS;
  const key = new Date(startShifted).toISOString().slice(0, 10);
  return {
    key,
    nextResetAt: new Date(startUtc + WEEK_MS),
  };
}

function kstMonthKey(now: Date) {
  const shifted = new Date(now.getTime() + KST_OFFSET_MS);
  return shifted.toISOString().slice(0, 7);
}

function numberOr(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function timestampOrNull(value: unknown) {
  return value instanceof Timestamp ? value : null;
}

function inviteCodeForUid(uid: string) {
  return createHash('sha256').update(`lotto-insight:${uid}`).digest('hex').slice(0, 8).toUpperCase();
}

function normalizeProfile(
  raw: FirebaseFirestore.DocumentData | undefined,
  uid: string,
  now: Date,
): MonetizationProfile {
  const timestamp = Timestamp.fromDate(now);
  const cycle = kstCycle(now);
  const storedCycleKey = typeof raw?.weeklyCycleKey === 'string' ? raw.weeklyCycleKey : '';
  const cycleChanged = storedCycleKey !== cycle.key;
  return {
    analysisUnlockCount: Math.max(0, numberOr(raw?.analysisUnlockCount, 0)),
    bonusCredits: Math.max(0, Math.min(BONUS_CREDIT_LIMIT, numberOr(raw?.bonusCredits, WELCOME_CREDITS))),
    createdAt: raw?.createdAt instanceof Timestamp ? raw.createdAt : timestamp,
    inviteCode: typeof raw?.inviteCode === 'string' ? raw.inviteCode : inviteCodeForUid(uid),
    proExpiresAt: timestampOrNull(raw?.proExpiresAt),
    referralRewardCount: numberOr(raw?.referralRewardCount, 0),
    referralRewardMonthKey: typeof raw?.referralRewardMonthKey === 'string'
      ? raw.referralRewardMonthKey
      : kstMonthKey(now),
    rewardedUnlocksUsed: cycleChanged ? 0 : Math.max(0, numberOr(raw?.rewardedUnlocksUsed, 0)),
    updatedAt: timestamp,
    weeklyCycleKey: cycle.key,
    weeklyFreeAvailable: cycleChanged
      ? true
      : typeof raw?.weeklyFreeAvailable === 'boolean' ? raw.weeklyFreeAvailable : true,
  };
}

async function readProfile(transaction: Transaction, uid: string, now: Date): Promise<ProfileRead> {
  const database = getFirestore();
  const profileReference = database.doc(`users/${uid}/monetization/access`);
  const snapshot = await transaction.get(profileReference);
  const profile = normalizeProfile(snapshot.data(), uid, now);
  return {
    inviteReference: database.doc(`inviteCodes/${profile.inviteCode}`),
    profile,
    profileReference,
  };
}

function persistProfile(transaction: Transaction, read: ProfileRead, uid: string) {
  transaction.set(read.profileReference, read.profile, { merge: true });
  transaction.set(read.inviteReference, { uid }, { merge: true });
}

function toAccessState(profile: MonetizationProfile, now: Date, hasReferral: boolean): AccessState {
  const proExpiresAt = profile.proExpiresAt?.toDate() ?? null;
  return {
    bonusAnalysisCredits: profile.bonusCredits,
    canApplyReferralCode: profile.analysisUnlockCount === 0 && !hasReferral,
    inviteCode: profile.inviteCode,
    isPro: Boolean(proExpiresAt && proExpiresAt.getTime() > now.getTime()),
    nextWeeklyResetAt: kstCycle(now).nextResetAt.toISOString(),
    proExpiresAt: proExpiresAt?.toISOString() ?? null,
    rewardedUnlocksLimit: REWARDED_UNLOCK_LIMIT,
    rewardedUnlocksUsedThisWeek: profile.rewardedUnlocksUsed,
    weeklyFreeAvailable: profile.weeklyFreeAvailable,
  };
}

function normalizedNumbers(value: unknown) {
  if (!Array.isArray(value)) throw new HttpsError('invalid-argument', 'Six numbers are required.');
  const numbers = [...new Set(value)]
    .filter((item): item is number => Number.isInteger(item) && item >= 1 && item <= 45)
    .sort((left, right) => left - right);
  if (numbers.length !== 6) throw new HttpsError('invalid-argument', 'Six unique numbers are required.');
  return numbers;
}

function normalizedDataVersion(value: unknown) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9._-]{1,64}$/.test(value)) {
    throw new HttpsError('invalid-argument', 'A valid data version is required.');
  }
  return value;
}

export const getMonetizationAccessState = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request.auth);
  const database = getFirestore();
  const referralReference = database.doc(`referrals/${uid}`);
  const now = new Date();
  return database.runTransaction(async (transaction) => {
    const [read, referralSnapshot] = await Promise.all([
      readProfile(transaction, uid, now),
      transaction.get(referralReference),
    ]);
    persistProfile(transaction, read, uid);
    return toAccessState(read.profile, now, referralSnapshot.exists);
  });
});

export const authorizeCombinationAnalysis = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request.auth);
  const numbers = normalizedNumbers(request.data?.numbers);
  const dataVersion = normalizedDataVersion(request.data?.dataVersion);
  const combinationKey = numbers.join('-');
  const unlockId = createHash('sha256')
    .update(`${combinationKey}:${dataVersion}`)
    .digest('hex');
  const database = getFirestore();
  const unlockReference = database.doc(`users/${uid}/analysisUnlocks/${unlockId}`);
  const referralReference = database.doc(`referrals/${uid}`);
  const now = new Date();

  return database.runTransaction(async (transaction) => {
    const [profileRead, unlockSnapshot, referralSnapshot] = await Promise.all([
      readProfile(transaction, uid, now),
      transaction.get(unlockReference),
      transaction.get(referralReference),
    ]);

    if (unlockSnapshot.exists) {
      persistProfile(transaction, profileRead, uid);
      return {
        accessState: toAccessState(profileRead.profile, now, referralSnapshot.exists),
        combinationKey,
        decision: 'UNLOCKED_EXISTING' as const,
      };
    }

    const isPro = toAccessState(profileRead.profile, now, referralSnapshot.exists).isPro;
    let source: 'PRO' | 'WEEKLY_FREE' | 'BONUS_CREDIT' | null = null;
    if (isPro) {
      source = 'PRO';
    } else if (profileRead.profile.weeklyFreeAvailable) {
      source = 'WEEKLY_FREE';
      profileRead.profile.weeklyFreeAvailable = false;
    } else if (profileRead.profile.bonusCredits > 0) {
      source = 'BONUS_CREDIT';
      profileRead.profile.bonusCredits -= 1;
    }

    if (!source) {
      persistProfile(transaction, profileRead, uid);
      return {
        accessState: toAccessState(profileRead.profile, now, referralSnapshot.exists),
        combinationKey,
        decision: 'REWARD_OR_PRO_REQUIRED' as const,
      };
    }

    profileRead.profile.analysisUnlockCount += 1;

    const referralData = referralSnapshot.data();
    const inviterUid = referralData?.status === 'APPLIED' && typeof referralData.inviterUid === 'string'
      ? referralData.inviterUid
      : null;
    const inviterRead = inviterUid ? await readProfile(transaction, inviterUid, now) : null;

    if (inviterRead && inviterUid) {
      const currentMonth = kstMonthKey(now);
      const count = inviterRead.profile.referralRewardMonthKey === currentMonth
        ? inviterRead.profile.referralRewardCount
        : 0;
      const inviterRewarded = count < MONTHLY_REFERRAL_REWARD_LIMIT;
      profileRead.profile.bonusCredits = Math.min(
        BONUS_CREDIT_LIMIT,
        profileRead.profile.bonusCredits + REFERRAL_INVITEE_REWARD,
      );
      if (inviterRewarded) {
        inviterRead.profile.bonusCredits = Math.min(
          BONUS_CREDIT_LIMIT,
          inviterRead.profile.bonusCredits + REFERRAL_INVITER_REWARD,
        );
        inviterRead.profile.referralRewardCount = count + 1;
        inviterRead.profile.referralRewardMonthKey = currentMonth;
      }
      persistProfile(transaction, inviterRead, inviterUid);
      transaction.set(referralReference, {
        inviteeReward: REFERRAL_INVITEE_REWARD,
        inviterReward: inviterRewarded ? REFERRAL_INVITER_REWARD : 0,
        qualifiedAt: Timestamp.fromDate(now),
        status: 'QUALIFIED',
      }, { merge: true });
    }

    persistProfile(transaction, profileRead, uid);
    transaction.create(unlockReference, {
      combinationKey,
      dataVersion,
      numbers,
      source,
      unlockedAt: Timestamp.fromDate(now),
    });
    return {
      accessState: toAccessState(profileRead.profile, now, referralSnapshot.exists),
      combinationKey,
      decision: source === 'PRO'
        ? 'AUTHORIZED_PRO' as const
        : source === 'WEEKLY_FREE'
          ? 'AUTHORIZED_WEEKLY' as const
          : 'AUTHORIZED_CREDIT' as const,
    };
  });
});

export const applyReferralCode = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request.auth);
  const code = typeof request.data?.code === 'string'
    ? request.data.code.trim().toUpperCase()
    : '';
  if (!/^[A-F0-9]{8}$/.test(code)) {
    throw new HttpsError('invalid-argument', '초대 코드 형식을 확인해 주세요.');
  }

  const database = getFirestore();
  const codeReference = database.doc(`inviteCodes/${code}`);
  const referralReference = database.doc(`referrals/${uid}`);
  const now = new Date();
  return database.runTransaction(async (transaction) => {
    const [profileRead, codeSnapshot, referralSnapshot] = await Promise.all([
      readProfile(transaction, uid, now),
      transaction.get(codeReference),
      transaction.get(referralReference),
    ]);
    const inviterUid = codeSnapshot.data()?.uid;
    if (typeof inviterUid !== 'string') {
      throw new HttpsError('not-found', '초대 코드를 찾을 수 없어요.');
    }
    if (inviterUid === uid) {
      throw new HttpsError('failed-precondition', '내 초대 코드는 사용할 수 없어요.');
    }
    if (referralSnapshot.exists) {
      throw new HttpsError('already-exists', '이미 초대 코드가 적용되어 있어요.');
    }
    if (profileRead.profile.analysisUnlockCount > 0) {
      throw new HttpsError('failed-precondition', '첫 분석 전에만 초대 코드를 적용할 수 있어요.');
    }

    persistProfile(transaction, profileRead, uid);
    transaction.create(referralReference, {
      appliedAt: Timestamp.fromDate(now),
      code,
      inviteeUid: uid,
      inviterUid,
      status: 'APPLIED',
    });
    return { applied: true };
  });
});
