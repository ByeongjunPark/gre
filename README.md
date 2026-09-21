# GRE Verbal Mock Practice Tests with Deep Explanations & Error Analysis

GRE Verbal 실전 모의고사 및 **문항별 심층 논리 해설 & 오답노트 시스템**을 제공하는 오픈소스 정적 웹 애플리케이션입니다.

## ✨ 주요 기능

1. **실제 ETS 컴퓨터 시험(PowerPrep) 동일 UI 환경**
   - 상단 공식 헤더: `GRE® Verbal Reasoning`, `Section X of 2`, `Question X of Y`, `Time Remaining`
   - **`[Hide Time / Show Time]`**: 타이머 표시 숨기기/보기 지원
   - **`[Review]`**: 섹션 내 전체 문항의 `Answered` / `Not Answered` 상태 및 마킹 여부 검토 및 즉각 점프
   - **`[Mark]`**: 나중에 다시 볼 문항 플래그 마킹
   - **Reading Comprehension 2열 화면**: 좌측 지문 스크롤 및 우측 문항/선택지 표준 레이아웃
   - Section 1 (12문항 / 18분) + Section 2 (15문항 / 23분) = 총 27문항 (41분) 공식 Verbal 규격

2. **문항별 심층 논리 해설 & 오답 분석 시스템**
   - **🎯 내가 선택한 답안이 틀린 이유 (Targeted Mistake Analysis)**: 수험자가 선택한 오답 보기가 왜 틀렸는지, 어떤 매력적인 함정(Distractor Trap)에 빠졌는지를 문항별로 집중 분석
   - **🪜 3단계 정답 도출 논리 과정 (Step-by-Step Logic)**: 지문 내 핵심 단서(Clue)와 시그널 워드를 바탕으로 정답을 유추하는 3단계 논리적 사고 과정 해설
   - **🔍 선택지별 전 문항 상세 분석**: A부터 E(또는 F)까지 모든 보기에 대한 정오답 이유 개별 서술
   - **📖 핵심 GRE 어휘 & 지문 번역**: 고난도 GRE 어휘 풀이 및 지문 한국어 해석 제공
   - **📝 스마트 오답노트 필터**: [전체 문항], [오답노트만 보기], [맞힌 문항], [유형별 필터] 원클릭 필터링
   - **👁️ 2가지 복습 모드**:
     - *표 & 아코디언 뷰*: 전체 목록에서 원하는 문항의 풀이를 바로 펼쳐보는 빠른 뷰
     - *1문항 집중 복습 뷰어*: 좌측 문항 네비게이터와 우측 집중 해설 패널을 통한 심층 오답 정리
   - **🖨️ 결과 및 오답노트 인쇄 / PDF 저장 지원**

3. **모의고사 회차 구성 (총 22개 회차)**
   - 전 회차(**17회 ~ 39회**, 총 22개)의 27문항 전부에 문항 내용 기반의 한글 심층 해설 탑재

---

## 🚀 로컬 실행 방법

프로젝트 루트에서 아래 명령을 실행한 뒤 브라우저에서 `http://localhost:8000/`을 엽니다.

```sh
# Python 사용 시
python -m http.server 8000

# Node.js 사용 시
npx serve .
```

---

## ☁️ 서버 저장 (Vercel, 선택 사항)

응시 기록과 **문항별 답안**을 Vercel 서버리스 API에 저장해 기기 간에 이어 보고, 지난 응시를 해설과 함께 다시 열람할 수 있습니다.
서버 없이도 기존처럼 브라우저 localStorage만으로 동작합니다. 혼자 쓰는 용도로 설계되어 로그인 대신 **액세스 토큰 하나**로 보호합니다.

### 구성

| 경로 | 설명 |
| --- | --- |
| `api/attempts/index.js` | `GET` 목록, `POST` 저장(단건/일괄, 같은 id면 덮어쓰기), `DELETE ?confirm=all` 전체 삭제 |
| `api/attempts/[id].js` | `GET` 상세(답안 포함), `DELETE` 삭제 |
| `js/gre_sync.js` | 동기화 클라이언트, 지난 응시 열람(`?review=<id>`) |

저장소는 Upstash Redis입니다. 모든 요청에 `Authorization: Bearer <ACCESS_TOKEN>`이 필요하며, 서버에 `ACCESS_TOKEN`이 설정되어 있지 않으면 모든 요청을 거부합니다.

### 배포 순서

1. 이 저장소를 Vercel에 Import 합니다. (빌드 설정 없이 Framework Preset은 **Other**)
2. Vercel 프로젝트의 **Storage / Marketplace**에서 **Upstash Redis**를 만들어 프로젝트에 연결합니다. (`KV_REST_API_URL`, `KV_REST_API_TOKEN` 등이 자동으로 주입됩니다.)
3. **Settings → Environment Variables**에 추가합니다.
   - `ACCESS_TOKEN`: 길고 추측하기 어려운 임의 문자열 (예: `openssl rand -hex 32`로 생성)
   - `ALLOWED_ORIGIN`: 사이트를 GitHub Pages 등 **다른 도메인**에서 열 때만 필요합니다. 예: `https://byeongjunpark.github.io`
4. 재배포한 뒤 사이트의 📊 나의 성적 리포트 → **☁️ 서버 저장 설정**에서 토큰을 입력하고 **저장 후 연결 테스트**를 누릅니다.
   - Vercel 주소로 사이트를 연다면 API 주소는 비워 둡니다. GitHub Pages에서 연다면 `https://<프로젝트>.vercel.app`를 입력합니다.
5. 이미 이 브라우저에 쌓인 기록은 **이 기기 기록 서버로 업로드**로 올릴 수 있습니다. (답안이 저장되지 않던 예전 기록은 점수만 올라가며 해설 열람은 불가합니다.)

### 동작 방식

- 시험을 끝내면 기록과 답안이 로컬에 저장되고, 서버가 연결되어 있으면 함께 업로드됩니다. 업로드에 실패하면 대기열에 남았다가 다음 접속 때 다시 시도합니다.
- 성적 리포트를 열 때마다 서버 기록과 병합합니다. 각 기록의 **해설 보기**를 누르면 `Verbal_Mock_XX.html?review=<id>`로 그 시점의 답안 기준 채점 결과와 해설이 열립니다. (새 기록은 만들어지지 않습니다.)
- 토큰은 이 브라우저의 localStorage에 저장됩니다. 공용 PC에서는 사용 후 **연결 해제**를 누르세요.

### 로컬 테스트

Redis 없이도 `ACCESS_TOKEN`만 지정하면 개발용 메모리 저장소로 API를 시험할 수 있습니다. `VERCEL`이나 `NODE_ENV=production` 환경에서는 Redis가 없으면 오류를 내므로 데이터가 조용히 사라지는 일은 없습니다.
