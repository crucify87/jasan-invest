# 개발 안내

## 어디를 수정하나요?

| 작업 | 파일 |
| --- | --- |
| 화면 뼈대·문구·입력 팝업 구조 | `apps/web/index.html` |
| 색상·글꼴·카드·PC/모바일 배치 | `apps/web/styles/main.css` |
| 메뉴별 화면·계산·입력·CSV·백업 | `apps/web/scripts/app.js` |
| 기능 설명·주의사항 | `docs/app-guide.md` |
| 실행·폴더 구조 안내 | `README.md` |

`app.js`는 기존 실행 동작을 유지하기 위해 하나의 파일로 유지했습니다. 화면 생성은 `render`, 입력 항목은 `schemas`, 합계는 `totals`, 파일 처리는 `bindFiles`에서 수정합니다.

## 작업 순서

1. 저장소 루트에서 `python scripts/serve.py`를 실행합니다.
2. 파일을 수정하고 브라우저를 새로고침합니다.
3. `node --check apps/web/scripts/app.js`와 `python scripts/check.py`로 확인합니다.
4. PC와 모바일 너비에서 화면과 입력 기능을 확인합니다.
5. 변경한 파일을 커밋합니다.

## 데이터

앱 데이터는 기존과 같은 localStorage 키 `asset-note-v1`을 사용합니다. 폴더 경로가 바뀌어도 같은 출처(프로토콜·호스트·포트)라면 기록을 유지합니다. 다른 도메인·포트에서는 별도의 저장 공간을 사용합니다.

실제 자산 데이터, 백업 파일, 인증정보는 공개 저장소에 추가하지 마세요. GitHub 저장소 변경은 기존 Sites 배포에 자동 반영되지 않습니다.
