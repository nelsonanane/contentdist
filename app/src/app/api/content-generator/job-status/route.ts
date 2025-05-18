import { NextResponse } from 'next/server';
import { createAPIClient, getUserFromSession } from '@/lib/supabase-api';
import type { Database } from '@/lib/database.types';

export async function GET(request: Request) {
  try {
    // Get job ID from URL
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    // Validate job ID
    if (!id) {
      return NextResponse.json(
        { error: 'Missing job ID' },
        { status: 400 }
      );
    }
    
    // Get user from session
    const user = await getUserFromSession();
    
    // Check if user is authenticated
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Create Supabase client without cookies
    const supabase = await createAPIClient();
    
    // Get job status from database
    const { data, error } = await supabase
      .from('content_generator_jobs')
      .select('id, character_type, character_attributes, topic, status, script, image_url, audio_url, video_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve job status' },
        { status: 500 }
      );
    }
    
    // If no data returned, the job doesn't exist or doesn't belong to this user
    if (!data) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Return the job data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in job-status API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
