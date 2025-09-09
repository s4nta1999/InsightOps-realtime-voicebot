# 🎙️ InsightOps Realtime Voicebot

> **실시간 음성 상담 서비스** - OpenAI Realtime API를 활용한 하나카드 가상 상담원 시스템

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://hub.docker.com/r/s4nta1207/voicebot-service)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)](https://postgresql.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Realtime-green?logo=openai)](https://openai.com/)

## ✨ 주요 기능

### 🎯 **실시간 음성 상담**
- **음성 인식**: OpenAI Realtime API를 통한 실시간 음성 → 텍스트 변환
- **자연스러운 대화**: GPT-4 기반의 맥락을 이해하는 상담 응답
- **음성 합성**: 텍스트 → 음성 변환으로 자연스러운 음성 응답

### 👥 **다중 에이전트 시스템**
- **가상 상담원** (`virtualChatAgent`): 기본 상담 및 카드 추천
- **전문가 상담원** (`virtualSupervisorAgent`): 복잡한 상담 및 전문 지식 제공
- **자동 핸드오프**: 상담 난이도에 따른 자동 에이전트 전환

### 💾 **데이터 관리**
- **PostgreSQL**: 상담 기록 및 메시지 저장
- **실시간 저장**: 대화 내용 실시간 데이터베이스 저장
- **5,760개 상담 데이터**: 기존 상담 기록 마이그레이션 완료

### 🔄 **대화 컨텍스트**
- **이전 대화 기억**: 상담원이 이전 대화 내용을 기억하고 연관성 있게 응답
- **연속성 유지**: "앞서 말씀하신", "이전에 언급하신" 등의 표현으로 대화 연결

## 🚀 빠른 시작

### 📋 **필수 요구사항**
- Docker & Docker Compose
- OpenAI API Key
- 최소 4GB RAM

### ⚡ **1분 만에 실행하기**

```bash
# 1. 저장소 클론
git clone https://github.com/s4nta1999/InsightOps-realtime-voicebot.git
cd InsightOps-realtime-voicebot

# 2. 환경 변수 설정
cp .env.sample .env.local
# .env.local 파일에서 OPENAI_API_KEY 설정

# 3. Docker로 실행
docker-compose up -d

# 4. 브라우저에서 접속
open http://localhost:3001
```

## 🐳 Docker 실행법

### **방법 1: Docker Compose (권장)**

```bash
# 전체 스택 실행 (앱 + DB + pgAdmin)
docker-compose up -d

# 로그 확인
docker-compose logs -f voicebot-app

# 중지
docker-compose down
```

### **방법 2: Docker Hub 이미지 사용**

```bash
# DockerHub에서 직접 실행
docker run -d \
  -p 3001:3001 \
  -e OPENAI_API_KEY="your-openai-api-key" \
  -e DATABASE_URL="postgresql://voicebot_user:voicebot_password@host.docker.internal:5433/voicebot_db" \
  -e STORAGE_MODE="production" \
  s4nta1207/voicebot-service:latest
```

### **방법 3: 프로덕션 배포**

```bash
# 배포 스크립트 실행
chmod +x deploy.sh
./deploy.sh
```

## ⚙️ 환경 설정

### **환경 변수**

| 변수명 | 설명 | 기본값 | 필수 |
|--------|------|--------|------|
| `OPENAI_API_KEY` | OpenAI API 키 | - | ✅ |
| `DATABASE_URL` | PostgreSQL 연결 URL | - | ✅ |
| `STORAGE_MODE` | 저장 모드 (`development`/`production`) | `development` | ❌ |

### **포트 설정**

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Voicebot App | 3001 | 메인 애플리케이션 |
| PostgreSQL | 5433 | 데이터베이스 |
| pgAdmin | 8081 | DB 관리 도구 |

## 📊 데이터베이스

### **데이터 현황**
- **상담 기록**: 5,760개
- **메시지**: 221,632개
- **데이터베이스**: PostgreSQL 15

### **데이터베이스 스키마**

```sql
CREATE TABLE voc_raw (
  source_id          text PRIMARY KEY,
  consulting_date    timestamp NOT NULL,
  client_gender      text NOT NULL,        -- "남자", "여자"
  client_age         integer NOT NULL,     -- 연령대 (20, 30, 40, 50, 60)
  consulting_turns   integer NOT NULL,     -- 대화 턴 수
  consulting_length  integer NOT NULL,     -- 상담 길이 (초)
  consulting_content text NOT NULL,        -- 전체 대화 내용
  consulting_time    timestamp NOT NULL,   -- 상담 시작 시간
  created_at         timestamp DEFAULT now(),
  updated_at         timestamp DEFAULT now()
);
```

### **데이터 저장 예시**

#### **상담 진행 시 자동 저장되는 데이터:**

```json
{
  "source_id": "consultation_20250908_001",
  "consulting_date": "2025-09-08T00:00:00.000Z",
  "client_gender": "남자",
  "client_age": 25,
  "consulting_turns": 8,
  "consulting_length": 180,
  "consulting_content": "상담원: 안녕하세요! 하나카드 상담원입니다.\n고객: 안녕하세요. 카드 추천해주세요.\n상담원: 주민번호 앞 6자리를 알려주세요.\n고객: 991207\n상담원: 주민번호 뒷 1자리를 알려주세요.\n고객: 1\n상담원: 감사합니다. 25세 남성분이시군요...",
  "consulting_time": "2025-09-08T14:30:00.000Z",
  "created_at": "2025-09-08T14:30:00.000Z",
  "updated_at": "2025-09-08T14:33:00.000Z"
}
```

#### **주민번호 기반 자동 정보 추출:**

| 주민번호 | 성별 | 연령대 | DB 저장값 |
|----------|------|--------|-----------|
| `991207-1` | 남자 | 25세 | `gender: "남자"`, `age: 20` |
| `850315-2` | 여자 | 39세 | `gender: "여자"`, `age: 30` |
| `030421-3` | 남자 | 21세 | `gender: "남자"`, `age: 20` |

#### **API를 통한 데이터 조회:**

```bash
# 모든 상담 기록 조회
curl http://localhost:3001/api/consultations

# 특정 상담 조회
curl http://localhost:3001/api/consultations?source_id=consultation_20250908_001
```

### **pgAdmin 접속**
- **URL**: http://localhost:8081
- **이메일**: admin@voicebot.com
- **비밀번호**: admin123

## 🔧 개발 환경

### **로컬 개발 설정**

```bash
# 의존성 설치
npm install

# 데이터베이스 마이그레이션
npx prisma migrate dev

# 개발 서버 실행
npm run dev
```

### **유용한 명령어**

```bash
# 데이터베이스 스튜디오
npm run db:studio

# Prisma 클라이언트 생성
npm run db:generate

# 데이터베이스 마이그레이션
npm run db:migrate

# Docker 로그 확인
npm run docker:logs
```

## 📁 프로젝트 구조

```
InsightOps-realtime-voicebot/
├── src/
│   ├── app/
│   │   ├── agentConfigs/          # AI 에이전트 설정
│   │   │   └── virtualConsultation/
│   │   │       ├── chatAgent.ts      # 가상 상담원
│   │   │       └── supervisorAgent.ts # 전문가 상담원
│   │   ├── api/                   # API 라우트
│   │   │   ├── consultations/     # 상담 관련 API
│   │   │   ├── save-conversation/ # 대화 저장 API
│   │   │   └── session/           # 세션 관리 API
│   │   ├── components/            # React 컴포넌트
│   │   ├── hooks/                 # 커스텀 훅
│   │   └── lib/                   # 유틸리티 함수
│   └── lib/
│       └── database.ts            # 데이터베이스 연결
├── prisma/
│   └── schema.prisma              # 데이터베이스 스키마
├── docker-compose.yml             # Docker 오케스트레이션
├── Dockerfile                     # 컨테이너 이미지 빌드
└── deploy.sh                      # 배포 스크립트
```

## 🚀 배포

### **DockerHub 이미지**
```bash
# 최신 이미지 사용
docker pull s4nta1207/voicebot-service:latest
```

### **프로덕션 환경**
```bash
# 환경 변수 설정
export OPENAI_API_KEY="your-api-key"
export DATABASE_URL="your-database-url"
export STORAGE_MODE="production"

# 배포 실행
./deploy.sh
```

## 🤝 기여하기

1. **Fork** 저장소
2. **Feature 브랜치** 생성 (`git checkout -b feature/amazing-feature`)
3. **커밋** (`git commit -m 'Add amazing feature'`)
4. **푸시** (`git push origin feature/amazing-feature`)
5. **Pull Request** 생성

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원

- **이슈 리포트**: [GitHub Issues](https://github.com/s4nta1999/InsightOps-realtime-voicebot/issues)
- **문서**: [Wiki](https://github.com/s4nta1999/InsightOps-realtime-voicebot/wiki)

---

<div align="center">

**🎙️ 실시간 음성 상담의 새로운 경험을 시작하세요!**

[![Deploy with Docker](https://img.shields.io/badge/Deploy%20with-Docker-blue?logo=docker)](https://hub.docker.com/r/s4nta1207/voicebot-service)
[![Open in GitHub](https://img.shields.io/badge/Open%20in-GitHub-black?logo=github)](https://github.com/s4nta1999/InsightOps-realtime-voicebot)

</div>
# CI/CD 테스트
# CI/CD 테스트 - Tue Sep  9 17:25:45 KST 2025
