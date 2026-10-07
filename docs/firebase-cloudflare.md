# Firebase + Cloudflare 운영 준비

이 커밋은 이메일/비밀번호, Google, 전화번호 가입·로그인, 가입 신청, 관리자 승인/거절/정지, 회원별 자산 서버 저장을 구현합니다. 기존 Sites 주소는 변경하지 않습니다. 실제 서비스 규칙과 Cloudflare 배포는 운영자가 연결된 계정에서 수행해야 합니다.

## 1. Firebase Authentication

- 프로젝트: `jasan-invest`.
- 이메일/비밀번호, Google, 전화번호 공급자를 활성화합니다.
- Google 지원 이메일을 지정합니다.
- Cloudflare의 최종 도메인을 승인된 도메인에 추가합니다. 프로토콜과 경로는 제외합니다.
- 전화번호는 대한민국 SMS 지역 정책을 허용하고 Blaze 결제를 설정합니다. 개발 중에는 Firebase의 테스트 전화번호를 사용합니다.
- 비밀번호 정책을 서버에서도 최소 12자리 등으로 설정합니다. 이메일 열거 방지 기능도 활성화합니다.
- 이메일 가입은 이메일 인증 후 가입 정보를 작성합니다. Google/전화번호는 인증 완료 후 이름과 개인정보 동의 항목을 작성합니다.

## 2. 관리자 TOTP 2단계 인증

최초 관리자 UID는 `Y56JWvSynpfT0H2WNJ2agxwpzdE3`입니다. 이메일 문자열로 권한을 부여하지 않습니다. 이 UID는 웹 설정과 보안 규칙에 모두 선언되어 있습니다. 변경 시 양쪽을 함께 수정하고 규칙을 다시 배포합니다. 일반 회원이 관리자 권한을 추가할 수 없습니다.

Firebase Authentication을 Identity Platform으로 업그레이드하고 TOTP 제공자를 활성화해야 합니다. 공식 절차: https://firebase.google.com/docs/auth/web/totp-mfa

최초 관리자 로그인 → 이메일 인증 → 인증 앱 연결 → 표시되는 설정 키를 Google Authenticator 등에 등록 → 6자리 코드 확인 → 로그아웃 후 다시 로그인 → 2단계 인증 → 가입 정보 작성 순서입니다. 최초 관리자는 별도 다른 관리자 승인 없이 접근할 수 있습니다. 규칙은 관리자 작업에 TOTP 인증 토큰을 요구합니다. 관리자 계정을 분실하면 Firebase 운영 권한으로 복구해야 합니다.

## 3. Firestore 보안 규칙 게시

`firebase/firestore.rules` 파일 전체를 Firebase 콘솔 → Firestore → 규칙에 붙여 넣고 게시합니다. 또는 로컬에서 인증한 뒤:

```bash
npx firebase login
npx firebase deploy --only firestore:rules --project jasan-invest
```

- `members/{uid}`: 이름, 인증된 이메일/전화번호, 상태, 동의 버전, 시각.
- `portfolios/{uid}`: 회원별 자산 자료. 승인 회원만 본인 UID로 조회·쓰기.
- `audit/{id}`: 관리자 회원 상태 변경 기록. 상태 변경과 같은 배치에서 생성되며 앱에서 수정/삭제할 수 없습니다.
- 회원은 자신의 상태를 승인하거나 관리자 필드를 추가할 수 없습니다.
- 관리자도 다른 회원의 자산을 조회할 수 없습니다. Firebase 콘솔·서버 관리자 권한은 별개이며 서비스 운영자가 통제해야 합니다.

## 4. Cloudflare Pages

Cloudflare → Workers & Pages → Pages 프로젝트 생성 → GitHub `crucify87/jasan-invest` 연결:

| 항목 | 값 |
|---|---|
| Production branch | `main` |
| Framework preset | None |
| Root directory | 저장소 루트 |
| Build command | `python scripts/build.py` |
| Build output directory | `dist` |

빌드 결과에는 웹 공개 파일만 들어갑니다. Firebase 규칙, 테스트, 서버 비밀키는 포함하지 않습니다. `_headers`는 CSP, 콘텐츠 유형 보호, 민감 화면 캐시 방지 등을 설정합니다. SDK는 고정 버전 Firebase CDN에서 로드됩니다. 별도 Analytics 추적은 추가하지 않았습니다.

기본 Pages 주소는 실제 배포 결과를 확인하고 Firebase 승인 도메인에 추가합니다. 배포 전후 실제 이메일·Google·테스트 전화번호 로그인, 승인 대기, 관리자 승인, 정지, 백업 복원을 확인합니다. 현재 GitHub 저장소에 Cloudflare가 연결되어 있다면 main 푸시가 배포를 시작할 수 있습니다.

## 5. App Check

Firebase App Check에서 웹앱을 reCAPTCHA Enterprise 제공자로 등록하고 Cloudflare 도메인을 허용합니다. 사이트 키를 `apps/web/scripts/firebase-config.js`의 `APP_CHECK_SITE_KEY`에 입력한 뒤 다시 배포합니다. 키는 웹 공개 식별자입니다. 지표를 확인한 후 Firestore 및 지원되는 Authentication API의 enforcement를 켭니다. 코드만으로 콘솔 enforcement가 자동 활성화되지는 않습니다. 현재 사이트 키는 비어 있으며 App Check 보호는 아직 활성화되지 않았습니다.

## 6. 일반 공개 전 필수 운영 준비

- `apps/web/privacy.html`은 초안입니다. 운영자 이름/연락처, 보유 기간, 탈퇴·삭제 절차, 실제 국외 처리 고지 및 이용약관을 확정합니다. 현재 앱에는 셀프 회원 탈퇴와 계정 삭제 자동화가 없습니다. 공개 전 운영 정책과 삭제 절차를 준비합니다.
- Firebase MFA/TOTP, 규칙, App Check, SMS 지역 제한 및 비용 알림을 확인합니다. 비용 알림은 사용량을 자동 차단하는 한도가 아닙니다.
- 계정 복구·백업 정책과 운영 권한 최소화를 준비합니다.
- 기존 브라우저 데이터는 자동 업로드하지 않습니다. 기존 앱에서 JSON 백업 후 새 앱의 자료 메뉴에서 복원합니다.
- 신규 회원은 빈 자산으로 시작합니다. 샘플 자산이나 이전 사용자의 자산을 공유하지 않습니다.
- 브라우저 세션 저장, 30분 입력 비활동 로그아웃을 사용합니다. 이는 클라이언트 세션 보호이며 서버 토큰의 별도 만료 정책을 바꾸지 않습니다.
- 자산은 한 문서에 저장하며 Firestore 문서 크기 제한이 있습니다. 동시에 편집하면 마지막 저장이 반영됩니다. 대규모/동시 편집용 거래별 원장 구조는 별도 확장이 필요합니다.
- 관리자 회원 목록과 처리 이력은 최신 100개 단위로 표시합니다. 회원 목록은 다음 페이지로 이동할 수 있습니다. 처리 이력은 최신 100개입니다.

## 검사

```bash
npm ci
npm run check
npm run test:rules
npm run build
```

규칙 테스트는 `demo-jasan-invest` 에뮬레이터만 사용하고 실제 Firebase 데이터를 변경하지 않습니다. 테스트 범위: 익명/미인증 차단, 회원 간 자산 격리, 승인 대기/정지 차단, 자기 승인 금지, 승인과 감사 기록의 원자성, 기록 삭제 금지, 관리자 TOTP 검사.

공식 안내:
- https://firebase.google.com/docs/web/setup
- https://firebase.google.com/docs/auth/web/phone-auth
- https://firebase.google.com/docs/firestore/security/rules-conditions
- https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider
- https://developers.cloudflare.com/pages/framework-guides/deploy-anything/

## 현재 배포 대상: Cloudflare Workers

주소: https://jasan-invest.crucify87.workers.dev/

이 주소는 Pages가 아닌 Workers입니다. 저장소 루트의 `wrangler.jsonc`는 `jasan-invest` Worker에 `dist`의 정적 파일만 배포하도록 설정합니다. 기존 위의 Pages 설정은 Pages를 선택할 때만 사용합니다.

Cloudflare Workers의 GitHub 빌드 연동 설정:

- 저장소: `crucify87/jasan-invest`, 브랜치: `main`, 루트: 저장소 루트.
- 빌드 명령: `python scripts/build.py`.
- 배포 명령: `npx wrangler@4 deploy`.
- Wrangler 자체 배포도 `build.command`로 같은 공개 파일 빌드를 수행합니다.
- Firebase Authentication 승인 도메인과 reCAPTCHA Enterprise 허용 도메인에 `jasan-invest.crucify87.workers.dev`를 추가합니다.
- App Check 콘솔에 사이트 키를 등록해도 저장소의 `APP_CHECK_SITE_KEY`는 자동으로 채워지지 않습니다. 해당 웹 설정에 동일한 공개 사이트 키를 입력하고 배포해야 합니다.
- 사이트 키가 비어 있는 동안에는 App Check가 초기화되지 않습니다. 적용(enforcement) 활성화 여부는 Firebase 콘솔에서 별도로 확인합니다.

Workers에 연결된 계정과 Firebase 콘솔의 설정 권한은 웹 설정 코드에 포함되지 않습니다. 커밋 자체가 실제 배포나 인증 성공을 증명하지는 않습니다.
