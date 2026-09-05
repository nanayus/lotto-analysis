export function isInterstitialAdConfigured() {
  return __DEV__;
}

export async function prepareInterstitialAd() {
  return isInterstitialAdConfigured();
}

export async function showInterstitialAd() {
  if (!isInterstitialAdConfigured()) return false;
  await new Promise((resolve) => setTimeout(resolve, 650));
  return true;
}
