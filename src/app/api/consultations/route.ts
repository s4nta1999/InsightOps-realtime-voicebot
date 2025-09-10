import { NextRequest, NextResponse } from "next/server";
import { getAllConsultations, getConsultationById } from "@/lib/database";

// 모든 상담 목록 조회
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 상담 기록 조회 요청 시작");
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sourceId = searchParams.get('sourceId');

    console.log(`📋 조회 파라미터: page=${page}, limit=${limit}, sourceId=${sourceId}`);

    // 특정 상담 조회
    if (sourceId) {
      console.log(`🔍 특정 상담 조회: ${sourceId}`);
      const vocRaw = await getConsultationById(sourceId);
      
      if (!vocRaw) {
        console.log(`❌ 상담 기록을 찾을 수 없음: ${sourceId}`);
        return NextResponse.json(
          { error: "상담 기록을 찾을 수 없습니다" },
          { status: 404 }
        );
      }

      console.log(`✅ 상담 기록 조회 성공: ${sourceId}`);
      
      // 🔥 분류 결과 조회 추가
      let classificationResult = null;
      try {
        const classificationUrl = process.env.CLASSIFICATION_SERVICE_URL;
        if (classificationUrl) {
          console.log(`🤖 분류 결과 조회 시도: ${sourceId}`);
          
          // AbortController를 사용한 타임아웃 구현
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
          
          const response = await fetch(`${classificationUrl}/api/classify/history?sourceId=${sourceId}`, {
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
              classificationResult = result.data[0]; // 첫 번째 결과 사용
              console.log(`✅ 분류 결과 조회 성공: ${classificationResult.consultingCategory}`);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ 분류 결과 조회 실패:', error);
      }

      return NextResponse.json({
        success: true,
        vocRaw,
        classification: classificationResult // 🔥 분류 결과 추가
      });
    }

    // 전체 상담 목록 조회
    console.log("📋 전체 상담 목록 조회 시작");
    const result = await getAllConsultations(page, limit);
    
    console.log(`✅ 상담 목록 조회 성공: 총 ${result.total}개, 페이지 ${result.page}/${result.totalPages}`);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("❌ 상담 기록 조회 중 오류:", error);
    console.error("❌ 오류 상세:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    return NextResponse.json(
      { 
        error: "상담 기록 조회 중 오류가 발생했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}