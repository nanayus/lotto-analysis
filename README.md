# Lotto Data Explorer

대한민국 로또 6/45 과거 데이터를 탐색하는 모바일 UI 프로토타입입니다. 번호를 예측하거나 추천하지 않으며, 현재 수치는 인터랙션 확인을 위한 결정론적 더미 데이터입니다.

## 실행법

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run ios
npm run android
npm run web
```

Firebase 익명 인증과 선택적 Apple·Google 계정 연결은 [Firebase 인증 설정](./docs/FIREBASE_AUTH_SETUP_KO.md)을 참고하세요. RevenueCat Pro 결제·복원 설정은 [RevenueCat 설정](./docs/REVENUECAT_SETUP_KO.md)을 참고하세요. Firebase 환경변수가 없으면 앱은 기존처럼 guest 모드로 동작합니다.

검증 명령:

```bash
npm run typecheck
npm run lint
npm test
npm run web:export
```

## 현재 구현 범위

- Phase 1 — Expo SDK 57, TypeScript strict, Expo Router, 다크 테마와 반응형 앱 셸
- Phase 2 — 1–45 Magnetic Fisheye Number Scrubber, native momentum, snap, haptic
- 선택 번호와 연결된 HOT/NEUTRAL/COLD 프로필 및 최근 5회 표시
- 최근 52회, 출현 기록, Pair, Trio의 고정 더미 UI
- 탐색/조합 만들기 하단 탭과 조합 만들기 placeholder
- React 기반 브랜드 스플래시

Desktop Web에서는 화면이 최대 500px 폭으로 중앙 정렬됩니다.

## NumberScrubber V3 수동 확인 포인트

- 왼쪽 Pane에서 mouse wheel과 trackpad scroll이 자연스럽게 동작하는지
- 오른쪽 Analytics ScrollView와 왼쪽 Scrubber ScrollView가 독립적으로 동작하는지
- touch drag/flick 후 ScrollView native momentum이 이어지는지
- 숫자가 focus를 통과할 때 scale, opacity, X 위치가 연속적으로 변하는지
- scroll이 끝나면 1–45의 가장 가까운 정수 위치로 settle되는지
- Magnetic Rail이 scroll position과 velocity에 반응하고 부드럽게 회복하는지
- Skia Canvas가 ScrollView의 wheel/touch 입력을 가로채지 않는지
- 빠른 momentum 중 haptic이 과하지 않고 최종 settle 시 한 번 반응하는지
- 주변 번호를 탭해 직접 이동할 수 있는지
- 1 아래와 45 위로 넘어가지 않는지
- Profile이 깜빡임 없이 즉시 바뀌는지
- 번호 변경 후 Analytics Pane의 기존 scroll offset이 유지되는지

V3는 `src/features/explore/scrubberV3.constants.ts`에서 다음 값을 조절합니다.

- `NUMBER_STEP`
- `SELECTED_SCALE`, `NEAR_SCALE`, `FAR_SCALE`
- `SELECTED_OPACITY`, `NEAR_OPACITY`, `FAR_OPACITY`
- `FISHEYE_X_OFFSET`
- `LABEL_RAIL_SAFE_GAP`
- `RAIL_X`
- `RAIL_ACCENT_REST_LENGTH`, `RAIL_ACCENT_MAX_LENGTH`
- `RAIL_MAX_VISUAL_VELOCITY`, `FINAL_SNAP_DURATION`
- `INTERACTION_EMPHASIS_DURATION`, `INTERACTION_IDLE_DELAY`

V2는 삭제하지 않았으며 `USE_NUMBER_SCRUBBER_V3` feature flag로 즉시 되돌릴 수 있습니다.
V3만 크게 확인하려면 `/scrubber-playground` route를 사용합니다. `npm install`의
`postinstall` 단계가 Skia Web용 CanvasKit을 `public/canvaskit.wasm`에 복사합니다.

## 의도적으로 미구현한 기능

- 실제 동행복권 데이터 및 외부 API
- 실제 Analytics, HOT/COLD 계산
- Pair/Trio 집계 알고리즘
- Combination Engine과 번호 생성
- 로그인, 저장소, 백엔드, 원격 Analytics

실제 Gesture 감각과 haptic 강도는 단위 테스트 대상이 아니므로 iOS/Android 실제 기기에서 확인해야 합니다.
