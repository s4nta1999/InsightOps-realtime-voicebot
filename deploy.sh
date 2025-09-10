#!/bin/bash

# Docker Hub 푸시 스크립트
# 사용법: ./deploy.sh [your-dockerhub-username] [tag]

set -e

# 변수 설정
DOCKERHUB_USERNAME=${1:-"your-username"}
IMAGE_TAG=${2:-"latest"}
IMAGE_NAME="voicebot-service"
FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "🐳 Docker Hub 푸시 시작"
echo "  - 이미지명: ${FULL_IMAGE_NAME}"
echo "  - 태그: ${IMAGE_TAG}"

# Docker 로그인 확인
echo "🔐 Docker Hub 로그인 확인 중..."
if ! docker info | grep -q "Username"; then
    echo "❌ Docker Hub에 로그인해주세요:"
    echo "   docker login"
    exit 1
fi

# 멀티플랫폼 빌드 및 푸시
echo "🔨 멀티플랫폼 Docker 이미지 빌드 및 푸시 중..."
echo "  - 지원 플랫폼: linux/amd64, linux/arm64"
docker buildx build --platform linux/amd64,linux/arm64 -t ${FULL_IMAGE_NAME} --push .

# 빌드 및 푸시 성공 확인
if [ $? -eq 0 ]; then
    echo "✅ 멀티플랫폼 이미지 빌드 및 푸시 완료"
else
    echo "❌ 멀티플랫폼 이미지 빌드 및 푸시 실패"
    exit 1
fi

echo "🎉 멀티플랫폼 푸시 완료!"
echo ""
echo "📋 사용 방법:"
echo "  docker pull ${FULL_IMAGE_NAME}"
echo ""
echo "🚀 Azure Container Apps 배포:"
echo "  az containerapp create \\"
echo "    --name voicebot-app \\"
echo "    --resource-group your-resource-group \\"
echo "    --environment your-container-env \\"
echo "    --image ${FULL_IMAGE_NAME} \\"
echo "    --target-port 3001 \\"
echo "    --env-vars STORAGE_MODE=production DATABASE_URL='your-mysql-url'"
