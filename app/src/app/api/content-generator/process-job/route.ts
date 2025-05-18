import { NextResponse } from 'next/server';
import { createAPIClient, getUserFromSession } from '@/lib/supabase-api';
import type { Database } from '@/lib/database.types';

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
      .select('id, status')
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
    
    // Start processing the job by generating the script
    try {
      // Step 1: Generate Script
      const scriptResponse = await fetch(new URL('/api/content-generator/generate-script', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ jobId: job.id })
      });
      
      if (!scriptResponse.ok) {
        const scriptError = await scriptResponse.json();
        throw new Error(scriptError.error || 'Failed to generate script');
      }
      
      // Step 2: Generate Image
      const imageResponse = await fetch(new URL('/api/content-generator/generate-image', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ jobId: job.id })
      });
      
      if (!imageResponse.ok) {
        const imageError = await imageResponse.json();
        throw new Error(imageError.error || 'Failed to generate image');
      }
      
      // Step 3: Generate Audio
      const audioResponse = await fetch(new URL('/api/content-generator/generate-audio', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ jobId: job.id })
      });
      
      if (!audioResponse.ok) {
        const audioError = await audioResponse.json();
        throw new Error(audioError.error || 'Failed to generate audio');
      }
      
      // Step 4: Generate Video - Use asynchronous approach to avoid timeout errors
      // Update job status to indicate video generation is in progress
      const { error: updateError } = await supabase
        .from("content_generator_jobs")
        .update({ status: "generating_video" })
        .eq("id", job.id);
      
      if (updateError) {
        console.error("Error updating job status:", updateError);
        throw new Error("Failed to update job status");
      }
      
      // Start video generation process in the background without waiting for it to complete
      // Use setTimeout with 0 delay to run this asynchronously after the current execution context
      setTimeout(async () => {
        try {
          // Call generate-video endpoint without waiting for it to complete
          const videoResponse = await fetch(new URL('/api/content-generator/generate-video', request.url).toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({ jobId: job.id })
          });
          
          if (!videoResponse.ok) {
            const videoError = await videoResponse.json();
            console.error("Background video generation failed:", videoError);
            // We don't throw here because this is running in the background
          }
        } catch (error) {
          console.error("Background video generation error:", error);
          // We don't throw here because this is running in the background
        }
      }, 0);
      
      // Continue without waiting for video generation to complete
      
      // Return success
      return NextResponse.json({
        success: true,
        message: 'Job processing completed successfully',
        jobId: job.id
      });
    } catch (processingError) {
      console.error('Error processing job:', processingError);
      
      // Update job status to error if an exception occurred
      await supabase
        .from('content_generator_jobs')
        .update({
          status: 'error'
        })
        .eq('id', job.id);
      
      return NextResponse.json(
        { error: processingError instanceof Error ? processingError.message : 'Failed to process job' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in process-job API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
