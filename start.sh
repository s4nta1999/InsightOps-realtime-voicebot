#!/bin/bash

echo "🚀 음성봇 서비스 시작 중..."

# 환경변수 확인
echo "📋 환경 설정 확인:"
echo "  - STORAGE_MODE: ${STORAGE_MODE:-development}"
echo "  - DATABASE_URL: ${DATABASE_URL:-not set}"

# 프로덕션 모드인 경우에만 데이터베이스 연결 대기
if [ "$STORAGE_MODE" = "production" ]; then
  echo "⏳ 데이터베이스 연결 대기 중..."
  
  # 데이터베이스 호스트 추출
  DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
  DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  
  if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
    until nc -z $DB_HOST $DB_PORT; do
      echo "MySQL이 준비될 때까지 대기 중... ($DB_HOST:$DB_PORT)"
      sleep 2
    done
    echo "✅ MySQL 연결 확인됨"
    
    # 데이터베이스 마이그레이션 실행
    echo "🔄 데이터베이스 마이그레이션 실행 중..."
    npx prisma migrate deploy
    
    # Prisma 클라이언트 생성
    echo "🔧 Prisma 클라이언트 생성 중..."
    npx prisma generate
  else
    echo "⚠️ DATABASE_URL이 올바르지 않습니다. 파일 저장 모드로 전환합니다."
    export STORAGE_MODE="development"
  fi
else
  echo "📁 파일 저장 모드로 실행합니다."
fi

# 애플리케이션 시작
echo "🎯 음성봇 애플리케이션 시작!"
npm start
