import { NextResponse } from "next/server";
import { createAPIClient, getUserFromSession } from "@/lib/supabase-api";
import { generateImage } from "@/lib/openai";
import type { Database } from "@/lib/database.types";

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
      .select("id, character_type, character_attributes, topic, status, script")
      .eq("id", body.jobId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !job) {
      console.error("Error fetching job:", fetchError);
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Validate that we have a script
    if (!job.script) {
      return NextResponse.json(
        { error: "No script available for image generation" },
        { status: 400 }
      );
    }

    // Update job status
    const { error: updateError } = await supabase
      .from("content_generator_jobs")
      .update({ status: "generating_image" })
      .eq("id", job.id);

    if (updateError) {
      console.error("Error updating job status:", updateError);
      return NextResponse.json(
        { error: "Failed to update job status" },
        { status: 500 }
      );
    }

    try {
      // Use our OpenAI utility to generate an image of the character using GPT-image-1
      const attributes = job.character_attributes as Record<string, string>;

      // Craft a prompt that includes the character type, attributes, and the topic
      const prompt = `Create a photorealistic portrait of a ${job.character_type} character for a video podcast about ${job.topic}.
        ${job.character_type === 'baby' ? `The baby should be ${attributes.ethnicity} with ${attributes.babyHair} hair.` : ''}
        ${job.character_type === 'animal' ? `The ${attributes.species} should appear ${attributes.trait}.` : ''}
        ${job.character_type === 'historical' ? `The historical figure should be from the ${attributes.era} era and of ${attributes.nationality} origin.` : ''}
        The character should be centered in the frame with good lighting on a neutral background.
        Create a detailed and expressive face that conveys personality.`;

      // Generate the image using our utility function
      const { imageUrl, imageDescription } = await generateImage({
        characterType: job.character_type,
        characterAttributes: attributes,
        prompt,
      });

      // Update job with the saved image URL
      const { error: imageUpdateError } = await supabase
        .from("content_generator_jobs")
        .update({
          image_url: imageUrl,
          status: "generating_audio", // Move to the next step
        })
        .eq("id", job.id);

      if (imageUpdateError) {
        console.error("Error updating job with image:", imageUpdateError);
        return NextResponse.json(
          { error: "Failed to save generated image" },
          { status: 500 }
        );
      }

      // Return success
      return NextResponse.json({
        success: true,
        imageDescription: imageDescription, // This is now just a string from our utility
        imageUrl: imageUrl,
      });
    } catch (imageError) {
      console.error("Error generating image description:", imageError);

      // Update job status to error
      await supabase
        .from("content_generator_jobs")
        .update({
          status: "error",
          image_url: null,
        })
        .eq("id", job.id);

      return NextResponse.json(
        { error: "Failed to generate image description" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in generate-image API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
