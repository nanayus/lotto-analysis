# Lotto Insight

> 번호는 무작위. 보는 방식은 다르게.

Lotto Insight는 로또 6/45의 과거 당첨 데이터를 차분하게 탐색하는 Expo 앱입니다. 번호를 판매하거나 당첨을 예측·보장하지 않으며, 생성된 조합도 추천이나 확률 우위를 뜻하지 않습니다.

## 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run ios
npm run android
npm run web
```

주요 환경 변수는 [.env.example](./.env.example)에 정리되어 있습니다.

- Firebase 익명 인증과 선택적 Apple·Google 계정 연결: [Firebase 인증 설정](./docs/FIREBASE_AUTH_SETUP_KO.md)
- RevenueCat 구독·구매 복원: [RevenueCat 설정](./docs/REVENUECAT_SETUP_KO.md)

Firebase 설정이 없으면 인증·클라우드 기능 없이 기기 저장 방식으로 동작합니다. 결과 광고는 `EXPO_PUBLIC_RESULT_ADS_ENABLED`, 계정 연결 UI와 Pro 결제는 각각 `EXPO_PUBLIC_ACCOUNT_LINKING_ENABLED`, `EXPO_PUBLIC_PRO_PLAN_ENABLED`로 독립 제어합니다.

## 현재 구현 범위

- 번호뽑기: 무작위 뽑기와 조건 기반 조합 생성
- 내번호보기: 생성·선택한 조합의 기기 저장, 즐겨찾기·구매 표시, 재생성 및 분석 이동
- 통계보기: 번호별 탐색, 전체 번호 통계, 회차별 당첨번호 분석, 여섯 번호 조합 분석
- 조합 분석: 과거 회차의 일치 분포·등위 상당 기록, 개별 번호·형태·부분 조합·그룹 빈도 분석
- 콘텐츠: 로또 통계를 확률과 무작위성의 관점에서 설명하는 읽을거리
- 환경설정: 화면 모드, 개인정보처리방침, 익명 이용정보/계정 삭제, 조건부 Pro 상태
- Firebase 익명 인증, 선택적 계정 연결과 클라우드 저장 코드
- RevenueCat 구매·복원 및 서버 권한 확인 코드
- Firebase Analytics 이벤트와 AI 해설 연동 코드

현재 배포 정책은 모든 핵심 기능을 무료로 열고, 지원되는 네이티브 환경에서 분석 결과 진입 전 전면광고만 운영합니다. Pro 결제·잠금 UI와 계정 연결 UI는 비활성화하지만 관련 코드는 이후 재사용할 수 있도록 유지합니다.

## 데이터

앱의 분석은 런타임 외부 API가 아니라 번들된 정적 데이터에서 계산합니다.

- `src/data/generated/lotto_history.json`: 1회부터 1239회(2026-08-29)까지의 회차·당첨번호·보너스 번호
- `src/data/generated/number-analytics.json`: 번호별 사전 계산 통계

Pair, Trio, HOT/NEUTRAL/COLD, 전체 통계와 조합 분석은 위 데이터 또는 순수 도메인 함수로 계산됩니다. 테스트용 결정론적 fixture는 테스트와 예외 상황 확인에만 사용하며 실제 분석 화면의 데이터 원본이 아닙니다.

## 검증

```bash
npm run typecheck
npm run lint
npm test
npm run web:export
npx expo-doctor
```

웹 배포는 모바일 폭을 기준으로 최대 500px 안에 앱을 표시합니다. 네이티브 momentum, haptic, Apple/Google 로그인, RevenueCat 결제·복원은 development build와 iOS/Android 실기기에서 별도로 확인해야 합니다.

## NumberScrubber 조정

번호 탐색의 Magnetic Fisheye Scrubber는 `src/features/explore/scrubberV3.constants.ts`에서 간격, 크기, 투명도, rail 반응, snap 시간과 interaction 강조를 조절합니다. 독립 스크롤·휠·momentum을 점검할 때는 개발 전용 `/scrubber-playground` route를 사용할 수 있습니다.

Skia Web용 CanvasKit은 `npm install`의 `postinstall` 단계에서 `public/canvaskit.wasm`으로 복사됩니다.
