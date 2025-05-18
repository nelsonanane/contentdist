import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createAPIClient, getUserFromSession } from '@/lib/supabase-api';
import type { Database } from '@/lib/database.types';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.characterType || !body.topic || !body.attributes) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
    
    // Generate a unique ID for the job
    const jobId = uuidv4();
    
    // Create a new entry in the content_generator_jobs table
    const { data, error } = await supabase
      .from('content_generator_jobs')
      .insert({
        id: jobId,
        user_id: user.id,
        character_type: body.characterType,
        character_attributes: body.attributes,
        topic: body.topic,
        status: 'pending'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      );
    }
    
    // Return the job ID
    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error('Error in submit-form API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
