# 자산과투자사이 (jasan-invest)

모바일·PC 개인 자산 및 투자 관리 앱입니다. 앱 화면 이름은 ‘자산노트’입니다.

## 프로젝트 구조

| 경로 | 역할 |
| --- | --- |
| `apps/web/` | 모바일·PC 웹앱 프로젝트 |
| `apps/web/index.html` | 화면 구조와 진입점 |
| `apps/web/styles/main.css` | 디자인과 반응형 레이아웃 |
| `apps/web/scripts/app.js` | 데이터, 계산, 화면, 입력·파일 처리 |
| `docs/` | 기능·데이터·작업 안내 |
| `scripts/` | 개발 및 검증 도구 |
| `index.html` | 루트 접속 시 웹앱으로 이동 |

현재 실제 구현 프로젝트는 웹앱 하나이며, 모바일도 같은 반응형 웹앱을 사용합니다.

## 실행

```bash
git clone https://github.com/crucify87/jasan-invest.git
cd jasan-invest
python scripts/serve.py
```

http://localhost:8000 에서 사용하세요. 별도 패키지 설치와 빌드는 없습니다.

## 확인

```bash
node --check apps/web/scripts/app.js
python scripts/check.py
```

자세한 기능과 제약은 [앱 안내](docs/app-guide.md), 수정할 파일과 작업 절차는 [개발 안내](docs/development.md)를 참고하세요.
