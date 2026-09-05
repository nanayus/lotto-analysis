# AdMob 전면 광고 TestFlight 테스트

현재 앱은 Google 공식 샘플 앱 ID와 전면 테스트 광고 단위 ID를 사용하는 전용 EAS 프로필을 제공한다. 이 프로필의 광고는 수익이 발생하지 않으며 안전하게 재생·클릭할 수 있다.

## 빌드

```sh
npx eas build --platform ios --profile testflight
```

빌드가 끝나면 App Store Connect에 제출하고 TestFlight에서 설치한다. 네이티브 모듈이 포함되므로 Expo Go나 기존 TestFlight 빌드에서는 확인할 수 없고 반드시 새 빌드가 필요하다.

## 확인 절차

1. TestFlight 앱에서 비 Pro 계정으로 조건 선택 화면을 연다.
2. 조건을 선택한 뒤 `이 조건으로 뽑기`를 누른다.
3. 광고에 `Test mode` 또는 `Test Ad` 표시가 있는지 확인한다.
4. 전면광고를 닫으면 별도의 광고 선택 화면 없이 분석 결과가 열린다.

`testflight` 프로필은 `EXPO_PUBLIC_PRO_PLAN_ENABLED=true`와 `EXPO_PUBLIC_ADMOB_TEST_MODE=true`를 빌드에 주입한다. 기존 `production` 프로필에는 테스트 광고 설정이 들어가지 않는다.

## 실제 광고 전환

실제 출시 전에는 아래 값을 EAS production 환경에 설정하고 별도 production 빌드를 만든다.

```text
EXPO_PUBLIC_ADMOB_IOS_APP_ID
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_AD_UNIT_ID
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_AD_UNIT_ID
```

실제 광고 빌드에서는 `EXPO_PUBLIC_ADMOB_TEST_MODE`를 `true`로 설정하지 않는다. 실광고는 개발자 본인이 클릭하지 않는다. 개인정보 동의 및 실제 광고 운영 정책은 출시 전에 별도로 점검한다.
