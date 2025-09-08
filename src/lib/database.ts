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
    // 상담 기본 정보 저장
    const vocRaw = await prisma.vocRaw.create({
      data: {
        sourceId: data.source_id,
        clientGender: "남자",
        clientAge: "40대",
        consultingContent: data.consulting_content,
        consultingDate: data.consulting_date,
        consultingTime: data.consulting_time,
        consultingTurns: data.metadata.consulting_turns,
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
    const vocRaw = await prisma.vocRaw.findUnique({
      where: { sourceId },
    });
    return vocRaw;
  } catch (error) {
    console.error('❌ 상담 데이터 조회 실패:', error);
    throw error;
  }
}

// 모든 상담 데이터 조회 함수 (페이지네이션)
export async function getAllConsultations(page: number = 1, limit: number = 10) {
  try {
    const skip = (page - 1) * limit;
    
    const [vocRaws, total] = await Promise.all([
      prisma.vocRaw.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vocRaw.count()
    ]);

    return {
      vocRaws,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('❌ 상담 데이터 조회 실패:', error);
    throw error;
  }
}
