import { extractClientInfoFromConversation } from './database';

interface ClassificationRequest {
  source_id: string;
  consulting_date: string;
  client_gender: string;
  client_age: number;
  consulting_turns: number;
  consulting_length: number;
  consulting_content: string;
}

interface ClassificationResponse {
  success: boolean;
  data?: {
    id: number;
    sourceId: string;
    consultingCategory: string;
    classification: {
      confidence: number;
      alternative_categories: Array<{
        category: string;
        confidence: number;
      }>;
    };
    analysis: {
      problem_situation: string;
      solution_approach: string;
      expected_outcome: string;
    };
  };
  error?: string;
  message?: string;
}

export async function sendToClassificationService(
  conversationData: any
): Promise<ClassificationResponse> {
  const classificationUrl = process.env.CLASSIFICATION_SERVICE_URL;
  const isEnabled = process.env.ENABLE_AUTO_CLASSIFICATION === 'true';
  const timeout = parseInt(process.env.CLASSIFICATION_TIMEOUT || '30000');

  console.log(`🔧 분류 서비스 설정: enabled=${isEnabled}, url=${classificationUrl}, timeout=${timeout}ms`);

  if (!isEnabled || !classificationUrl) {
    console.log('🔧 자동 분류 기능이 비활성화되어 있습니다.');
    return { success: false, error: 'Auto classification disabled' };
  }

  try {
    // 상담 내용에서 고객 정보 추출
    const clientInfo = extractClientInfoFromConversation(conversationData.consulting_content);
    
    console.log(`👤 고객 정보 추출: ${clientInfo.gender}, ${clientInfo.age}세`);
    
    // 날짜 형식 변환 (ISO 8601 형식으로)
    const consultingDateTime = new Date(`${conversationData.consulting_date}T${conversationData.consulting_time}`);
    
    const classificationRequest: ClassificationRequest = {
      source_id: conversationData.source_id,
      consulting_date: consultingDateTime.toISOString(),
      client_gender: clientInfo.gender,
      client_age: clientInfo.age,
      consulting_turns: parseInt(conversationData.metadata.consulting_turns),
      consulting_length: conversationData.metadata.consulting_length,
      consulting_content: conversationData.consulting_content
    };

    console.log(`🤖 분류 서비스 호출 시작: ${conversationData.source_id}`);
    console.log(`📊 요청 데이터: 턴수=${classificationRequest.consulting_turns}, 길이=${classificationRequest.consulting_length}`);
    
    // AbortController를 사용한 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${classificationUrl}/api/enhanced-classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(classificationRequest),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`분류 서비스 응답 오류: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ 분류 완료: ${result.data.consultingCategory} (신뢰도: ${(result.data.classification.confidence * 100).toFixed(1)}%)`);
      console.log(`📋 문제상황: ${result.data.analysis.problem_situation}`);
      console.log(`💡 해결방안: ${result.data.analysis.solution_approach}`);
      return { success: true, data: result.data };
    } else {
      throw new Error(result.message || '분류 서비스에서 오류 응답');
    }

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`❌ 분류 서비스 호출 타임아웃 (${timeout}ms)`);
      return { 
        success: false, 
        error: `분류 서비스 호출 타임아웃 (${timeout}ms)` 
      };
    }
    
    console.error('❌ 분류 서비스 호출 실패:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '알 수 없는 오류' 
    };
  }
}

// 분류 서비스 상태 확인 함수
export async function checkClassificationServiceHealth(): Promise<boolean> {
  const classificationUrl = process.env.CLASSIFICATION_SERVICE_URL;
  
  if (!classificationUrl) {
    return false;
  }

  try {
    // AbortController를 사용한 타임아웃 구현
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
    
    const response = await fetch(`${classificationUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.warn('분류 서비스 상태 확인 실패:', error);
    return false;
  }
}
