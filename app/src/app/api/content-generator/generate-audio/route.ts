import { NextResponse } from 'next/server';
import { createAPIClient, getUserFromSession } from '@/lib/supabase-api';
import type { Database } from '@/lib/database.types';
import { generateAudio, selectVoiceByCharacter } from '@/lib/elevenlabs';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

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
      .select('id, character_type, character_attributes, topic, status, script')
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

    // Validate that we have a script
    if (!job.script) {
      return NextResponse.json(
        { error: 'No script available for audio generation' },
        { status: 400 }
      );
    }
    
    // Update job status
    const { error: updateError } = await supabase
      .from('content_generator_jobs')
      .update({ status: 'generating_audio' })
      .eq('id', job.id);
    
    if (updateError) {
      console.error('Error updating job status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update job status' },
        { status: 500 }
      );
    }
    
    try {
      // Select appropriate voice based on character type
      const voiceId = selectVoiceByCharacter(
        job.character_type,
        job.character_attributes as Record<string, string>
      );
      
      // Generate audio from script
      const audioData = await generateAudio({
        text: job.script,
        voiceId
      });
      
      // Ensure uploads directory exists for saving audio files
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
      await mkdir(uploadsDir, { recursive: true });
      
      // Save the audio file with a unique filename
      const filename = `${uuidv4()}.mp3`;
      const filePath = path.join(uploadsDir, filename);
      await writeFile(filePath, audioData);
      
      // Create a URL for the audio file that can be accessed from the browser
      // and will also be used by Hedra for video generation
      const audioUrl = `/uploads/audio/${filename}`;
      
      // Update job with audio URL
      const { error: audioUpdateError } = await supabase
        .from('content_generator_jobs')
        .update({
          audio_url: audioUrl,
          status: 'generating_video' // Move to the next step
        })
        .eq('id', job.id);
      
      if (audioUpdateError) {
        console.error('Error updating job with audio:', audioUpdateError);
        return NextResponse.json(
          { error: 'Failed to save generated audio' },
          { status: 500 }
        );
      }
      
      // Return success
      return NextResponse.json({
        success: true,
        audioUrl: audioUrl
      });
    } catch (audioError) {
      console.error('Error generating audio:', audioError);
      
      // Update job status to error
      await supabase
        .from('content_generator_jobs')
        .update({
          status: 'error'
        })
        .eq('id', job.id);
      
      return NextResponse.json(
        { error: 'Failed to generate audio' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in generate-audio API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
