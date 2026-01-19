# RefBook

NotebookLM 스타일의 URL 기반 RAG 챗봇 서비스입니다. URL을 추가하면 해당 페이지의 내용을 기반으로 질문에 답변합니다.

## 주요 기능

- **프로젝트 기반 관리** - 여러 프로젝트를 생성하고 각각 독립적으로 리소스 관리
- **URL 기반 RAG** - URL을 추가하면 자동으로 웹페이지 스크래핑 및 벡터 인덱싱
- **LLM 챗봇** - 추가된 리소스 내용만을 기반으로 답변
- **리소스 새로고침** - 원본 페이지 변경 시 RAG 재인덱싱
- **공유 기능** - 프로젝트를 공개 링크로 공유 (읽기 전용)
- **출처 표시** - 답변에 사용된 소스와 관련도 표시

---

## 기술 스택

### Backend
| 기술 | 용도 |
|------|------|
| FastAPI | 고성능 Python 웹 프레임워크 |
| PostgreSQL | 프로덕션 데이터베이스 |
| SQLAlchemy | ORM |
| LangChain | LLM 애플리케이션 프레임워크 |
| ChromaDB | 벡터 데이터베이스 |
| sentence-transformers | 로컬 임베딩 모델 |
| OpenAI GPT | LLM |
| BeautifulSoup | 웹 스크래핑 |

### Frontend
| 기술 | 용도 |
|------|------|
| React 18 | UI 라이브러리 |
| TypeScript | 타입 안전성 |
| Vite | 빌드 도구 |
| TailwindCSS | CSS 프레임워크 |
| React Router | 라우팅 |
| Lucide React | 아이콘 |

### Infrastructure
| 기술 | 용도 |
|------|------|
| Docker | 컨테이너화 |
| Docker Compose | 멀티 컨테이너 오케스트레이션 |
| PostgreSQL | 데이터 영속화 |

---

## 빠른 시작 (Docker)

### 1. 사전 요구사항

- Docker & Docker Compose
- OpenAI API Key

### 2. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 편집하여 OpenAI API 키 입력:

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. 실행

```bash
docker-compose up --build
```

### 4. 접속

| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:6061 |
| API 문서 (Swagger) | http://localhost:6061/docs |

---

## 로컬 개발 환경

### Backend

```bash
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일에 OPENAI_API_KEY 입력

# 서버 실행 (SQLite 자동 사용)
python -m app.main
```

### Frontend

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

> **참고**: 로컬 개발 시 `frontend/vite.config.ts`에서 API 프록시 타겟을 `http://localhost:6061`로 설정하세요.

---

## 사용 방법

### Step 1: 프로젝트 생성

1. http://localhost:3000 접속
2. 사이드바의 프로젝트 선택기 클릭
3. "New Project" 클릭 후 이름 입력
4. Enter 또는 체크 버튼으로 생성

### Step 2: 리소스 추가

1. URL 입력창에 웹페이지 주소 입력
2. **+** 버튼 클릭
3. "Processing..." → "Ready" 상태가 되면 완료
4. Toast 알림으로 진행 상태 확인

### Step 3: 채팅

1. 우측 채팅창에 질문 입력
2. AI가 추가된 리소스 내용을 기반으로 답변
3. 답변 하단에 참조 소스와 관련도(%) 표시
4. 소스 카드 클릭 시 상세 내용 확인

### Step 4: 리소스 관리

- **선택 필터링**: 리소스 클릭하여 특정 리소스만 대상으로 질문
- **새로고침**: ↻ 버튼으로 RAG 재인덱싱
- **삭제**: 🗑 버튼으로 리소스 삭제

### Step 5: 공유

1. 사이드바 헤더의 공유 버튼 클릭
2. 공유 이름 입력 (선택사항)
3. "Create Share Link" 클릭
4. 생성된 URL 복사하여 공유

**공유 페이지 특징**:
- 사이드바 없음 (채팅만 가능)
- 리소스 추가/수정/삭제 불가
- 공유된 프로젝트의 리소스만 접근 가능

---

## 프로젝트 구조

```
refbook/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI 앱 & 라우터
│   │   ├── config.py         # 환경 설정
│   │   ├── database.py       # SQLAlchemy 모델 & DB 연결
│   │   ├── models.py         # Pydantic 모델
│   │   ├── rag_service.py    # RAG 핵심 로직
│   │   └── scraper.py        # 웹 스크래핑
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx       # 채팅 UI
│   │   │   ├── ResourcePanel.tsx   # 리소스 관리 UI
│   │   │   ├── ProjectSelector.tsx # 프로젝트 선택기
│   │   │   ├── ShareModal.tsx      # 공유 모달
│   │   │   └── Toast.tsx           # 토스트 알림
│   │   ├── pages/
│   │   │   └── SharedChat.tsx      # 공유 페이지
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## API 엔드포인트

### 프로젝트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/projects` | 프로젝트 생성 |
| GET | `/api/projects` | 프로젝트 목록 (통계 포함) |
| GET | `/api/projects/{id}` | 프로젝트 상세 |
| PUT | `/api/projects/{id}` | 프로젝트 수정 |
| DELETE | `/api/projects/{id}` | 프로젝트 삭제 |

### 리소스

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/projects/{id}/resources` | 리소스 추가 |
| GET | `/api/projects/{id}/resources` | 리소스 목록 |
| DELETE | `/api/projects/{id}/resources/{rid}` | 리소스 삭제 |
| POST | `/api/projects/{id}/resources/{rid}/refresh` | 리소스 새로고침 |

### 채팅

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/projects/{id}/chat` | 프로젝트 내 채팅 |
| POST | `/api/share/{shareId}/chat` | 공유 링크로 채팅 |

### 공유

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/projects/{id}/share` | 공유 링크 생성 |
| GET | `/api/projects/{id}/share` | 공유 목록 |
| GET | `/api/share/{shareId}` | 공유 정보 (공개) |
| DELETE | `/api/share/{shareId}` | 공유 삭제 |

---

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `OPENAI_API_KEY` | OpenAI API 키 | (필수) |
| `DATABASE_URL` | 데이터베이스 URL | `sqlite:///./refbook.db` |
| `CHROMA_PERSIST_DIRECTORY` | ChromaDB 저장 경로 | `./chroma_db` |
| `EMBEDDING_MODEL` | 임베딩 모델 | `all-MiniLM-L6-v2` |
| `LLM_MODEL` | LLM 모델 | `gpt-4o-mini` |
| `HOST` | 서버 호스트 | `0.0.0.0` |
| `PORT` | 서버 포트 | `6061` |

---

## 배포

### Docker Compose (권장)

#### 개발/스테이징 환경

```bash
# 환경 변수 설정
cp .env.example .env
# .env 파일에 OPENAI_API_KEY 설정

# 빌드 및 실행
docker-compose up --build -d

# 로그 확인
docker-compose logs -f

# 종료
docker-compose down
```

#### 프로덕션 환경

1. **환경 변수 설정**

```bash
# .env 파일 또는 환경 변수로 설정
OPENAI_API_KEY=sk-your-production-key
```

2. **docker-compose.prod.yml 생성** (선택사항)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-refbook}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB:-refbook}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=postgresql://${POSTGRES_USER:-refbook}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-refbook}
      - CHROMA_PERSIST_DIRECTORY=/app/chroma_db
    volumes:
      - chroma_data:/app/chroma_db
    depends_on:
      postgres:
        condition: service_healthy
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod  # 프로덕션용 Dockerfile
    depends_on:
      - backend
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - frontend
      - backend
    restart: always

volumes:
  postgres_data:
  chroma_data:
```

3. **실행**

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

### 클라우드 배포

#### AWS ECS / Fargate

1. ECR에 이미지 푸시
2. ECS 태스크 정의 생성
3. RDS PostgreSQL 인스턴스 생성
4. EFS로 ChromaDB 볼륨 마운트
5. ALB로 로드밸런싱

#### Google Cloud Run

1. Artifact Registry에 이미지 푸시
2. Cloud SQL (PostgreSQL) 인스턴스 생성
3. Cloud Run 서비스 배포
4. Cloud Storage로 ChromaDB 볼륨 마운트

#### Railway / Render / Fly.io

```bash
# Railway 예시
railway login
railway init
railway add postgresql
railway up
```

### 데이터베이스 관리

#### 백업

```bash
# PostgreSQL 백업
docker-compose exec postgres pg_dump -U refbook refbook > backup.sql

# ChromaDB 백업 (볼륨 복사)
docker cp refbook-backend:/app/chroma_db ./chroma_backup
```

#### 복원

```bash
# PostgreSQL 복원
cat backup.sql | docker-compose exec -T postgres psql -U refbook refbook

# ChromaDB 복원
docker cp ./chroma_backup refbook-backend:/app/chroma_db
```

---

## 트러블슈팅

### Docker 관련

**포트 충돌**
```bash
# 사용 중인 포트 확인
lsof -i :3000
lsof -i :6061
lsof -i :5432
```

**컨테이너 재빌드**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

**데이터 초기화**
```bash
docker-compose down -v  # 볼륨 포함 삭제
docker-compose up --build
```

### API 관련

**OPENAI_API_KEY 오류**
- `.env` 파일에 API 키 확인
- `sk-`로 시작하는지 확인
- OpenAI 계정 크레딧 확인

**웹페이지 스크래핑 실패**
- 일부 사이트는 봇 차단으로 실패 가능
- JavaScript 렌더링 필요 사이트는 제한적

### 데이터베이스 관련

**PostgreSQL 연결 실패**
```bash
# 컨테이너 상태 확인
docker-compose ps

# PostgreSQL 로그 확인
docker-compose logs postgres
```

---

## 라이선스

MIT License
