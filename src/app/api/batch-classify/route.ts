import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    console.log("🔄 배치 분류 처리 시작");
    
    const body = await request.json();
    const { limit = 10, offset = 0, maxRecords = 100 } = body;
    
    console.log(`📋 배치 설정: limit=${limit}, offset=${offset}, maxRecords=${maxRecords}`);
    
    // 1. voc_raw에서 처리할 데이터 조회
    const vocRawData = await prisma.vocRaw.findMany({
      skip: offset,
      take: Math.min(limit, maxRecords),
      orderBy: { consultingDate: 'asc' }
    });
    
    console.log(`📊 처리할 데이터: ${vocRawData.length}건`);
    
    if (vocRawData.length === 0) {
      return NextResponse.json({
        success: true,
        message: "처리할 데이터가 없습니다",
        data: {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          results: []
        }
      });
    }
    
    const results = [];
    const startTime = Date.now();
    
    // 2. 각 데이터를 분류 서비스로 전송
    for (let i = 0; i < vocRawData.length; i++) {
      const record = vocRawData[i];
      
      try {
        console.log(`🤖 분류 처리 중 (${i + 1}/${vocRawData.length}): ${record.sourceId}`);
        
        // voc_raw 데이터를 ClassificationRequest 형태로 변환
        const classificationRequest = {
          source_id: record.sourceId,
          consulting_date: record.consultingDate.toISOString(),
          client_gender: record.clientGender,
          client_age: record.clientAge,
          consulting_turns: record.consultingTurns,
          consulting_length: record.consultingLength,
          consulting_content: record.consultingContent
        };
        
        console.log(`📤 분류 서비스로 전송: ${record.sourceId}`);
        
        // 분류 서비스 호출
        const response = await fetch(
          'https://insightops-classification-d2acc8afftgmhubt.koreacentral-01.azurewebsites.net/api/enhanced-classify',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(classificationRequest)
          }
        );
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ 분류 성공: ${record.sourceId} → ${result.data?.consultingCategory}`);
          
          results.push({
            sourceId: record.sourceId,
            status: 'success',
            category: result.data?.consultingCategory,
            confidence: result.data?.classification?.confidence,
            consultingDate: record.consultingDate.toISOString()
          });
        } else {
          const errorText = await response.text();
          console.log(`❌ 분류 실패: ${record.sourceId} → ${response.status} ${errorText}`);
          
          results.push({
            sourceId: record.sourceId,
            status: 'failed',
            error: `HTTP ${response.status}: ${errorText}`,
            consultingDate: record.consultingDate.toISOString()
          });
        }
        
        // 요청 간격 조절 (서버 부하 방지)
        if (i < vocRawData.length - 1) {
          console.log(`⏳ 1초 대기 중...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ 처리 중 오류: ${record.sourceId}`, error);
        results.push({
          sourceId: record.sourceId,
          status: 'error',
          error: error instanceof Error ? error.message : '알 수 없는 오류',
          consultingDate: record.consultingDate.toISOString()
        });
      }
    }
    
    const processingTime = Date.now() - startTime;
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status !== 'success').length;
    
    console.log(`✅ 배치 분류 완료: 성공 ${successful}건, 실패 ${failed}건, 소요시간 ${processingTime}ms`);
    
    return NextResponse.json({
      success: true,
      message: `배치 분류 완료: 성공 ${successful}건, 실패 ${failed}건`,
      data: {
        totalProcessed: results.length,
        successful,
        failed,
        processingTime,
        results
      }
    });
    
  } catch (error) {
    console.error("❌ 배치 분류 처리 실패:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        message: "배치 분류 처리 중 오류가 발생했습니다"
      },
      { status: 500 }
    );
  }
}

// 배치 처리 상태 확인 API
export async function GET() {
  try {
    console.log("📊 배치 처리 상태 확인");
    
    // 전체 voc_raw 데이터 수 조회
    const totalVocRaw = await prisma.vocRaw.count();
    
    // 최근 처리된 데이터 조회 (예시)
    const recentData = await prisma.vocRaw.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        sourceId: true,
        consultingDate: true,
        clientGender: true,
        clientAge: true,
        consultingTurns: true
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        totalVocRawRecords: totalVocRaw,
        recentRecords: recentData,
        message: "배치 처리 상태 확인 완료"
      }
    });
    
  } catch (error) {
    console.error("❌ 배치 처리 상태 확인 실패:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '알 수 없는 오류' 
      },
      { status: 500 }
    );
  }
}
