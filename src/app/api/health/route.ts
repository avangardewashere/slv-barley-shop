import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { VERSION_INFO } from '@/lib/version';

export async function GET() {
  try {
    // Check database connectivity
    await connectDB();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      api: VERSION_INFO,
      services: {
        database: 'connected',
        api: 'operational',
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    
    const healthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      api: VERSION_INFO,
      services: {
        database: 'disconnected',
        api: 'operational',
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      error: process.env.NODE_ENV === 'development' ? error : 'Database connectivity issues',
    };

    return NextResponse.json(healthStatus, { status: 503 });
  }
}