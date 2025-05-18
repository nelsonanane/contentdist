import { NextResponse } from 'next/server';
import { createAPIClient, getUserFromSession } from '@/lib/supabase-api';
import type { Database } from '@/lib/database.types';
import { generateScript } from '@/lib/openai';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    
    // Validate job ID
    if (!body.jobId) {
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
    
    // Get job data from database
    const { data: job, error: fetchError } = await supabase
      .from('content_generator_jobs')
      .select('id, character_type, character_attributes, topic, status')
      .eq('id', body.jobId)
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !job) {
      console.error('Error fetching job:', fetchError);
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Update job status
    const { error: updateError } = await supabase
      .from('content_generator_jobs')
      .update({ status: 'generating_script' })
      .eq('id', job.id);
    
    if (updateError) {
      console.error('Error updating job status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update job status' },
        { status: 500 }
      );
    }
    
    // Generate script
    try {
      const script = await generateScript({
        characterType: job.character_type,
        characterAttributes: job.character_attributes as Record<string, string>,
        topic: job.topic
      });
      
      // Update job with generated script
      const { error: scriptUpdateError } = await supabase
        .from('content_generator_jobs')
        .update({
          script,
          status: 'generating_image' // Move to the next step
        })
        .eq('id', job.id);
      
      if (scriptUpdateError) {
        console.error('Error updating job with script:', scriptUpdateError);
        return NextResponse.json(
          { error: 'Failed to save generated script' },
          { status: 500 }
        );
      }
      
      // Return success
      return NextResponse.json({
        success: true,
        script
      });
    } catch (scriptError) {
      console.error('Error generating script:', scriptError);
      
      // Update job status to error
      await supabase
        .from('content_generator_jobs')
        .update({
          status: 'error',
          script: 'Failed to generate script'
        })
        .eq('id', job.id);
      
      return NextResponse.json(
        { error: 'Failed to generate script' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in generate-script API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
