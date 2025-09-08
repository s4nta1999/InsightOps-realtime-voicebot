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
    session_id: string;
    start_time: string;
    end_time: string;
    duration: string;
  };
  messages?: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    agent?: string;
  }>;
}) {
  try {
    // 상담 기본 정보 저장
    const consultation = await prisma.consultation.create({
      data: {
        sourceId: data.source_id,
        consultingContent: data.consulting_content,
        consultingDate: data.consulting_date,
        consultingTime: data.consulting_time,
        consultingTurns: data.metadata.consulting_turns,
        consultingLength: data.metadata.consulting_length,
        sessionId: data.metadata.session_id,
        startTime: new Date(data.metadata.start_time),
        endTime: new Date(data.metadata.end_time),
        duration: data.metadata.duration,
      },
    });

    // 메시지들 저장 (있는 경우)
    if (data.messages && data.messages.length > 0) {
      await prisma.consultationMessage.createMany({
        data: data.messages.map((msg) => ({
          consultationId: consultation.id,
          messageId: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          agent: msg.agent || null,
        })),
      });
    }

    console.log(`✅ 상담 데이터 저장 완료: ${data.source_id}`);
    return consultation;
  } catch (error) {
    console.error('❌ 상담 데이터 저장 실패:', error);
    throw error;
  }
}

// 상담 데이터 조회 함수
export async function getConsultationById(sourceId: string) {
  try {
    const consultation = await prisma.consultation.findUnique({
      where: { sourceId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });
    return consultation;
  } catch (error) {
    console.error('❌ 상담 데이터 조회 실패:', error);
    throw error;
  }
}

// 모든 상담 데이터 조회 함수 (페이지네이션)
export async function getAllConsultations(page: number = 1, limit: number = 10) {
  try {
    const skip = (page - 1) * limit;
    
    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { messages: true }
          }
        }
      }),
      prisma.consultation.count()
    ]);

    return {
      consultations,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('❌ 상담 목록 조회 실패:', error);
    throw error;
  }
}

// 데이터베이스 연결 종료
export async function disconnectDatabase() {
  await prisma.$disconnect();
}
