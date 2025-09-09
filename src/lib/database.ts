import { PrismaClient } from '@prisma/client';

// Prisma 클라이언트 싱글톤 인스턴스
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// 주민번호 파싱 함수
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

// 주민번호 정보 추출 함수
function extractClientInfoFromConversation(conversationContent: string) {
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
    return parseResidentNumber(front6, back1);
  }
  
  // 주민번호를 찾을 수 없는 경우 기본값
  console.log('⚠️ 주민번호 정보를 찾을 수 없어 기본값 사용');
  return { gender: "남자", age: 30 }; // 기본값: 남자, 30대
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

// 상담 데이터 저장 함수
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
    
    console.log(`👤 고객 정보 추출: ${clientInfo.gender}, ${clientInfo.age}대`);
    
    // 날짜/시간 변환
    const consultingDate = new Date(data.consulting_date);
    const consultingTime = new Date(`1970-01-01T${data.consulting_time}`);
    
    // 상담 기본 정보 저장
    const vocRaw = await prisma.vocRaw.create({
      data: {
        sourceId: data.source_id,
        clientGender: clientInfo.gender,
        clientAge: clientInfo.age,
        consultingContent: data.consulting_content,
        consultingDate: consultingDate,
        consultingTime: consultingTime,
        consultingTurns: parseInt(data.metadata.consulting_turns),
        consultingLength: data.metadata.consulting_length,
      },
    });

    console.log(`✅ 상담 데이터 저장 완료: ${data.source_id}`);
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

// 모든 상담 데이터 조회 함수 (페이지네이션)
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