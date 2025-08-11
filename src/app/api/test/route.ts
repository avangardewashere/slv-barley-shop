import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'API is working!',
    method: 'GET',
    timestamp: new Date().toISOString(),
    path: '/api/test'
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  
  return NextResponse.json({
    message: 'POST request received!',
    method: 'POST',
    timestamp: new Date().toISOString(),
    path: '/api/test',
    body: body
  });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}