import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { saveConsultationToDatabase, testDatabaseConnection } from "@/lib/database";
import { sendToClassificationService, checkClassificationServiceHealth } from "@/lib/classificationService";

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agent?: string;
}

interface ConversationData {
  source_id: string;
  consulting_content: string;
  consulting_date: string;
  consulting_time: string;
  metadata: {
    consulting_turns: string;
    consulting_length: number;
    session_id: string;
    start_time: string;
    end_time: string;
    duration: string;
  };
  messages?: ConversationMessage[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, messages, startTime, endTime } = body;

    if (!sessionId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    // 저장 모드 확인 (환경변수)
    const storageMode = process.env.STORAGE_MODE || 'development';
    console.log(`🔧 저장 모드: ${storageMode}`);

    // 상담 내용 생성 (전체 대화를 하나의 텍스트로)
    const consultingContent = messages.map((msg: any) => {
      const speaker = msg.role === 'user' ? '고객' : '상담원';
      return `${speaker}: ${msg.content || msg.text || ''}`;
    }).join('\n');

    const now = new Date();
    const startDate = startTime ? new Date(startTime) : now;
    const endDate = endTime ? new Date(endTime) : now;
    
    // 대화 데이터 구조화 (요청한 형식으로)
    const conversationData: ConversationData = {
      source_id: sessionId.slice(-8) || Date.now().toString().slice(-8),
      consulting_content: consultingContent,
      consulting_date: startDate.toISOString().split('T')[0],
      consulting_time: startDate.toTimeString().split(' ')[0].slice(0, 5),
      metadata: {
        consulting_turns: messages.length.toString(),
        consulting_length: consultingContent.length,
        session_id: sessionId,
        start_time: startTime || now.toISOString(),
        end_time: endDate.toISOString(),
        duration: calculateDuration(startTime, endTime)
      },
    };

    console.log(`📝 상담 데이터 준비 완료: ${conversationData.source_id}, 턴 수: ${conversationData.metadata.consulting_turns}`);

    // 저장 방식 선택
    if (storageMode === 'production') {
      // MySQL에 저장
      console.log('💾 MySQL에 상담 기록 저장 중...');
      
      try {
        // 데이터베이스 연결 확인
        const isConnected = await testDatabaseConnection();
        if (!isConnected) {
          throw new Error('데이터베이스 연결 실패');
        }

        // 데이터베이스에 저장
        const savedVocRaw = await saveConsultationToDatabase(conversationData);
        
        console.log(`✅ 데이터베이스 저장 완료: ${conversationData.source_id}`);

        // 🔥 새로 추가: 분류 서비스 호출
        let classificationResult = null;
        try {
          console.log('🤖 분류 서비스 호출 시작...');
          
          // 분류 서비스 상태 확인
          const isServiceHealthy = await checkClassificationServiceHealth();
          if (!isServiceHealthy) {
            console.warn('⚠️ 분류 서비스가 응답하지 않습니다. 분류를 건너뜁니다.');
          } else {
            classificationResult = await sendToClassificationService(conversationData);
            
            if (classificationResult.success) {
              console.log(`🎯 분류 완료: ${classificationResult.data?.consultingCategory}`);
              const confidence = classificationResult.data?.classification?.confidence;
              if (confidence !== undefined) {
                console.log(`📊 신뢰도: ${(confidence * 100).toFixed(1)}%`);
              }
            } else {
              console.warn(`⚠️ 분류 실패: ${classificationResult.error}`);
            }
          }
        } catch (classificationError) {
          console.error('❌ 분류 서비스 호출 중 예외 발생:', classificationError);
        }

        return NextResponse.json({
          success: true,
          message: "상담 기록이 데이터베이스에 성공적으로 저장되었습니다",
          storage_type: "database",
          consultation_id: savedVocRaw.sourceId,
          source_id: conversationData.source_id,
          consulting_turns: conversationData.metadata.consulting_turns,
          consulting_length: conversationData.metadata.consulting_length,
          duration: conversationData.metadata.duration,
          // 🔥 분류 결과 추가
          classification: classificationResult?.success ? {
            category: classificationResult.data?.consultingCategory,
            confidence: classificationResult.data?.classification.confidence,
            analysis: classificationResult.data?.analysis
          } : null
        });
      } catch (dbError) {
        console.error('❌ 데이터베이스 저장 실패, 파일 저장으로 대체:', dbError);
        // 데이터베이스 저장 실패 시 파일 저장으로 대체
      }
    }

    // 파일 저장 (개발 모드 또는 데이터베이스 저장 실패 시)
    console.log('📁 파일 시스템에 상담 기록 저장 중...');
    
    const conversationsDir = join(process.cwd(), 'conversations');
    try {
      await mkdir(conversationsDir, { recursive: true });
    } catch {
      // 폴더가 이미 존재하는 경우 무시
    }

    // 파일명 생성 (source_id 기반)
    const fileName = `consulting_${conversationData.source_id}.json`;
    const filePath = join(conversationsDir, fileName);

    // JSON 파일로 저장 (구조화된 형식)
    await writeFile(filePath, JSON.stringify(conversationData, null, 2), 'utf-8');

    // 텍스트 형태로도 저장 (가독성용)
    const textContent = generateTextFormat(conversationData);
    const textFileName = `consulting_${conversationData.source_id}.txt`;
    const textFilePath = join(conversationsDir, textFileName);
    await writeFile(textFilePath, textContent, 'utf-8');

    console.log(`✅ 파일 저장 완료: ${fileName}`);

    return NextResponse.json({
      success: true,
      message: "상담 기록이 파일로 성공적으로 저장되었습니다",
      storage_type: "file",
      fileName,
      textFileName,
      source_id: conversationData.source_id,
      consulting_turns: conversationData.metadata.consulting_turns,
      consulting_length: conversationData.metadata.consulting_length,
      duration: conversationData.metadata.duration
    });

  } catch (error) {
    console.error("대화 저장 중 오류:", error);
    return NextResponse.json(
      { error: "대화 저장 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "알 수 없음";
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  
  return `${minutes}분 ${seconds}초`;
}

function generateTextFormat(data: ConversationData): string {
  let text = `=== 하나카드 가상 상담 기록 ===\n\n`;
  text += `상담 ID: ${data.source_id}\n`;
  text += `상담 날짜: ${data.consulting_date}\n`;
  text += `상담 시간: ${data.consulting_time}\n`;
  text += `상담 턴 수: ${data.metadata.consulting_turns}턴\n`;
  text += `상담 길이: ${data.metadata.consulting_length}자\n`;
  text += `상담 소요시간: ${data.metadata.duration}\n\n`;
  text += `=== 상담 내용 ===\n\n`;
  text += `${data.consulting_content}\n\n`;
  
  if (data.messages && data.messages.length > 0) {
    text += `=== 상세 메시지 기록 ===\n\n`;
    data.messages.forEach((msg, index) => {
      const speaker = msg.role === 'user' ? '고객' : `상담원${msg.agent ? ` (${msg.agent})` : ''}`;
      const time = new Date(msg.timestamp).toLocaleTimeString('ko-KR');
      text += `[${index + 1}] ${speaker} (${time})\n`;
      text += `${msg.content}\n\n`;
    });
  }

  return text;
}