import { PrismaClient } from '@prisma/client';

// Prisma 클라이언트 싱글톤 인스턴스
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// 주민번호 검증 함수
export function validateResidentNumber(front6: string, back1: string): {
  isValid: boolean;
  error?: string;
  details?: string;
} {
  // 앞 6자리 검증 (YYMMDD)
  if (!/^\d{6}$/.test(front6)) {
    return { 
      isValid: false, 
      error: "앞 6자리는 숫자 6자리여야 합니다",
      details: `입력된 값: "${front6}"`
    };
  }
  
  const year = parseInt(front6.substring(0, 2));
  const month = parseInt(front6.substring(2, 4));
  const day = parseInt(front6.substring(4, 6));
  
  // 월 검증 (01-12)
  if (month < 1 || month > 12) {
    return { 
      isValid: false, 
      error: "월은 01부터 12까지여야 합니다",
      details: `입력된 월: ${month}`
    };
  }
  
  // 일 검증 (01-31)
  if (day < 1 || day > 31) {
    return { 
      isValid: false, 
      error: "일은 01부터 31까지여야 합니다",
      details: `입력된 일: ${day}`
    };
  }
  
  // 뒷 1자리 검증 (1,2,3,4만 허용)
  if (!/^[1-4]$/.test(back1)) {
    return { 
      isValid: false, 
      error: "뒷 1자리는 1,2,3,4 중 하나여야 합니다",
      details: `입력된 값: "${back1}"`
    };
  }
  
  // 나이 범위 검증 (현재 연도 기준)
  const currentYear = new Date().getFullYear();
  const birthYear = (parseInt(back1) <= 2) ? 1900 + year : 2000 + year;
  const age = currentYear - birthYear;
  
  if (age < 0 || age > 120) {
    return { 
      isValid: false, 
      error: "올바른 출생년도가 아닙니다",
      details: `계산된 나이: ${age}세`
    };
  }
  
  return { isValid: true };
}

// 주민번호 파싱 함수 (검증 통과 후)
function parseResidentNumber(front6: string, back1: string) {
  // 앞 6자리: YYMMDD (년월일)
  // 뒷 1자리: 성별코드 (1,2: 1900년대, 3,4: 2000년대)
  
  const year = parseInt(front6.substring(0, 2));
  const genderCode = parseInt(back1);
  
  // 성별 판별 (String: "남자", "여자")
  const gender = (genderCode === 1 || genderCode === 3) ? "남자" : "여자";
  
  // 출생년도 계산
  let birthYear;
  if (genderCode === 1 || genderCode === 2) {
    birthYear = 1900 + year;
  } else {
    birthYear = 2000 + year;
  }
  
  // 현재 연도 기준 나이 계산
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  // 연령대 계산 (Int: 20, 30, 40, 50, 60)
  const ageGroup = Math.floor(age / 10) * 10;
  
  return {
    gender,
    age: ageGroup,
    birthYear,
    fullAge: age
  };
}

// 주민번호 정보 추출 함수 (검증 포함)
export function extractClientInfoFromConversation(conversationContent: string): {
  gender: string;
  age: number;
  isValid: boolean;
  validationError?: string;
  extractedNumbers?: { front6: string; back1: string };
} {
  // 주민번호 패턴 찾기 (두 번에 나눠서 입력받는 방식)
  const front6Match = conversationContent.match(/주민번호 앞 6자리[^0-9]*(\d{6})/);
  const back1Match = conversationContent.match(/주민번호 뒷 1자리[^0-9]*(\d{1})/);
  
  // 더 유연한 패턴 매칭 (사용자가 직접 숫자만 말한 경우)
  const allNumbers = conversationContent.match(/\d+/g);
  let front6 = '';
  let back1 = '';
  
  if (allNumbers) {
    // 6자리 숫자 찾기 (앞 6자리)
    const sixDigitNumbers = allNumbers.filter(num => num.length === 6);
    if (sixDigitNumbers.length > 0) {
      front6 = sixDigitNumbers[0];
    }
    
    // 1자리 숫자 찾기 (뒷 1자리)
    const oneDigitNumbers = allNumbers.filter(num => num.length === 1);
    if (oneDigitNumbers.length > 0) {
      back1 = oneDigitNumbers[0];
    }
  }
  
  // 정규식으로 찾은 값이 있으면 우선 사용
  if (front6Match && back1Match) {
    front6 = front6Match[1];
    back1 = back1Match[1];
  }
  
  if (front6 && back1) {
    console.log(`🔍 주민번호 추출: ${front6}-${back1}******`);
    
    // 주민번호 검증
    const validation = validateResidentNumber(front6, back1);
    
    if (validation.isValid) {
      const parsedInfo = parseResidentNumber(front6, back1);
      console.log(`✅ 주민번호 검증 통과: ${parsedInfo.gender}, ${parsedInfo.age}대`);
      return {
        ...parsedInfo,
        isValid: true,
        extractedNumbers: { front6, back1 }
      };
    } else {
      console.log(`❌ 주민번호 검증 실패: ${validation.error}`);
      console.log(`📋 상세 정보: ${validation.details}`);
      return {
        gender: "남자", // 기본값
        age: 30, // 기본값
        isValid: false,
        validationError: validation.error,
        extractedNumbers: { front6, back1 }
      };
    }
  }
  
  // 주민번호를 찾을 수 없는 경우
  console.log('⚠️ 주민번호 정보를 찾을 수 없어 기본값 사용');
  return { 
    gender: "남자", 
    age: 30, 
    isValid: false,
    validationError: "주민번호 정보를 찾을 수 없습니다"
  };
}

// 데이터베이스 연결 테스트 함수
export async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('✅ 데이터베이스 연결 성공');
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error);
    return false;
  }
}

// 상담 데이터 저장 함수 - Upsert 방식으로 중복 저장 방지
export async function saveConsultationToDatabase(data: {
  source_id: string;
  consulting_content: string;
  consulting_date: string;
  consulting_time: string;
  metadata: {
    consulting_turns: string;
    consulting_length: number;
  };
}) {
  try {
    // 상담 내용에서 주민번호 정보 추출
    const clientInfo = extractClientInfoFromConversation(data.consulting_content);
    
    if (clientInfo.isValid) {
      console.log(`✅ 고객 정보 추출 성공: ${clientInfo.gender}, ${clientInfo.age}대`);
    } else {
      console.log(`⚠️ 고객 정보 추출 실패: ${clientInfo.validationError}`);
      console.log(`📋 기본값 사용: ${clientInfo.gender}, ${clientInfo.age}대`);
    }
    
    // 날짜 변환
    const consultingDate = new Date(data.consulting_date);
    
    // Upsert 방식으로 저장 (기존 데이터가 있으면 업데이트, 없으면 생성)
    const vocRaw = await prisma.vocRaw.upsert({
      where: {
        sourceId: data.source_id,
      },
      update: {
        clientGender: clientInfo.gender,
        clientAge: clientInfo.age,
        consultingContent: data.consulting_content,
        consultingDate: consultingDate,
        consultingTurns: parseInt(data.metadata.consulting_turns),
        consultingLength: data.metadata.consulting_length,
        updatedAt: new Date(),
      },
      create: {
        sourceId: data.source_id,
        clientGender: clientInfo.gender,
        clientAge: clientInfo.age,
        consultingContent: data.consulting_content,
        consultingDate: consultingDate,
        consultingTurns: parseInt(data.metadata.consulting_turns),
        consultingLength: data.metadata.consulting_length,
      },
    });

    console.log(`✅ 상담 데이터 저장 완료: ${data.source_id} (${vocRaw.createdAt === vocRaw.updatedAt ? '새로 생성' : '업데이트'})`);
    return vocRaw;
  } catch (error) {
    console.error('❌ 상담 데이터 저장 실패:', error);
    throw error;
  }
}

// 상담 데이터 조회 함수
export async function getConsultationById(sourceId: string) {
  try {
    console.log(`🔍 상담 데이터 조회 시작: ${sourceId}`);
    const vocRaw = await prisma.vocRaw.findUnique({
      where: { sourceId },
    });
    console.log(`✅ 상담 데이터 조회 완료: ${sourceId}`, vocRaw ? 'found' : 'not found');
    return vocRaw;
  } catch (error) {
    console.error('❌ 상담 데이터 조회 실패:', error);
    throw error;
  }
}

// 모든 상담 데이터 조회 함수
export async function getAllConsultations(page: number = 1, limit: number = 10) {
  try {
    console.log(`📋 전체 상담 데이터 조회 시작: page=${page}, limit=${limit}`);
    const skip = (page - 1) * limit;
    
    console.log(`🔍 Prisma 쿼리 실행: skip=${skip}, take=${limit}`);
    
    const [vocRaws, total] = await Promise.all([
      prisma.vocRaw.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vocRaw.count()
    ]);

    console.log(`✅ 상담 데이터 조회 완료: ${vocRaws.length}개 조회, 총 ${total}개`);

    return {
      vocRaws,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('❌ 상담 데이터 조회 실패:', error);
    console.error('❌ 오류 상세:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    throw error;
  }
}
// VoC 건수 집계 함수
export async function getVocCountSummary(period: 'daily' | 'weekly' | 'monthly', baseDate: string) {
  try {
    console.log(`📊 VoC 건수 집계 시작: period=${period}, baseDate=${baseDate}`);
    
    const base = new Date(baseDate);
    const baseYear = base.getFullYear();
    const baseMonth = base.getMonth();
    const baseDateNum = base.getDate();
    
    let currentStart: Date;
    let currentEnd: Date;
    let previousStart: Date;
    let previousEnd: Date;
    
    if (period === 'daily') {
      // 일별 집계
      currentStart = new Date(baseYear, baseMonth, baseDateNum, 0, 0, 0);
      currentEnd = new Date(baseYear, baseMonth, baseDateNum, 23, 59, 59);
      
      // 전일
      const prevDay = new Date(base);
      prevDay.setDate(prevDay.getDate() - 1);
      previousStart = new Date(prevDay.getFullYear(), prevDay.getMonth(), prevDay.getDate(), 0, 0, 0);
      previousEnd = new Date(prevDay.getFullYear(), prevDay.getMonth(), prevDay.getDate(), 23, 59, 59);
      
    } else if (period === 'weekly') {
      // 주별 집계 (월요일 시작)
      const dayOfWeek = base.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 일요일이면 -6, 아니면 1-dayOfWeek
      
      const monday = new Date(base);
      monday.setDate(monday.getDate() + mondayOffset);
      
      currentStart = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0);
      currentEnd = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59);
      
      // 전주
      const prevMonday = new Date(monday);
      prevMonday.setDate(prevMonday.getDate() - 7);
      previousStart = new Date(prevMonday.getFullYear(), prevMonday.getMonth(), prevMonday.getDate(), 0, 0, 0);
      previousEnd = new Date(prevMonday.getFullYear(), prevMonday.getMonth(), prevMonday.getDate() + 6, 23, 59, 59);
      
    } else { // monthly
      // 월별 집계
      currentStart = new Date(baseYear, baseMonth, 1, 0, 0, 0);
      currentEnd = new Date(baseYear, baseMonth + 1, 0, 23, 59, 59); // 다음 달 0일 = 이번 달 마지막 날
      
      // 전월
      previousStart = new Date(baseYear, baseMonth - 1, 1, 0, 0, 0);
      previousEnd = new Date(baseYear, baseMonth, 0, 23, 59, 59); // 이번 달 0일 = 전달 마지막 날
    }
    
    console.log(`📅 집계 기간 설정:`, {
      current: { start: currentStart, end: currentEnd },
      previous: { start: previousStart, end: previousEnd }
    });
    
    // 현재 기간과 이전 기간의 VoC 건수 조회 (중복 제거)
    const [currentCount, previousCount] = await Promise.all([
      prisma.vocRaw.count({
        where: {
          consultingDate: {
            gte: currentStart,
            lte: currentEnd
          }
        },
        distinct: ['sourceId'] // 중복 제거
      }),
      prisma.vocRaw.count({
        where: {
          consultingDate: {
            gte: previousStart,
            lte: previousEnd
          }
        },
        distinct: ['sourceId'] // 중복 제거
      })
    ]);
    
    // 증감률 계산
    const deltaPercent = previousCount > 0 
      ? ((currentCount - previousCount) / previousCount) * 100 
      : currentCount > 0 ? 100 : 0;
    
    console.log(`✅ VoC 건수 집계 완료:`, {
      period,
      baseDate,
      currentCount,
      previousCount,
      deltaPercent: deltaPercent.toFixed(1)
    });
    
    return {
      period,
      baseDate,
      currentCount,
      previousCount,
      deltaPercent: Math.round(deltaPercent * 10) / 10 // 소수점 첫째자리까지
    };
    
  } catch (error) {
    console.error('❌ VoC 건수 집계 실패:', error);
    throw error;
  }
}
