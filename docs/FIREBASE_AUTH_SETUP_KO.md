# Firebase 익명 인증·계정 연결 운영 설정

앱 코드는 Firebase 설정이 없어도 guest 모드로 실행됩니다. 현재 배포에서는 `EXPO_PUBLIC_ANONYMOUS_AUTH_ENABLED=false`이므로 Firebase가 설정되어 있어도 첫 실행 시 익명 UID를 만들지 않습니다. 아래 내용은 인증 기능을 다시 운영할 때의 설정 절차입니다.

## 1. Firebase 프로젝트

개발용과 운영용 프로젝트를 분리하고 Authentication에서 **Anonymous**, Google, Apple을 활성화합니다. Authentication 설정은 **이메일 주소당 계정 1개**를 유지합니다.

익명 계정 자동 삭제는 장기간 사용한 게스트 UID까지 바꿀 수 있으므로 구매 복원·이용 기록 정책을 검증하기 전에는 활성화하지 않습니다.

다음 앱을 등록합니다.

- iOS: `net.wondly.lottoinsight`
- Android: `net.wondly.lottoinsight`
- Web: 실제 Firebase Web App

Android 앱에는 EAS 개발·운영 인증서의 SHA-1과 SHA-256을 모두 등록합니다. Web의 Authorized domains에는 로컬 개발 주소와 `lotto.wondly.net`을 등록합니다.

## 2. Apple Developer

1. App ID `net.wondly.lottoinsight`에서 Sign in with Apple을 활성화합니다.
2. Android·Web용 Services ID를 만듭니다.
3. Firebase가 안내하는 handler URL을 Services ID Return URL로 등록합니다.
4. Sign in with Apple 키를 만들고 Team ID, Key ID, `.p8`를 Firebase Apple provider에 등록합니다.
5. Firebase 발신 주소를 Apple Private Email Relay에 등록합니다.

Android Apple 로그인용 `EXPO_PUBLIC_APPLE_ANDROID_REDIRECT_URI`는 Services ID와 Firebase 양쪽에 등록된 HTTPS redirect URI여야 합니다.

## 3. 로컬·EAS 환경변수

`.env.example`을 `.env.local`로 복사한 뒤 Firebase Web App config와 OAuth Client ID를 채웁니다. Firebase Web config는 공개 식별자지만 Apple `.p8`, Firebase Admin credential은 절대 Expo 환경변수에 넣지 않습니다.

Google iOS URL scheme은 iOS Client ID를 뒤집은 값입니다.

```text
iOS Client ID: 12345-abc.apps.googleusercontent.com
URL scheme:    com.googleusercontent.apps.12345-abc
```

EAS의 development/preview/production 환경에도 같은 이름으로 플랫폼별 값을 등록합니다. 값이 들어오면 `app.config.ts`가 Google 네이티브 config plugin을 자동 활성화합니다.

익명 인증을 다시 운영할 때만 다음 값을 사용합니다.

```text
EXPO_PUBLIC_ANONYMOUS_AUTH_ENABLED=true
```

네이티브 로그인은 Expo Go가 아니라 development build에서 확인합니다.

```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

## 4. Firestore와 Functions 배포

Firebase CLI에서 대상 프로젝트를 선택한 뒤 다음을 실행합니다.

```bash
firebase use <project-id>
firebase functions:secrets:set APPLE_NATIVE_CLIENT_ID
firebase functions:secrets:set APPLE_SERVICE_CLIENT_ID
firebase functions:secrets:set APPLE_KEY_ID
firebase functions:secrets:set APPLE_TEAM_ID
firebase functions:secrets:set APPLE_PRIVATE_KEY
firebase functions:secrets:set REVENUECAT_SECRET_API_KEY
npm --prefix functions install
npm --prefix functions run build
firebase deploy --only firestore:rules,functions
```

`APPLE_NATIVE_CLIENT_ID`는 iOS App ID인 `net.wondly.lottoinsight`, `APPLE_SERVICE_CLIENT_ID`는 Android·Web 인증용 Services ID입니다. 함수가 authorization code를 발급한 플랫폼에 맞는 client ID로 Apple 토큰을 철회합니다. `REVENUECAT_SECRET_API_KEY`는 계정 삭제 시 해당 Firebase UID의 RevenueCat 고객 데이터를 함께 정리하는 데 사용하며, 스토어 구독 자체는 별도로 취소해야 합니다.

## 5. 계정 삭제 URL

배포 후 Play Console Data Safety의 계정 삭제 URL에 다음을 등록합니다.

```text
https://lotto.wondly.net/account-deletion
```

앱 설정에서도 같은 삭제를 시작할 수 있습니다. Apple 계정은 재인증 후 토큰 철회를 시도하며, 철회 API 장애가 사용자의 데이터 삭제 권리를 막지는 않습니다.

## 6. 검증

- Expo Go가 아니라 EAS development build에서 iOS·Android를 확인합니다.
- 익명 인증 플래그가 켜진 빌드에서만 첫 실행 시 익명 UID가 생성되고 재실행 후에도 같은 UID인지 확인합니다.
- 익명 상태에서 Apple·Google 연결 후 UID가 유지되는지 확인합니다.
- 이미 존재하는 Apple·Google 계정으로 연결할 때 해당 기존 계정으로 안전하게 전환되는지 확인합니다.
- Apple 이메일 공개/비공개, Google 동일 이메일 자동 연결, private relay 계정의 명시적 연결을 각각 확인합니다.
- Firestore Emulator에서 다른 UID의 `users/{uid}` 하위 접근이 거부되는지 확인합니다.
- 실제 계정 삭제 후 Authentication 사용자, Firestore 문서, 기기별 캐시가 남지 않는지 확인합니다.
