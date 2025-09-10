import { NextResponse } from "next/server";
import { checkClassificationServiceHealth } from "@/lib/classificationService";

// 분류 서비스 상태 확인 API
export async function GET() {
  try {
    console.log("🔍 분류 서비스 상태 확인 시작");
    
    const classificationUrl = process.env.CLASSIFICATION_SERVICE_URL;
    const isEnabled = process.env.ENABLE_AUTO_CLASSIFICATION === 'true';
    
    if (!isEnabled || !classificationUrl) {
      return NextResponse.json({
        success: false,
        status: 'disabled',
        message: '자동 분류 기능이 비활성화되어 있습니다.',
        config: {
          enabled: isEnabled,
          url: classificationUrl || 'not configured'
        }
      });
    }

    // 분류 서비스 상태 확인
    const isHealthy = await checkClassificationServiceHealth();
    
    if (isHealthy) {
      console.log("✅ 분류 서비스 정상 작동 중");
      return NextResponse.json({
        success: true,
        status: 'healthy',
        message: '분류 서비스가 정상적으로 작동 중입니다.',
        config: {
          enabled: isEnabled,
          url: classificationUrl
        }
      });
    } else {
      console.log("❌ 분류 서비스 응답 없음");
      return NextResponse.json({
        success: false,
        status: 'unhealthy',
        message: '분류 서비스가 응답하지 않습니다.',
        config: {
          enabled: isEnabled,
          url: classificationUrl
        }
      }, { status: 503 });
    }

  } catch (error) {
    console.error("❌ 분류 서비스 상태 확인 중 오류:", error);
    return NextResponse.json({
      success: false,
      status: 'error',
      message: '분류 서비스 상태 확인 중 오류가 발생했습니다.',
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}

