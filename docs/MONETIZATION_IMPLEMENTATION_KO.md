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
- 설정 화면의 플랜·주간 무료 분석·분석권·초대 코드 UI
- 분석 횟수 소진 안내와 Pro Paywall UI

## Firebase 배포

다음 Functions가 추가됐다.

수익모델 함수는 Apple 비밀키를 사용하는 계정삭제 함수와 독립적으로 배포할 수 있도록 Firebase `monetization` 코드베이스로 분리한다.

```text
getMonetizationAccessState
authorizeCombinationAnalysis
applyReferralCode
```

수익모델 함수는 Apple 비밀 키 설정 전에도 독립적으로 배포할 수 있다.

```bash
npm --prefix functions-monetization install
npm --prefix functions-monetization run build
firebase deploy --only functions:monetization
```

분석권과 Pro 상태는 다음 서버 문서에서 관리한다.

```text
users/{uid}/monetization/access
users/{uid}/analysisUnlocks/{unlockId}
inviteCodes/{code}
referrals/{inviteeUid}
```

클라이언트의 Firestore 직접 읽기·쓰기는 허용하지 않는다. 앱은 인증된 Firebase Callable Function으로만 분석 승인을 요청한다.

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

## 검증 명령

```bash
npm run lint
npm test -- --runInBand
npm --prefix functions run lint
npm --prefix functions run build
npm --prefix functions-monetization run lint
npm --prefix functions-monetization run build
```
