# 자산과투자사이 · jasan-invest

모바일·PC 개인 자산 및 투자 관리 앱. Firebase 회원 인증, 관리자 가입 승인, 회원별 Firestore 저장을 사용합니다. Cloudflare Pages 배포용 정적 웹앱입니다.

## 폴더

- `apps/web/`: 웹앱, 로그인, 관리자 화면, 스타일, 이미지
- `firebase/firestore.rules`: 회원별 접근 및 관리자 보안 규칙
- `tests/`: Firestore 보안 규칙 에뮬레이터 테스트
- `scripts/`: 로컬 실행, 검사, Cloudflare 빌드
- `docs/`: 개발 및 운영 안내

```bash
npm ci
npm run check
npm run test:rules
npm run build
python scripts/serve.py
```

**실제 사용 전 [Firebase·Cloudflare 설정 안내](docs/firebase-cloudflare.md)를 완료하세요.** 보안 규칙 게시, 인증 공급자, 관리자 TOTP, App Check 및 공개 전 개인정보 안내 확정이 필요합니다. Firebase 웹 설정만으로 이러한 설정이 배포되지는 않습니다.

Cloudflare Pages: build command `python scripts/build.py`, output `dist`, production branch `main`.

현재 기능: 계좌·자산·투자·거래·배당·이자·부채·목표·현금흐름·일정 관리, CSV 가져오기·내보내기, JSON 백업·복원. 거래 입력이 보유 수량·현금 잔액을 자동 변경하지 않으며 시세·환율은 수동입니다.

이전 브라우저 데이터는 자동 이전하지 않습니다. 이전 앱의 JSON 백업을 새 앱에서 복원하세요.
