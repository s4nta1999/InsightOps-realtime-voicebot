# Node.js 18 기반 이미지 사용
FROM node:18-alpine AS base

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일들 복사
COPY package*.json ./
COPY prisma ./prisma/

# 의존성 설치 (빌드용 dev 의존성 포함)
RUN npm ci && npm cache clean --force

# Prisma 클라이언트 생성
RUN npx prisma generate

# 애플리케이션 소스 복사
COPY . .

# Next.js 빌드
RUN npm run build

# 포트 노출
EXPOSE 3001

# start.sh 파일 권한 설정
RUN chmod +x start.sh

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# 애플리케이션 실행
CMD ["npm", "start"]
