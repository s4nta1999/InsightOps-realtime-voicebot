import { NextResponse } from "next/server";
import { testDatabaseConnection } from "@/lib/database";

export async function GET() {
  try {
    // 데이터베이스 연결 테스트
    const dbConnected = await testDatabaseConnection();
    
    const status: Record<string, unknown> = {
      ok: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: dbConnected,
        url: process.env.DATABASE_URL ? 'configured' : 'not configured',
        storage_mode: process.env.STORAGE_MODE || 'development'
      },
      environment: {
        node_env: process.env.NODE_ENV,
        websites_port: process.env.WEBSITES_PORT
      }
    };

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}