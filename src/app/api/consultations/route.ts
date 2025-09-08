import { NextRequest, NextResponse } from "next/server";
import { getAllConsultations, getConsultationById } from "@/lib/database";

// 모든 상담 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sourceId = searchParams.get('sourceId');

    // 특정 상담 조회
    if (sourceId) {
      const consultation = await getConsultationById(sourceId);
      
      if (!consultation) {
        return NextResponse.json(
          { error: "상담 기록을 찾을 수 없습니다" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        consultation
      });
    }

    // 전체 상담 목록 조회
    const result = await getAllConsultations(page, limit);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("상담 기록 조회 중 오류:", error);
    return NextResponse.json(
      { error: "상담 기록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
