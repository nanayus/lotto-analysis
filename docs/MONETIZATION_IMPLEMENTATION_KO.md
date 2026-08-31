# 수익모델 기능 구현 및 운영 설정

작성 기준일: 2026-08-31

## 현재 구현

- Firebase 로그인 사용자별 수익모델 프로필 자동 생성
- 최초 프로필 생성 시 웰컴 분석권 3회 지급
- 매주 일요일 00:00 KST 무료 분석 1회 갱신
- 무료 분석, 보너스 분석권, Pro 순서의 서버 권위 분석 승인
- 같은 사용자·조합·데이터 버전의 중복 차감 방지
- Pro 사용자 판정과 무제한 분석
- 초대 코드 생성·적용과 첫 분석 완료 보상
- 초대받은 사용자 +1회, 초대한 사용자 +2회
- 초대한 사용자 월 5명, 보너스 분석권 최대 10회 제한
- 받은 초대 코드는 앱 첫 실행 온보딩에서만 입력 가능
- 초대 코드 없이 건너뛰거나 첫 분석을 완료하면 입력 UI 영구 숨김
- 비로그인 상태에서 입력한 코드는 로그인 후 서버에 자동 적용
- Custom 기간과 조합 비교의 Pro 게이트
- 조합 결과의 `AI 조합 해설` 잠금 카드와 맥락형 Pro Paywall
- Pro 사용자의 `AI 요약`, 추천 질문, 자유 입력 후속 질문
- Firebase Callable Function에서 인증과 Pro 권한 재검증 후 Gemini 호출
- 확정 분석 결과를 압축한 스냅샷만 전달하고 예측·추천 요청을 거절하는 서버 프롬프트
- Gemini 요청 저장 비활성화, 50초 API timeout, 60초 함수 timeout, UI 재시도 상태
- 설정 화면의 플랜·주간 무료 분석·분석권·초대 코드 UI
- 분석 횟수 소진 안내와 Pro Paywall UI

## Firebase 배포

다음 Functions가 추가됐다.

수익모델 함수는 Apple 비밀키를 사용하는 계정삭제 함수와 독립적으로 배포할 수 있도록 Firebase `monetization` 코드베이스로 분리한다.

```text
getMonetizationAccessState
authorizeCombinationAnalysis
applyReferralCode
askCombinationAi
```

수익모델 함수는 Apple 비밀 키 설정 전에도 독립적으로 배포할 수 있다.

```bash
npm --prefix functions-monetization install
npm --prefix functions-monetization run build
firebase deploy --only functions:monetization
```

AI API 키는 클라이언트 환경변수가 아니라 Firebase Secret으로 저장하고 `askCombinationAi` 함수에만 연결한다.

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions:monetization
```

현재 함수는 `asia-northeast3`, Node.js 22 환경에 배포되어 있다. 내부 모델명은 서버 상수로 관리하며 사용자 화면에는 표시하지 않는다.

분석권과 Pro 상태는 다음 서버 문서에서 관리한다.

```text
users/{uid}/monetization/access
users/{uid}/analysisUnlocks/{unlockId}
inviteCodes/{code}
referrals/{inviteeUid}
```

클라이언트의 Firestore 직접 읽기·쓰기는 허용하지 않는다. 앱은 인증된 Firebase Callable Function으로만 분석 승인을 요청한다.

## AI 조합 해설 구조

```text
조합 분석 결과
  ↓ 사용자가 AI 조합 해설 선택
Firebase Callable: askCombinationAi
  ↓ 인증 확인 + Firestore Pro 권한 재검증
Gemini Interactions API
  ↓ 과거 통계 설명만 반환
AI 요약·후속 질문 sheet
```

- 결과 화면 진입만으로 AI를 호출하지 않는다. Pro 사용자가 카드를 열 때 첫 요약을 요청한다.
- Free 사용자는 AI 기능의 존재와 Pro 전용 여부를 확인할 수 있고, 카드 선택 시 Paywall로 이동한다.
- 서버는 클라이언트의 `isPro` 값을 신뢰하지 않고 `users/{uid}/monetization/access`를 다시 읽는다.
- 모델에는 전체 원본 추첨 데이터가 아니라 현재 필터가 반영된 분석 스냅샷과 제한된 대화 이력만 전달한다.
- 요청은 `store: false`, `thinking_level: minimal`로 보내며 API 호출은 50초, Callable은 60초에 종료한다.
- AI 서비스가 실패해도 기존 표준 분석 보고서와 분석권 원장은 변경하지 않는다.
- 답변 UI에는 내부 모델명이나 API 이름을 노출하지 않는다.

## 아직 외부 설정이 필요한 기능

### Pro 결제

현재 Paywall은 상품 구조와 가격을 표시하지만 결제 버튼은 명시적으로 비활성화되어 있다. 다음 설정 후 활성화한다.

- App Store Connect 월간·연간 구독 상품 생성
- Google Play Console 월간·연간 구독 상품 생성
- RevenueCat 프로젝트, entitlement `pro`, offerings 연결
- RevenueCat SDK와 development build 설정
- RevenueCat webhook에서 `users/{uid}/monetization/access.proExpiresAt` 갱신
- 구매·복원·환불·유예·만료 실제 기기 검증

상품 기준:

```text
pro_monthly  ₩4,900
pro_annual   ₩39,000
```

### 리워드 광고

현재 분석 소진 시트는 광고 연결 준비 상태를 정확히 표시하며 가짜 광고 완료나 가짜 보상을 제공하지 않는다. 다음 설정 후 활성화한다.

- iOS·Android AdMob 앱 등록
- Rewarded Ad Unit 생성
- Google Mobile Ads SDK와 Expo config plugin 설정
- AdMob SSV callback 공개 HTTPS 함수 구현
- 거래 ID 중복 방지와 서명 검증
- 주간 3회 제한 및 광고 실패 시 미차감 검증

Web에는 리워드 광고를 제공하지 않는다.

## 운영 보강이 필요한 항목

AI 해설 기능 자체와 Secret 배포는 완료되었지만, 공개 운영 전 다음 항목을 추가로 닫아야 한다.

- 사용자별·시간대별 AI 호출 rate limit과 Pro 사용량 상한
- API 비용 예산과 이상 사용량 경보
- 동일 조합·동일 필터의 첫 요약 캐시 여부
- 지연 시간, timeout, upstream 오류율 모니터링
- Firebase App Check 적용 및 강제 여부 검증
- 자유 질문의 개인정보 고지와 로그·보관 정책
- 예측성 답변이나 근거 없는 수치를 점검할 샘플링·신고 절차

## 확인 시나리오

1. 신규 로그인 사용자가 주간 무료 1회와 웰컴 분석권 3회를 확인한다.
2. 첫 분석은 주간 무료 횟수를 먼저 사용한다.
3. 다른 조합 분석부터 보너스 분석권이 하나씩 차감된다.
4. 같은 조합을 다시 열면 추가 차감되지 않는다.
5. 데이터 버전이 바뀐 같은 조합은 새 분석으로 처리된다.
6. 사용 가능 횟수가 없으면 보고서를 계산하지 않고 선택 시트를 표시한다.
7. 무료 사용자가 Custom 기간이나 조합 비교를 선택하면 Pro Paywall을 표시한다.
8. 받은 초대 코드는 앱 첫 실행 온보딩에서만 입력할 수 있다.
9. 초대 코드 입력을 건너뛰거나 첫 분석을 완료하면 입력 UI가 다시 나타나지 않는다.
10. 초대받은 사용자의 첫 분석 완료 시 양쪽 보상이 한 번만 지급된다.
11. 계정 삭제 시 사용자 하위 원장, 초대 코드와 초대 관계를 함께 제거한다.
12. Free 사용자가 AI 조합 해설 카드를 누르면 답변 대신 Pro Paywall을 표시한다.
13. Pro 사용자는 AI 요약을 불러오고 추천 질문과 자유 질문을 이어서 보낼 수 있다.
14. 클라이언트에서 Pro처럼 보이도록 조작해도 서버가 Free 계정의 AI 요청을 거절한다.
15. 예측·추천 질문에는 미래 번호를 제시하지 않고 과거 통계 설명 범위로 되돌린다.
16. AI timeout·오류 시 다시 불러오기를 제공하고 표준 분석 결과는 그대로 유지한다.
17. AI sheet와 오류 메시지 어디에도 내부 모델명이 표시되지 않는다.

## 검증 명령

```bash
npm run lint
npm test -- --runInBand
npm --prefix functions run lint
npm --prefix functions run build
npm --prefix functions-monetization run lint
npm --prefix functions-monetization run build
```
