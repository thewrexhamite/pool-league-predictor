import { NextResponse } from 'next/server';

export async function GET() {
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'googleai/gemini-2.0-flash';

  return NextResponse.json({
    configured: hasApiKey,
    model: hasApiKey ? model : null,
    message: hasApiKey
      ? 'AI features are configured and ready.'
      : 'AI features are not currently available.',
  });
}
