# RevenueCat Pro 결제 운영 설정

앱은 Firebase UID를 RevenueCat App User ID로 사용합니다. 익명 사용자는 로그인 화면 없이 결제할 수 있고, Apple·Google 계정을 나중에 연결해도 Firebase UID가 유지되는 경우 구매 연결도 유지됩니다.

공개 SDK 키가 없거나 `EXPO_PUBLIC_PRO_PLAN_ENABLED=false`이면 네이티브 결제는 초기화되지 않습니다. Expo Go에서는 RevenueCat 네이티브 모듈을 검증할 수 없으므로 development build와 실제 스토어 샌드박스를 사용합니다.

## 1. 스토어 상품

App Store Connect와 Google Play Console에 동일한 Pro 구독 구조를 만듭니다.

- 월간 상품
- 연간 상품
- iOS 두 상품은 같은 Subscription Group
- 표시 가격과 설명은 각 스토어에서 현지화

상품 ID는 한 번 출시하면 바꾸기 어렵습니다. 실제 ID를 만든 뒤 RevenueCat Dashboard에 그대로 등록합니다.

## 2. RevenueCat 프로젝트

1. RevenueCat 프로젝트에 iOS 앱 `net.wondly.lottoinsight`를 추가합니다.
2. Android 앱 `net.wondly.lottoinsight`를 추가합니다.
3. App Store Connect In-App Purchase Key와 Google Play service credential을 연결합니다.
4. Entitlement를 `pro`라는 식별자로 만듭니다.
5. 월간·연간 상품을 `pro` entitlement에 연결합니다.
6. Current Offering에 `$rc_monthly`, `$rc_annual` package를 구성합니다.
7. Restore behavior는 익명 구매 재설치를 지원하도록 `Transfer to new App User ID`를 사용합니다.

코드의 기본 entitlement ID는 `pro`입니다. Dashboard에서 다른 값을 쓰면 앱과 Functions 환경값을 모두 같은 값으로 바꿉니다.

## 3. 앱 환경변수

RevenueCat의 각 앱에서 제공하는 **Public SDK key**를 EAS development, preview, production 환경에 등록합니다.

```text
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro
EXPO_PUBLIC_PRO_PLAN_ENABLED=true
```

`sk_`로 시작하는 Secret API key는 Expo 환경변수에 절대 넣지 않습니다.

## 4. 서버 검증

AI 해설과 서버 권한 확인은 RevenueCat REST API로 entitlement를 다시 검증합니다. RevenueCat Project settings에서 Secret API key를 만든 뒤 Firebase Secret으로 저장합니다.

```bash
firebase use <project-id>
firebase functions:secrets:set REVENUECAT_SECRET_API_KEY
npm --prefix functions install
npm --prefix functions run build
npm --prefix functions-monetization install
npm --prefix functions-monetization run build
firebase deploy --only functions:account,functions:monetization
```

동일한 Secret은 결제 권한 검증과 계정 삭제 시 RevenueCat 고객 데이터 정리에 함께 사용됩니다. Functions 배포 시 `PRO_PLAN_ENABLED=true`를 선택하고, `functions-monetization` 런타임 환경의 `REVENUECAT_ENTITLEMENT_ID=pro`도 앱과 동일하게 설정합니다.

## 5. 출시 전 검증

- 신규 설치에서 Firebase 익명 UID와 같은 RevenueCat App User ID가 생성되는지
- 월간·연간 상품과 현지화 가격이 Paywall에 표시되는지
- 구매 직후 `pro` entitlement가 활성화되는지
- 앱 재실행 후 Pro가 유지되는지
- 앱 삭제·재설치 후 같은 스토어 계정으로 `구매 복원`이 되는지
- 구매 복원 시 새 익명 UID로 entitlement가 정상 이전되는지
- 구독 취소 후 만료일까지 Pro가 유지되고 만료 뒤 잠기는지
- 환불·billing issue·grace period가 RevenueCat 상태에 반영되는지
- 익명 Pro의 저장 번호는 기기에만 남고, 계정을 연결한 Pro만 클라우드 저장되는지
- iOS Sandbox와 Google Play license tester에서 각각 실기기 검증하는지

RevenueCat 공개 키와 상품이 모두 준비되기 전에는 `EXPO_PUBLIC_PRO_PLAN_ENABLED=false`를 유지합니다.
