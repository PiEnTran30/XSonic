import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  try {
    // Revalidate all paths
    revalidatePath('/', 'layout');
    
    return NextResponse.json({ 
      revalidated: true, 
      now: Date.now() 
    });
  } catch (err) {
    return NextResponse.json({ 
      revalidated: false, 
      error: 'Failed to revalidate' 
    }, { status: 500 });
  }
}

