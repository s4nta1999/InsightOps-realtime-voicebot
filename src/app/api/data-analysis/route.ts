import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";

export async function GET() {
  try {
    console.log("📊 데이터 분석 시작 (읽기 전용)");

    // 1. 전체 데이터 개수
    const totalCount = await prisma.vocRaw.count();

    // 3. 최신/최오래된 데이터 확인
    const dateRange = await prisma.vocRaw.aggregate({
      _min: {
        consultingDate: true
      },
      _max: {
        consultingDate: true
      }
    });

    // 4. 샘플 데이터 (처음 5개)
    const sampleData = await prisma.vocRaw.findMany({
      take: 5,
      orderBy: { createdAt: 'asc' },
      select: {
        sourceId: true,
        consultingDate: true,
        clientGender: true,
        clientAge: true,
        consultingTurns: true,
        createdAt: true
      }
    });

    // 5. 날짜별 통계 (일별 집계)
    const dailyStats = await prisma.vocRaw.findMany({
      select: {
        consultingDate: true
      }
    });

    // 날짜별 카운트 계산
    const dateCountMap = new Map<string, number>();
    dailyStats.forEach(item => {
      const dateStr = item.consultingDate.toISOString().split('T')[0];
      dateCountMap.set(dateStr, (dateCountMap.get(dateStr) || 0) + 1);
    });

    const sortedDateCounts = Array.from(dateCountMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    console.log(`✅ 데이터 분석 완료: 총 ${totalCount}개 레코드`);

    return NextResponse.json({
      success: true,
      data: {
        totalCount,
        dateRange: {
          earliest: dateRange._min.consultingDate,
          latest: dateRange._max.consultingDate
        },
        dailyDistribution: sortedDateCounts,
        uniqueDatesCount: dateCountMap.size,
        sampleData,
        analysis: {
          averagePerDay: totalCount / dateCountMap.size,
          maxPerDay: Math.max(...dateCountMap.values()),
          minPerDay: Math.min(...dateCountMap.values())
        }
      }
    });

  } catch (error) {
    console.error("❌ 데이터 분석 실패:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "알 수 없는 오류"
    }, { status: 500 });
  }
}
