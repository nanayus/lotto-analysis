# Lotto Insight Analytics 이벤트 명세

## 목적

GA4 측정 ID는 `G-0C2D8KS9Q8`을 사용한다. 분석은 사용자를 감시하기 위한 것이 아니라 아래 제품 질문에 답하기 위해 수집한다.

1. 사용자는 어느 화면에서 가장 많이 이탈하는가?
2. 랜덤조합과 조건조합 중 무엇을 더 많이 사용하는가?
3. 조합을 만든 사용자가 실제 분석 결과까지 보는가?
4. 분석을 요청한 사용자가 전면광고를 거쳐 결과를 확인하는가?
5. 로그인 및 Pro 안내가 어느 위치에서 가장 효과적인가?
6. 어떤 번호·형태의 조합이 자주 생성되고 분석되는가?
7. 사용자가 조건 조합에서 어떤 조건을 가장 많이 사용하는가?
8. 분석 결과에서 어떤 지표를 실제로 보고 더 탐색하는가?

이름, 이메일, Firebase UID, 광고 식별자 원문과 같은 개인 식별 정보는 커스텀 이벤트에 포함하지 않는다.

## 핵심 퍼널

### 분석 퍼널

```text
screen_view (조합 생성/선택 화면)
→ combination_generated (자동 생성인 경우)
→ analysis_requested
→ interstitial_ad_started
→ interstitial_ad_completed
→ analysis_result_viewed
```

주요 전환율:

- 분석 시작률: `analysis_requested / 조합 생성·선택 화면 사용자`
- 광고 시작률: `interstitial_ad_started / analysis_requested`
- 광고 완료율: `interstitial_ad_completed / interstitial_ad_started`
- 결과 도달률: `analysis_result_viewed / analysis_requested`
- 광고 후 결과 도달률: `analysis_result_viewed(access_method=interstitial_ad) / interstitial_ad_completed`

### 로그인 퍼널

```text
login_prompt_viewed
→ login_started
→ login_completed
```

`intent`로 어느 화면의 로그인 권유가 실제 로그인으로 이어졌는지 비교한다.

### Pro 안내 퍼널

```text
paywall_viewed
→ paywall_closed 또는 향후 purchase_completed
```

현재 결제 연동 전에는 `source`별 안내 노출량과 닫힘만 측정한다. 결제가 연결되면 스토어 검증 완료 시점에만 구매 완료 이벤트를 추가한다.

## 이벤트

| 이벤트 | 발생 시점 | 핵심 파라미터 |
|---|---|---|
| `screen_view` | Expo Router 경로 변경 | `firebase_screen`, `page_path`(웹) |
| `combination_generated` | 랜덤·조건 조합 생성 완료 | `source`, `game_count`, `condition_count`, `generation_mode`, 조합 지표 |
| `generator_condition_used` | 조건이 적용된 조합 생성 완료. 한 생성 요청에서 활성 조건별 1회 | `condition_key`, `condition_count`, `source` |
| `analysis_requested` | 6개 번호 분석을 확정 | `source`, `account_tier`, 조합 지표 |
| `interstitial_ad_started` | 결과 진입 전 전면광고 요청 | `source`, `account_tier`, 조합 지표 |
| `interstitial_ad_completed` | 전면광고 닫힘 확인 | `source`, `account_tier`, 조합 지표 |
| `interstitial_ad_failed` | 광고 로드·표시 오류 | 위 항목 + `reason` |
| `analysis_result_viewed` | 분석 결과 화면 진입 | `access_method`, `period`, `bonus_included`, `headline_metric`, 조합 지표 |
| `analysis_section_viewed` | 결과 영역이 50% 이상 0.8초 동안 표시 | `section_key`, `headline_metric`, 분석 조건, 조합 지표 |
| `analysis_result_interaction` | 결과 영역의 탭·더보기·상세 버튼 등 선택 | `section_key`, `action`, `item_key`, `headline_metric`, 분석 조건, 조합 지표 |
| `login_prompt_viewed` | 로그인 모달 노출 | `intent` |
| `login_prompt_closed` | 로그인하지 않고 모달 닫기 | `intent` |
| `login_started` | 로그인 제공자 선택 | `provider` |
| `login_completed` | 인증 완료 | `provider` |
| `paywall_viewed` | Pro 안내 노출 | `source` |
| `paywall_closed` | Pro 안내 닫기 | `source` |

## 조합 지표

조합 관련 이벤트에는 다음 필드를 공통으로 보낸다.

- `combination_key`: 오름차순 두 자리 번호 6개. 예: `03-04-13-22-27-45`
- `number_1`~`number_6`: 오름차순 번호
- `number_sum`: 번호 합계
- `odd_count`: 홀수 개수
- `consecutive_link_count`: 서로 이어진 번호 쌍의 수

`combination_key`는 값 종류가 매우 많으므로 GA4의 커스텀 측정기준으로 등록하지 않는다. 개별 조합 순위가 필요하면 Firebase의 BigQuery 내보내기를 연결해 원시 이벤트를 집계한다. GA4 대시보드에는 값 종류가 적은 항목만 커스텀 측정기준으로 등록한다.

## 조건과 결과 관심도 해석

- 조건 사용 순위: `generator_condition_used`의 사용자 수 또는 이벤트 수를 `condition_key`별로 비교한다. 여러 게임을 한 번에 생성해도 조건 이벤트는 요청당 한 번만 기록되므로 게임 수에 의해 순위가 부풀지 않는다.
- 결과 영역 도달률: `analysis_section_viewed / analysis_result_viewed`를 `section_key`별로 비교한다.
- 결과 영역 탐색률: `analysis_result_interaction / analysis_section_viewed`를 `section_key`별로 비교한다.
- 조합 결과 유형별 관심도: `headline_metric`별 결과 영역 도달률과 탐색률을 비교한다.
- 단순 스크롤 통과를 관심으로 오해하지 않도록, 결과 영역 노출은 화면의 50% 이상이 0.8초 유지된 경우에만 한 결과 세션당 한 번 기록한다.

`headline_metric` 값은 결과 문구 자체가 아니라 `same-six`, `five-number`, `four-number`, `three-number`, `pair-concentration`, `number-gap`, `group-frequency`, `consecutive`, `odd-even`, `low-high`, `sum-position`, `number-band`, `same-ending`, `distribution`, `previous-draw`, `number-property`, `neutral`, `empty-period`처럼 안정적인 분류값을 사용한다. 세부 문구와 노출 기준은 `COMBINATION_HEADLINE_SPEC_KO.md`를 따른다.

## 콘솔 설정

1. GA4 관리 → 데이터 표시 → 맞춤 정의에서 아래 이벤트 범위 측정기준을 등록한다.
   - `source`
   - `account_tier`
   - `access_method`
   - `period`
   - `generation_mode`
   - `reason`
   - `intent`
   - `condition_key`
   - `section_key`
   - `action`
   - `item_key`
   - `headline_metric`
2. 탐색 → 유입경로 탐색에서 위의 분석·로그인 퍼널을 각각 만든다.
3. 정확한 번호·조합 분석이 필요해지면 Firebase 설정 → 통합 → BigQuery 연결을 켠다.

## 환경 및 검증

- 운영 빌드는 별도 설정이 없으면 Analytics를 자동 활성화한다.
- 개발 중 실제 전송이 필요할 때만 `EXPO_PUBLIC_ANALYTICS_ENABLED=true`를 사용한다.
- 테스트 실행(`NODE_ENV=test`)에서는 항상 전송하지 않는다.
- 웹은 Firebase JS Analytics를, iOS·Android는 React Native Firebase Analytics를 사용한다.
- 네이티브 모듈을 추가했으므로 Expo Go가 아닌 새 Development Build 또는 EAS Build가 필요하다.
- 2026-09-03 Firebase CLI에서 iOS·Android 최신 설정을 다시 조회해 저장소의 `GoogleService-Info.plist`, `google-services.json`과 앱 ID가 일치함을 확인했다. 네이티브 설정 파일을 다시 교체할 필요는 없다.
