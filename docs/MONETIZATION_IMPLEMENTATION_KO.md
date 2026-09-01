# 수익모델 기능 구현 및 운영 설정

최종 수정: 2026-09-02

이 문서는 [`MONETIZATION_PLAN_KO.md`](./MONETIZATION_PLAN_KO.md)의 승인 정책을 실제 앱과 운영 환경에 연결하는 방법을 설명한다.

## 1. 현재 앱에 반영된 구조

- 이용 상태를 게스트, 무료회원, Pro로 구분한다.
- 분석권, 티켓, 일간·주간 이용 횟수는 사용하지 않는다.
- 게스트는 한 번에 최대 2개, 로그인 회원은 최대 5개 조합을 만든다.
- 조건 직접 선택과 번호 생성은 결제 없이 이용한다.
- 과거 분포의 넓은 범위를 한 번에 적용하는 균형 프리셋은 로그인 회원부터 이용한다.
- 게스트·무료회원은 결과를 열거나 다시 열 때마다 리워드 광고를 거친다.
- Pro는 광고 없이 즉시 결과를 연다.
- 광고를 완료한 사용자는 표준 분석 결과 전체를 본다.
- Custom 회차 범위, 두 조합 비교, AI 조합 해설·추가 질문은 Pro 전용이다.
- 게스트는 내 번호를 저장하지 않는다.
- 무료회원은 로그인 계정별로 현재 기기에 저장한다.
- Pro는 Firestore에 저장하고 기기간 동기화를 사용한다.
- Pro 전환 시 현재 기기의 로컬 번호를 클라우드에 병합한다.
- 초대 코드 서버·데이터는 보존하되 사용자 UI는 숨긴다.

## 2. 앱 접근 흐름

```text
번호 선택·생성
  ↓
분석하기
  ├─ Pro → 결과 바로 공개
  └─ 게스트·무료회원 → 결과 공개 선택 화면
       ├─ Pro 살펴보기
       ├─ 광고 보고 이번 결과 보기
       └─ 다음에 하기
```

리워드 광고가 중단되거나 준비되지 않으면 결과를 열지 않는다. 실패를 결제 오류로 표현하지 않으며 Pro와 다음에 하기는 계속 선택할 수 있어야 한다.

## 3. 클라이언트 정책 소스

등급별 기능 차이는 `src/features/monetization/policy.ts`를 기준으로 한다.

```text
guest
  조합 2개 / 직접 조건 설정 / 결과 광고 / 저장 불가

free
  조합 5개 / 균형 프리셋 / 결과 광고 / 기기 저장

pro
  조합 5개 / 균형 프리셋 / 광고 제거 / AI·비교·Custom / 클라우드 저장
```

화면마다 별도의 숫자나 권한을 하드코딩하지 않는다. 화면은 정책 객체에서 선택 한도, 저장 방식, Pro 기능 여부를 읽는다.

## 4. Firebase 구조

현재 Callable Function은 다음 역할을 가진다.

```text
getMonetizationAccessState
authorizeCombinationAnalysis
applyReferralCode
askCombinationAi
```

- `getMonetizationAccessState`: 서버의 Pro 만료 상태를 반환한다.
- `authorizeCombinationAnalysis`: Pro이면 즉시 승인하고, 아니면 리워드 광고 또는 Pro가 필요하다고 응답한다.
- `applyReferralCode`: 재출시 검토를 위해 서버 코드만 보존한다. 현재 앱 UI에서는 호출 경로를 제공하지 않는다.
- `askCombinationAi`: 인증과 Pro 권한을 서버에서 다시 확인한 뒤 과거 통계 해설을 요청한다.

클라이언트의 `isPro` 값만 믿지 않는다. AI와 클라우드 저장처럼 비용·권한이 걸린 기능은 서버 또는 Firestore 보안 규칙에서도 사용자 권한을 검증해야 한다.

수익모델 Functions는 별도 코드베이스로 빌드한다.

```bash
npm --prefix functions-monetization install
npm --prefix functions-monetization run build
firebase deploy --only functions:monetization
```

AI API 키는 클라이언트 환경변수가 아니라 Firebase Secret에 저장한다.

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions:monetization
```

## 5. AI 조합 해설

```text
조합 분석 결과
  ↓ Pro 사용자가 AI 조합 해설 선택
Firebase Callable: askCombinationAi
  ↓ 인증·Pro 권한 재검증
Gemini API
  ↓ 과거 통계 설명만 반환
AI 요약·후속 질문 화면
```

- 결과 화면 진입만으로 AI를 호출하지 않는다.
- 무료 사용자가 카드를 선택하면 맥락형 Pro 안내를 연다.
- 전체 원본 추첨 데이터 대신 현재 필터가 반영된 분석 스냅샷만 전달한다.
- 미래 번호 예측·추천 요청은 거절하고 과거 통계 설명으로 범위를 되돌린다.
- AI 오류는 표준 분석 결과나 저장 데이터에 영향을 주지 않는다.
- 답변 화면에 내부 모델명과 API 이름을 노출하지 않는다.

## 6. 외부 설정이 필요한 기능

### Pro 결제

현재 Paywall은 상품 가치를 보여주지만 실제 구매 버튼은 준비 상태다. 다음 설정을 마친 뒤 활성화한다.

- App Store Connect 월간·연간 구독 상품
- Google Play Console 월간·연간 구독 상품
- RevenueCat 프로젝트와 entitlement `pro`
- RevenueCat SDK 및 Expo development build
- 구매, 복원, 환불, 유예, 만료의 실제 기기 검증
- 서버 Pro 상태 또는 검증된 entitlement와 앱 상태의 동기화

가격 가안:

```text
pro_monthly  ₩4,900
pro_annual   ₩39,000
```

### 리워드 광고

현재 결과 공개 화면은 광고가 연결되지 않았음을 명확히 표시한다. 가짜 광고 완료나 임시 무료 통과는 제공하지 않는다.

- iOS·Android AdMob 앱 등록
- 플랫폼별 Rewarded Ad Unit 생성
- Google Mobile Ads SDK와 Expo config plugin
- 테스트·운영 광고 단위 분리
- 서버 측 검증 callback
- transaction ID 중복 방지와 서명 검증
- 광고 완료, 중단, 재고 없음, SDK 오류의 실제 기기 검증
- 개인정보 동의와 광고 식별자 정책 반영

Web에서 리워드 광고를 지원하지 않을 경우, 웹의 무료 결과 공개 대안을 출시 전에 별도로 확정해야 한다.

네이티브 광고 SDK 연결 전 개발·웹 테스트에서는 650ms 테스트 완료 이벤트로 광고 이후 흐름을 검증한다. 이 대체 이벤트는 개발 빌드와 웹에만 제공하며, 운영 네이티브 빌드는 실제 광고 SDK의 보상 완료 이벤트가 없으면 결과를 열지 않는다.

## 7. 운영 보강 항목

- 사용자별 AI 호출 제한과 비용 경보
- 동일 조합·동일 필터 AI 요약 캐시 여부
- Firebase App Check 적용
- Firestore의 Pro 클라우드 저장 보안 규칙 검증
- Pro 종료 후 로컬 사본과 클라우드 데이터 보존 정책 검증
- 광고·구독 관련 개인정보처리방침과 스토어 고지
- 무료 결과가 광고 완료 뒤 빠짐없이 공개되는지 회귀 테스트

## 8. 확인 시나리오

1. 게스트는 한 번에 1개 또는 2개 조합만 선택할 수 있다.
2. 로그인한 무료회원과 Pro는 1개, 3개, 5개 조합을 선택할 수 있다.
3. 조건 선택과 번호 생성 단계에서는 광고나 결제를 요구하지 않는다.
4. 게스트·무료회원이 분석하기를 누르면 결과 공개 선택 화면이 나타난다.
5. 광고 완료 전에는 결과가 열리지 않고, 완료 뒤 표준 결과 전체가 열린다.
6. 게스트·무료회원이 같은 조합을 다시 열 때도 광고를 거친다.
7. Pro는 새 결과와 재열람 결과를 광고 없이 즉시 연다.
8. 게스트는 내번호보기에서 로그인 안내를 보고 번호를 저장할 수 없다.
9. 무료회원의 번호는 같은 계정이라도 다른 기기에서 자동 복원되지 않는다.
10. Pro 전환 시 현재 기기의 로컬 번호가 클라우드에 병합된다.
11. 무료 사용자가 Custom, 조합 비교, AI 해설을 선택하면 해당 기능의 가치를 설명하는 Pro 안내가 열린다.
12. Pro 사용자는 Custom, 비교, AI 해설과 추가 질문을 이용할 수 있다.
13. 클라이언트 상태를 조작해도 서버가 무료 계정의 AI 요청을 거절한다.
14. 환경설정과 상단바 어디에도 티켓 잔액이나 갱신 횟수가 나타나지 않는다.
15. 초대 코드 입력 UI가 로그인과 설정에 나타나지 않는다.
16. 조건 선택 화면의 헤더·회원유형 배너·분류 탭은 본문 스크롤과 분리해 고정하고, 배너는 사용자가 닫을 수 있다.

## 9. 검증 명령

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npm --prefix functions-monetization run build
```
