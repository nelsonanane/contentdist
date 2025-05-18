import { NextResponse } from "next/server";
import { createAPIClient, getUserFromSession } from "@/lib/supabase-api";
import type { Database } from "@/lib/database.types";
import { generateVideo } from "@/lib/hedra";

export const maxDuration = 300; // 5 minutes timeout for this API route

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();

    // Validate job ID
    if (!body.jobId) {
      return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
    }

    // Get user from session
    const user = await getUserFromSession();

    // Check if user is authenticated
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create Supabase client without cookies
    const supabase = await createAPIClient();

    // Get job data from database
    const { data: job, error: fetchError } = await supabase
      .from("content_generator_jobs")
      .select(
        "id, character_type, character_attributes, topic, status, image_url, audio_url"
      )
      .eq("id", body.jobId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !job) {
      console.error("Error fetching job:", fetchError);
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Validate that we have image and audio URLs
    if (!job.image_url || !job.audio_url) {
      return NextResponse.json(
        { error: "Missing image or audio for video generation" },
        { status: 400 }
      );
    }

    console.log(`Processing video generation for job ${job.id}`);
    
    // Immediately respond to the client to prevent timeout issues
    // This allows the API route to continue processing in the background
    // without waiting for completion to send a response
    const responsePromise = NextResponse.json({
      success: true,
      message: "Video generation started",
      jobId: job.id
    });
    
    // Process the video generation without blocking the response
    try {
      // Generate video using Hedra (this will take a while)
      console.log(`Starting Hedra video generation for job ${job.id}`);
      const videoUrl = await generateVideo({
        imageUrl: job.image_url,
        audioUrl: job.audio_url,
        characterType: job.character_type,
        topic: job.topic, // Include topic if available
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
        // Update job status to error
        await supabase
          .from("content_generator_jobs")
          .update({
            status: "error",
          })
          .eq("id", job.id);
      }
    } catch (error) {
      const videoError = error as Error;
      console.error(`Error generating video for job ${job.id}:`, videoError);

      // Update job status to error
      await supabase
        .from("content_generator_jobs")
        .update({
          status: "error",
          error_message: videoError.message || "Unknown error during video generation"
        })
        .eq("id", job.id);
    }
    
    // Return the immediate response
    return responsePromise;
  } catch (error) {
    console.error("Error in generate-video API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
