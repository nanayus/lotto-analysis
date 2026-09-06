# OTA 배포 안전 규칙

## 현재 배포 단계

현재 앱은 출시 전 테스트 단계다. 별도의 출시 전환 결정이 기록되기 전까지
모든 OTA는 `testflight` 채널과 EAS `preview` 환경으로만 배포한다.
`production` 채널은 현재 배포 대상으로 사용하지 않는다.

## 한 줄 원칙

현재 단계에서 `OTA 올려줘`, `test로 배포해` 요청은 TestFlight 테스트
업데이트로 처리한다. Production 배포는 사용자가 출시 전환과 Production
배포를 명시적으로 함께 요청한 경우에만 별도 승인 절차를 시작한다.

## TestFlight 테스트 업데이트

TestFlight 설치자에게만 전달된다.

```bash
yarn ota:testflight --message "변경 내용"
```

이 명령은 항상 다음 대상으로 고정된다.

- 채널: `testflight`
- EAS 환경: `preview`
- 플랫폼: iOS와 Android

## 실제 사용자 Production 업데이트

로컬 컴퓨터에서는 Production OTA를 실행할 수 없다. GitHub의
`Production OTA` workflow에서만 실행한다.

배포 전 확인 항목:

1. 변경사항과 릴리스 노트가 모두 커밋되어 있다.
2. 배포할 커밋이 `main`에 있다.
3. TestFlight에서 같은 변경사항을 확인했다.
4. workflow 입력창에 `PRODUCTION`을 정확히 입력한다.
5. GitHub의 `production` environment 승인 화면에서 최종 승인한다.

workflow는 테스트와 타입 검사를 통과한 커밋만 다음 대상으로 보낸다.

- 채널: `production`
- EAS 환경: `production`
- 플랫폼: iOS와 Android

## GitHub에서 한 번만 설정할 것

저장소의 **Settings → Environments → New environment**에서 이름이 정확히
`production`인 environment를 만든다. 가능하면 Required reviewers를 켜서
배포 버튼과 실제 배포 사이에 사람 승인을 한 번 더 둔다.

같은 environment의 secret에 Production OTA 권한이 있는 `EXPO_TOKEN`을
등록한다. 이 토큰은 로컬 `.env`나 저장소 파일에 넣지 않는다.
