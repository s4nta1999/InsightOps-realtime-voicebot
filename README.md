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

### 🤖 **AI 분류 연동** ⭐ NEW
- **자동 분류**: 상담 종료 시 자동으로 25개 카테고리로 분류
- **상세 분석**: 문제 상황, 해결 방안, 예상 결과 자동 분석
- **실시간 피드백**: 분류 결과를 상담 화면에 즉시 표시
- **마이크로서비스 연동**: Classification 서비스와 완전 연동

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
  -e DATABASE_URL="your-database-url" \
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
| `DATABASE_URL` | MySQL 연결 URL | - | ✅ |
| `STORAGE_MODE` | 저장 모드 (`development`/`production`) | `development` | ❌ |
| `CLASSIFICATION_SERVICE_URL` | 분류 서비스 URL | - | ❌ |
| `ENABLE_AUTO_CLASSIFICATION` | 자동 분류 활성화 | `false` | ❌ |
| `CLASSIFICATION_TIMEOUT` | 분류 서비스 타임아웃 (ms) | `30000` | ❌ |

### **포트 설정**

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Voicebot App | 3001 | 메인 애플리케이션 |
| MySQL | 3306 | 데이터베이스 |
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

## 🔗 마이크로서비스 연동

### **분류 서비스 연동** ⭐

이 보이스봇은 InsightOps Classification 서비스와 완전히 연동되어 상담 종료 시 자동으로 분류 및 분석을 수행합니다.

#### 🚀 **연동 플로우**

1. **상담 진행**: 사용자가 보이스봇과 실시간 음성 상담
2. **상담 종료**: 사용자가 연결을 해제하면 자동으로 대화 저장
3. **자동 분류**: 저장 완료 후 Classification 서비스로 상담 내용 전송
4. **AI 분석**: GPT-4o-mini가 25개 카테고리로 분류 및 상세 분석
5. **결과 표시**: 분류 결과를 실시간으로 상담 화면에 표시

#### 📊 **분류 결과 예시**

상담 종료 후 다음과 같은 분류 결과가 표시됩니다:

```
🎯 상담 분류: 도난/분실 신청/해제 (신뢰도: 95.2%)
📋 문제상황: 고객이 카드 도난 신고 후 정지 해제 요청
💡 해결방안: 신분증 인증 후 카드 정지 해제 처리
🎯 예상결과: 카드 정상 사용 가능
```

#### 🔧 **연동 설정**

Azure 환경에서 다음 환경변수를 설정하세요:

```bash
CLASSIFICATION_SERVICE_URL=https://insightops-classification-d2acc8afftgmhubt.koreacentral-01.azurewebsites.net
ENABLE_AUTO_CLASSIFICATION=true
CLASSIFICATION_TIMEOUT=30000
```

#### 📈 **API 엔드포인트**

- `GET /api/classification-status` - 분류 서비스 상태 확인
- `GET /api/consultations?sourceId={id}` - 상담 기록 + 분류 결과 조회

#### 🧪 **연동 테스트**

```bash
# 분류 서비스 상태 확인
curl https://your-voicebot-service.azurewebsites.net/api/classification-status

# 상담 기록과 분류 결과 조회
curl https://your-voicebot-service.azurewebsites.net/api/consultations?sourceId=12345678
```

---

<div align="center">

**🎙️ 실시간 음성 상담의 새로운 경험을 시작하세요!**

[![Deploy with Docker](https://img.shields.io/badge/Deploy%20with-Docker-blue?logo=docker)](https://hub.docker.com/r/s4nta1207/voicebot-service)
[![Open in GitHub](https://img.shields.io/badge/Open%20in-GitHub-black?logo=github)](https://github.com/s4nta1999/InsightOps-realtime-voicebot)

</div>
# CI/CD 테스트
# CI/CD 테스트 - Tue Sep  9 17:25:45 KST 2025

## �� API 문서

### **🔍 상담 관리 API**

#### **1. 상담 기록 조회**
```http
GET /api/consultations
```

**쿼리 파라미터:**
- `page` (optional): 페이지 번호 (기본값: 1)
- `limit` (optional): 페이지당 항목 수 (기본값: 10)
- `sourceId` (optional): 특정 상담 ID로 조회

**응답 예시:**
```json
{
  "success": true,
  "vocRaws": [
    {
      "sourceId": "12345678",
      "consultingDate": "2025-01-15T00:00:00.000Z",
      "clientGender": "남자",
      "clientAge": 30,
      "consultingTurns": 8,
      "consultingLength": 1200,
      "consultingContent": "상담 내용...",
      "createdAt": "2025-01-15T14:30:00.000Z",
      "updatedAt": "2025-01-15T14:33:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

#### **2. 특정 상담 조회 (분류 결과 포함)**
```http
GET /api/consultations?sourceId=12345678
```

**응답 예시:**
```json
{
  "success": true,
  "vocRaw": {
    "sourceId": "12345678",
    "consultingDate": "2025-01-15T00:00:00.000Z",
    "clientGender": "남자",
    "clientAge": 30,
    "consultingTurns": 8,
    "consultingLength": 1200,
    "consultingContent": "상담 내용...",
    "createdAt": "2025-01-15T14:30:00.000Z",
    "updatedAt": "2025-01-15T14:33:00.000Z"
  },
  "classification": {
    "consultingCategory": "도난/분실 신청/해제",
    "classification": {
      "confidence": 95.2
    },
    "analysis": {
      "problemSituation": "고객이 카드 도난 신고 후 정지 해제 요청",
      "solution": "신분증 인증 후 카드 정지 해제 처리",
      "expectedResult": "카드 정상 사용 가능"
    }
  }
}
```

#### **3. 상담 저장**
```http
POST /api/save-conversation
Content-Type: application/json
```

**요청 본문:**
```json
{
  "sessionId": "session_12345678",
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "안녕하세요"
    },
    {
      "id": "msg_2", 
      "role": "assistant",
      "content": "안녕하세요! 하나카드 상담원입니다."
    }
  ],
  "startTime": "2025-01-15T14:30:00.000Z",
  "endTime": "2025-01-15T14:33:00.000Z"
}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "상담 기록이 데이터베이스에 성공적으로 저장되었습니다",
  "storage_type": "database",
  "consultation_id": "12345678",
  "source_id": "12345678",
  "consulting_turns": 8,
  "consulting_length": 1200,
  "duration": 180,
  "is_updated": false,
  "classification": {
    "category": "도난/분실 신청/해제",
    "confidence": 95.2,
    "analysis": {
      "problemSituation": "고객이 카드 도난 신고 후 정지 해제 요청",
      "solution": "신분증 인증 후 카드 정지 해제 처리", 
      "expectedResult": "카드 정상 사용 가능"
    }
  }
}
```

### **📊 VoC 집계 API**

#### **4. VoC 건수 집계**
```http
POST /api/voc/count-summary
Content-Type: application/json
```

**요청 본문:**
```json
{
  "period": "daily|weekly|monthly",
  "baseDate": "2025-01-15"
}
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "period": "daily",
    "baseDate": "2025-01-15",
    "currentCount": 1234,
    "previousCount": 998,
    "deltaPercent": 23.6
  }
}
```

**집계 방식:**
- **Daily**: 해당 날짜의 VoC 건수 (00:00:00 ~ 23:59:59)
- **Weekly**: 해당 주의 VoC 건수 (월요일 시작)
- **Monthly**: 해당 월의 VoC 건수 (1일 ~ 마지막 날)
- **중복 제거**: 같은 `sourceId`로 여러 번 저장된 경우 중복 제거
- **증감률**: 이전 기간 대비 증감률 계산

### **�� 시스템 관리 API**

#### **5. Health Check**
```http
GET /api/health
```

**응답 예시:**
```json
{
  "ok": true,
  "timestamp": "2025-01-15T14:30:00.000Z",
  "uptime": 3600.5,
  "database": {
    "connected": true,
    "url": "configured",
    "storage_mode": "production"
  },
  "environment": {
    "node_env": "production",
    "websites_port": "3001"
  }
}
```

#### **6. 분류 서비스 상태 확인**
```http
GET /api/classification-status
```

**응답 예시:**
```json
{
  "success": true,
  "service": "classification",
  "status": "healthy",
  "url": "https://insightops-classification-d2acc8afftgmhubt.koreacentral-01.azurewebsites.net",
  "responseTime": 245,
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

#### **7. 세션 관리**
```http
GET /api/session
```

**응답 예시:**
```json
{
  "success": true,
  "sessionId": "session_12345678",
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

#### **8. 응답 저장**
```http
POST /api/responses
Content-Type: application/json
```

**요청 본문:**
```json
{
  "sessionId": "session_12345678",
  "response": "상담원 응답 내용",
  "timestamp": "2025-01-15T14:30:00.000Z"
}
```

### **🧪 API 테스트 예시**

#### **로컬 환경 테스트:**
```bash
# Health Check
curl http://localhost:3001/api/health

# 상담 목록 조회
curl http://localhost:3001/api/consultations

# 특정 상담 조회
curl http://localhost:3001/api/consultations?sourceId=12345678

# VoC 건수 집계 (일별)
curl -X POST http://localhost:3001/api/voc/count-summary \
  -H "Content-Type: application/json" \
  -d '{"period": "daily", "baseDate": "2025-01-15"}'

# VoC 건수 집계 (주별)
curl -X POST http://localhost:3001/api/voc/count-summary \
  -H "Content-Type: application/json" \
  -d '{"period": "weekly", "baseDate": "2025-01-15"}'

# VoC 건수 집계 (월별)
curl -X POST http://localhost:3001/api/voc/count-summary \
  -H "Content-Type: application/json" \
  -d '{"period": "monthly", "baseDate": "2025-01-15"}'
```

#### **프로덕션 환경 테스트:**
```bash
# Azure 배포 환경에서 테스트
curl https://insightops-voicebot-aud7gfhwc3fsb3h7.koreacentral-01.azurewebsites.net/api/health

curl https://insightops-voicebot-aud7gfhwc3fsb3h7.koreacentral-01.azurewebsites.net/api/consultations

curl -X POST https://insightops-voicebot-aud7gfhwc3fsb3h7.koreacentral-01.azurewebsites.net/api/voc/count-summary \
  -H "Content-Type: application/json" \
  -d '{"period": "daily", "baseDate": "2025-01-15"}'
```

### **�� API 에러 코드**

| HTTP 상태 코드 | 설명 | 해결 방법 |
|---------------|------|-----------|
| 200 | 성공 | - |
| 400 | 잘못된 요청 | 요청 파라미터 확인 |
| 404 | 리소스 없음 | API 경로 확인 |
| 500 | 서버 에러 | 서버 로그 확인 |

### **🔒 API 보안**

- **인증**: 현재 인증 없이 접근 가능 (프로덕션 환경에서는 인증 추가 권장)
- **CORS**: 모든 도메인에서 접근 가능
- **Rate Limiting**: 현재 제한 없음 (프로덕션 환경에서는 제한 추가 권장)

