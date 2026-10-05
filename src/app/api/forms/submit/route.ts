import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('[Dyno Form Submit] Received submission payload:', data);

    const submissionId = `sub_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

    return NextResponse.json({
      success: true,
      submissionId,
      timestamp: new Date().toISOString(),
      message: 'Form successfully submitted and processed!',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Submission failed' }, { status: 500 });
  }
}
