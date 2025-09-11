import { NextRequest, NextResponse } from "next/server";
import { getVocCountSummary } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    console.log("📊 VoC 건수 집계 API 요청 시작");
    
    const body = await request.json();
    const { period, baseDate } = body;
    
    // 입력 검증
    if (!period || !baseDate) {
      return NextResponse.json(
        { error: "period와 baseDate는 필수입니다" },
        { status: 400 }
      );
    }
    
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return NextResponse.json(
        { error: "period는 daily, weekly, monthly 중 하나여야 합니다" },
        { status: 400 }
      );
    }
    
    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(baseDate)) {
      return NextResponse.json(
        { error: "baseDate는 YYYY-MM-DD 형식이어야 합니다" },
        { status: 400 }
      );
    }
    
    console.log(`📊 집계 파라미터: period=${period}, baseDate=${baseDate}`);
    
    // VoC 건수 집계 실행
    const result = await getVocCountSummary(period, baseDate);
    
    console.log(`✅ VoC 건수 집계 완료:`, result);
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error("❌ VoC 건수 집계 API 오류:", error);
    
    return NextResponse.json(
      { 
        error: "VoC 건수 집계 중 오류가 발생했습니다",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
