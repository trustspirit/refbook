# RefBook

NotebookLM 스타일의 URL 기반 RAG 챗봇 서비스입니다. URL을 추가하면 해당 페이지의 내용을 기반으로 질문에 답변합니다.

## 주요 기능

- URL을 통한 리소스 추가 및 자동 RAG 인덱싱
- 추가된 리소스 기반 LLM 챗봇
- 리소스 새로고침을 통한 RAG 업데이트
- 특정 리소스만 선택하여 질문 가능
- 답변에 사용된 소스 표시

---

## 초기 세팅

### 1. 사전 요구사항

#### Docker 설치 (권장)
- **macOS**: [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/) 설치
- **Windows**: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/) 설치
- **Linux**: 
  ```bash
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  ```

#### OpenAI API Key 발급
1. [OpenAI Platform](https://platform.openai.com/) 접속
2. 로그인 후 우측 상단 프로필 → "View API keys" 클릭
3. "Create new secret key" 버튼 클릭
4. 생성된 키를 안전한 곳에 복사 (한 번만 표시됨)

### 2. 프로젝트 설정

```bash
# 프로젝트 디렉토리로 이동
cd refbook

# 환경 변수 파일 생성
cp .env.example .env
```

### 3. 환경 변수 설정

`.env` 파일을 편집기로 열어 OpenAI API 키를 입력합니다:

```bash
# .env 파일 내용
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> **주의**: `.env` 파일은 절대 Git에 커밋하지 마세요. (`.gitignore`에 이미 포함되어 있음)

---

## 실행 방법

### 방법 1: Docker Compose (권장)

```bash
# 빌드 및 실행 (첫 실행 시)
docker-compose up --build

# 이후 실행
docker-compose up

# 백그라운드 실행
docker-compose up -d

# 종료
docker-compose down

# 로그 확인
docker-compose logs -f
```

**첫 실행 시 약 3-5분 정도 소요됩니다** (임베딩 모델 다운로드 포함)

### 방법 2: 로컬 개발 환경

#### Backend 실행

```bash
# 1. backend 디렉토리로 이동
cd backend

# 2. Python 가상환경 생성 및 활성화
python -m venv venv

# macOS/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 환경 변수 설정
cp .env.example .env
# .env 파일에 OPENAI_API_KEY 입력

# 5. 서버 실행
python -m app.main
```

Backend가 http://localhost:8000 에서 실행됩니다.

#### Frontend 실행

```bash
# 새 터미널에서 실행

# 1. frontend 디렉토리로 이동
cd frontend

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행
npm run dev
```

Frontend가 http://localhost:3000 에서 실행됩니다.

> **참고**: 로컬 개발 시 Frontend의 API 프록시 설정을 수정해야 할 수 있습니다.
> `frontend/vite.config.ts`에서 `target: 'http://localhost:8000'`으로 변경

---

## 접속 URL

| 서비스 | URL | 설명 |
|--------|-----|------|
| Frontend | http://localhost:3000 | 메인 웹 UI |
| Backend API | http://localhost:8000 | REST API |
| API 문서 (Swagger) | http://localhost:8000/docs | API 테스트 가능 |
| API 문서 (ReDoc) | http://localhost:8000/redoc | API 문서 조회 |

---

## 사용법

### Step 1: 리소스 추가

1. 웹 브라우저에서 http://localhost:3000 접속
2. 좌측 사이드바의 URL 입력창에 웹페이지 주소 입력
   - 예: `https://docs.python.org/3/tutorial/index.html`
3. **+** 버튼 클릭 또는 Enter 키
4. 리소스가 "Processing..." 상태로 추가됨
5. 처리 완료 시 "Ready" 상태로 변경 (청크 수 표시)

### Step 2: 채팅하기

1. 리소스가 "Ready" 상태가 되면 우측 채팅창 활성화
2. 하단 입력창에 질문 입력
   - 예: "Python의 리스트와 튜플의 차이점은?"
3. Enter 키 또는 전송 버튼 클릭
4. AI가 추가된 리소스 내용을 기반으로 답변
5. 답변 하단에 참조한 소스 표시

### Step 3: 리소스 관리

#### 특정 리소스만 선택하여 질문
- 사이드바에서 원하는 리소스 클릭 (파란색 테두리로 선택 표시)
- 선택된 리소스의 내용만을 기반으로 답변
- 선택 해제하면 모든 리소스 대상으로 답변

#### 리소스 새로고침 (RAG 업데이트)
- 원본 웹페이지 내용이 변경되었을 때 사용
- 리소스 우측의 **새로고침 버튼(↻)** 클릭
- 페이지를 다시 스크래핑하고 RAG 인덱스 갱신

#### 리소스 삭제
- 리소스 우측의 **휴지통 버튼(🗑)** 클릭
- 해당 리소스와 관련 벡터 데이터 삭제

### Step 4: 대화 관리

- **대화 초기화**: 우측 상단 "Clear" 버튼 클릭
- **줄바꿈**: Shift + Enter
- **메시지 전송**: Enter

---

## API 사용법

### 리소스 추가
```bash
curl -X POST http://localhost:8000/api/resources \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

### 리소스 목록 조회
```bash
curl http://localhost:8000/api/resources
```

### 리소스 새로고침
```bash
curl -X POST http://localhost:8000/api/resources/{resource_id}/refresh
```

### 채팅
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "이 문서의 주요 내용을 요약해줘",
    "resource_ids": ["resource-uuid-1", "resource-uuid-2"]
  }'
```

---

## 트러블슈팅

### Docker 관련

**문제: 포트가 이미 사용 중**
```bash
# 사용 중인 포트 확인
lsof -i :3000
lsof -i :8000

# docker-compose.yml에서 포트 변경
ports:
  - "3001:3000"  # 외부포트:내부포트
```

**문제: 컨테이너가 시작되지 않음**
```bash
# 로그 확인
docker-compose logs backend
docker-compose logs frontend

# 컨테이너 재빌드
docker-compose down
docker-compose up --build
```

**문제: 볼륨 데이터 초기화 필요**
```bash
docker-compose down -v  # 볼륨 포함 삭제
docker-compose up --build
```

### API 관련

**문제: OPENAI_API_KEY 오류**
- `.env` 파일에 API 키가 올바르게 설정되었는지 확인
- API 키가 `sk-`로 시작하는지 확인
- OpenAI 계정에 크레딧이 있는지 확인

**문제: 웹페이지 스크래핑 실패**
- 일부 사이트는 봇 차단으로 스크래핑이 안 될 수 있음
- JavaScript로 렌더링되는 SPA는 내용 추출이 제한적일 수 있음

### Frontend 관련

**문제: API 연결 실패 (CORS 오류)**
- Backend가 실행 중인지 확인
- Docker 사용 시 네트워크 연결 확인

---

## 설정 옵션

### 환경 변수

| 변수 | 설명 | 기본값 | 필수 |
|------|------|--------|------|
| `OPENAI_API_KEY` | OpenAI API 키 | - | O |
| `LLM_MODEL` | 사용할 LLM 모델 | `gpt-4o-mini` | X |
| `EMBEDDING_MODEL` | 임베딩 모델 | `all-MiniLM-L6-v2` | X |
| `CHROMA_PERSIST_DIRECTORY` | ChromaDB 저장 경로 | `./chroma_db` | X |

### LLM 모델 변경

`docker-compose.yml` 또는 `backend/.env`에서 설정:
```bash
LLM_MODEL=gpt-4o        # 더 높은 성능
LLM_MODEL=gpt-4o-mini   # 기본값 (비용 효율적)
LLM_MODEL=gpt-3.5-turbo # 저비용
```

---

## 기술 스택

### Backend
| 기술 | 용도 |
|------|------|
| FastAPI | 고성능 Python 웹 프레임워크 |
| LangChain | LLM 애플리케이션 프레임워크 |
| ChromaDB | 벡터 데이터베이스 |
| sentence-transformers | 로컬 임베딩 모델 |
| OpenAI GPT | LLM |
| BeautifulSoup | 웹 스크래핑 |

### Frontend
| 기술 | 용도 |
|------|------|
| React 18 | UI 라이브러리 |
| Vite | 빌드 도구 |
| TailwindCSS | CSS 프레임워크 |
| TypeScript | 타입 안전성 |
| Lucide React | 아이콘 |

### Infrastructure
| 기술 | 용도 |
|------|------|
| Docker | 컨테이너화 |
| Docker Compose | 멀티 컨테이너 오케스트레이션 |

---

## 프로젝트 구조

```
refbook/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI 앱 & 라우터
│   │   ├── config.py        # 환경 설정
│   │   ├── models.py        # Pydantic 모델
│   │   ├── rag_service.py   # RAG 핵심 로직
│   │   └── scraper.py       # 웹 스크래핑
│   ├── requirements.txt     # Python 의존성
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx      # 채팅 UI
│   │   │   └── ResourcePanel.tsx  # 리소스 관리 UI
│   │   ├── App.tsx          # 메인 앱 컴포넌트
│   │   ├── api.ts           # API 클라이언트
│   │   ├── types.ts         # TypeScript 타입
│   │   ├── main.tsx         # 엔트리포인트
│   │   └── index.css        # 전역 스타일
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml       # Docker 구성
├── .env.example             # 환경 변수 템플릿
├── .gitignore
└── README.md
```

---

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/health` | 헬스 체크 |
| POST | `/api/resources` | 리소스 추가 |
| GET | `/api/resources` | 리소스 목록 |
| GET | `/api/resources/{id}` | 리소스 상세 |
| DELETE | `/api/resources/{id}` | 리소스 삭제 |
| POST | `/api/resources/{id}/refresh` | 리소스 새로고침 |
| POST | `/api/chat` | 채팅 |

---

## 라이선스

MIT License
