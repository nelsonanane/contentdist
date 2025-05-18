import { NextResponse } from 'next/server';
import { createAPIClient, getUserFromSession } from '@/lib/supabase-api';
import { generateVideo } from '@/lib/hedra';
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
      .select('id, status, character_type, topic, image_url, audio_url, script, video_url')
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
      // Use the video generation function imported at the top of the file
      
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
      // We'll use a worker thread or background task pattern instead of setTimeout
      // Create a background task manually
      const backgroundTask = async () => {
        try {
          console.log(`Starting background video generation for job ${job.id}`);
          
          // IMPORTANT: Re-fetch the job data to ensure we have the most up-to-date image_url and audio_url
          // This addresses the issue where the background task starts with stale data
          const { data: updatedJob, error: refetchError } = await supabase
            .from('content_generator_jobs')
            .select('id, status, character_type, topic, image_url, audio_url, script, video_url')
            .eq('id', job.id)
            .single();
            
          if (refetchError || !updatedJob) {
            console.error('Error re-fetching job data:', refetchError);
            await supabase
              .from("content_generator_jobs")
              .update({
                status: "error",
                error_message: "Failed to retrieve updated job data for video generation"
              })
              .eq("id", job.id);
            return; // Exit early
          }
          
          // Use the updated job data instead of potentially stale data
          const currentJob = updatedJob;
          
          // Validate that we have both image and audio URLs before proceeding
          if (!currentJob.image_url || !currentJob.audio_url) {
            console.error(`Cannot generate video for job ${currentJob.id}: Missing required assets`);
            console.error(`Image URL: ${currentJob.image_url || 'missing'}, Audio URL: ${currentJob.audio_url || 'missing'}`);
            
            // Update job status to error
            await supabase
              .from("content_generator_jobs")
              .update({
                status: "error",
                error_message: `Cannot generate video: ${!currentJob.image_url ? 'Missing image' : 'Missing audio'}`
              })
              .eq("id", currentJob.id);
              
            return; // Exit early, don't attempt video generation
          }
          
          // Generate video directly using the Hedra library
          const videoUrl = await generateVideo({
            imageUrl: currentJob.image_url,
            audioUrl: currentJob.audio_url,
            characterType: currentJob.character_type,
            topic: currentJob.topic, // Include topic if available
          });
          
          console.log(`Video generation completed for job ${job.id}, updating database with URL: ${videoUrl}`);
          
          // Update job with video URL and mark as completed
          const { error: videoUpdateError } = await supabase
            .from("content_generator_jobs")
            .update({
              video_url: videoUrl,
              status: "completed",
            })
            .eq("id", job.id);
            
          if (videoUpdateError) {
            console.error(`Error updating job ${job.id} with video:`, videoUpdateError);
          }
        } catch (error) {
          console.error("Background video generation error:", error);
          
          // Update job status to error
          try {
            await supabase
              .from("content_generator_jobs")
              .update({
                status: "error",
                error_message: error instanceof Error ? error.message : 'Unknown error'
              })
              .eq("id", job.id);
          } catch (dbError) {
            console.error("Failed to update job status to error:", dbError);
          }
        }
      };
      
      // Start the background task without waiting for it
      backgroundTask().catch(error => {
        console.error(`Unhandled error in background task for job ${job.id}:`, error);
      });
      
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
