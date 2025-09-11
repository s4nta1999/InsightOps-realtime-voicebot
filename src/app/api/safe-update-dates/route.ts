import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      startDate = "2025-08-01", 
      endDate = "2025-09-11",
      dryRun = true, // 기본값을 true로 설정 (안전)
      batchSize = 50 // 한 번에 처리할 개수
    } = body;

    console.log(`🔄 안전한 날짜 업데이트 시작: ${startDate} ~ ${endDate}`);
    console.log(`🔍 Dry Run: ${dryRun}, Batch Size: ${batchSize}`);

    // 전체 데이터 개수 확인
    const totalCount = await prisma.vocRaw.count();
    console.log(`📊 전체 데이터 개수: ${totalCount}개`);

    if (totalCount === 0) {
      return NextResponse.json({
        success: false,
        message: "업데이트할 데이터가 없습니다."
      });
    }

    // 날짜 범위 계산
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`📅 총 ${totalDays}일간 분포`);

    // 날짜별 분포 계산 (최근으로 갈수록 증가하는 추세)
    const dateDistribution = calculateDateDistribution(totalCount, totalDays, start);
    
    // 각 날짜별 데이터 개수 출력
    console.log("📊 날짜별 분포:");
    const distributionPreview = dateDistribution.map((count, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
      console.log(`  ${date.toISOString().split('T')[0]} (${dayOfWeek}): ${count}개`);
      return {
        date: date.toISOString().split('T')[0],
        dayOfWeek,
        count
      };
    });

    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: "Dry Run 완료 - 실제 업데이트는 수행되지 않았습니다.",
        data: {
          totalCount,
          totalDays,
          dateDistribution: distributionPreview,
          summary: {
            minPerDay: Math.min(...dateDistribution),
            maxPerDay: Math.max(...dateDistribution),
            avgPerDay: Math.round(totalCount / totalDays)
          }
        }
      });
    }

    // 실제 업데이트 수행
    console.log("🚀 실제 업데이트 시작...");
    
    // 모든 레코드 조회 (생성 순서대로)
    const allRecords = await prisma.vocRaw.findMany({
      orderBy: { createdAt: 'asc' }
    });

    let currentIndex = 0;
    const updateResults = [];
    const errors = [];

    for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
      const targetDate = new Date(start);
      targetDate.setDate(start.getDate() + dayIndex);
      const dayCount = dateDistribution[dayIndex];

      if (dayCount === 0) continue;

      // 해당 날짜에 배정할 레코드들
      const recordsForThisDay = allRecords.slice(currentIndex, currentIndex + dayCount);
      
      // 배치 단위로 처리 (트랜잭션 사용)
      for (let i = 0; i < recordsForThisDay.length; i += batchSize) {
        const batch = recordsForThisDay.slice(i, i + batchSize);
        
        try {
          // 트랜잭션으로 배치 업데이트 (원자성 보장)
          await prisma.$transaction(async (tx) => {
            for (const record of batch) {
              // 랜덤한 시간 생성 (09:00 ~ 18:00)
              const randomHour = Math.floor(Math.random() * 10) + 9; // 9~18시
              const randomMinute = Math.floor(Math.random() * 60);
              const randomSecond = Math.floor(Math.random() * 60);
              
              const newDateTime = new Date(targetDate);
              newDateTime.setHours(randomHour, randomMinute, randomSecond);

              await tx.vocRaw.update({
                where: { sourceId: record.sourceId },
                data: { consultingDate: newDateTime }
              });

              updateResults.push({
                sourceId: record.sourceId,
                oldDate: record.consultingDate.toISOString(),
                newDate: newDateTime.toISOString()
              });
            }
          });
          
          console.log(`✅ 배치 ${Math.floor(i/batchSize) + 1} 완료: ${batch.length}개 업데이트`);
          
        } catch (error) {
          console.error(`❌ 배치 ${Math.floor(i/batchSize) + 1} 실패:`, error);
          errors.push({
            batch: Math.floor(i/batchSize) + 1,
            date: targetDate.toISOString().split('T')[0],
            error: error instanceof Error ? error.message : "알 수 없는 오류"
          });
        }
      }

      currentIndex += dayCount;
      console.log(`✅ ${targetDate.toISOString().split('T')[0]}: ${dayCount}개 업데이트 완료`);
    }

    console.log(`🎉 안전한 날짜 업데이트 완료: 총 ${updateResults.length}개 레코드 업데이트`);

    return NextResponse.json({
      success: true,
      message: `안전한 날짜 업데이트 완료: ${updateResults.length}개 레코드 업데이트`,
      data: {
        totalUpdated: updateResults.length,
        totalErrors: errors.length,
        dateRange: `${startDate} ~ ${endDate}`,
        totalDays,
        batchSize,
        sampleUpdates: updateResults.slice(0, 10), // 처음 10개 샘플
        errors: errors.slice(0, 5), // 처음 5개 에러만 표시
        summary: {
          successRate: ((updateResults.length / totalCount) * 100).toFixed(2) + '%',
          totalBatches: Math.ceil(totalCount / batchSize),
          avgPerDay: Math.round(updateResults.length / totalDays)
        }
      }
    });

  } catch (error) {
    console.error("❌ 안전한 날짜 업데이트 실패:", error);
    return NextResponse.json({
      success: false,
      message: "안전한 날짜 업데이트 실패",
      error: error instanceof Error ? error.message : "알 수 없는 오류"
    }, { status: 500 });
  }
}

// 날짜별 분포 계산 함수
function calculateDateDistribution(totalCount: number, totalDays: number, startDate: Date): number[] {
  const distribution = new Array(totalDays).fill(0);
  
  // 기본 분포: 최근으로 갈수록 증가하는 추세
  const baseIncrease = totalCount / (totalDays * 1.5); // 기본 증가량
  
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dayOfWeek = date.getDay(); // 0=일요일, 6=토요일
    
    // 기본값: 최근으로 갈수록 증가 (지수적이 아닌 선형적 증가)
    let baseCount = Math.floor(baseIncrease * (0.5 + (i / totalDays) * 1.5));
    
    // 요일별 패턴 적용
    if (dayOfWeek === 0 || dayOfWeek === 6) { // 주말
      baseCount = Math.floor(baseCount * 0.6); // 주말에는 40% 감소
    } else if (dayOfWeek === 1 || dayOfWeek === 5) { // 월요일, 금요일
      baseCount = Math.floor(baseCount * 1.3); // 30% 증가
    } else if (dayOfWeek === 2 || dayOfWeek === 4) { // 화요일, 목요일
      baseCount = Math.floor(baseCount * 1.1); // 10% 증가
    }
    
    // 랜덤 변동 (±25%)
    const randomFactor = 0.75 + Math.random() * 0.5; // 0.75 ~ 1.25
    baseCount = Math.floor(baseCount * randomFactor);
    
    // 최소값 보장 (최소 1개)
    distribution[i] = Math.max(1, baseCount);
  }
  
  // 총합이 totalCount와 맞도록 조정
  const currentTotal = distribution.reduce((sum, count) => sum + count, 0);
  const adjustmentFactor = totalCount / currentTotal;
  
  for (let i = 0; i < totalDays; i++) {
    distribution[i] = Math.floor(distribution[i] * adjustmentFactor);
  }
  
  // 마지막 조정으로 정확한 총합 맞추기
  const finalTotal = distribution.reduce((sum, count) => sum + count, 0);
  let difference = totalCount - finalTotal;
  
  // 차이만큼 최근 날짜들에 추가하거나 제거
  if (difference > 0) {
    // 부족한 만큼 최근 날짜들에 추가
    for (let i = totalDays - 1; i >= 0 && difference > 0; i--) {
      distribution[i]++;
      difference--;
    }
  } else if (difference < 0) {
    // 초과한 만큼 이전 날짜들에서 제거
    for (let i = 0; i < totalDays && difference < 0; i++) {
      if (distribution[i] > 1) {
        distribution[i]--;
        difference++;
      }
    }
  }
  
  return distribution;
}
