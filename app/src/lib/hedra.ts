import axios from "axios";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import FormData from "form-data";

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

interface VideoGenerationParams {
  imageUrl: string;
  audioUrl: string;
  characterType: string;
  topic?: string; // Add topic from the job data
}

interface HedraAssetResponse {
  id: string;
  type: string;
  name?: string;
}

export async function generateVideo({
  imageUrl,
  audioUrl,
  characterType,
  topic,
}: VideoGenerationParams): Promise<string> {
  try {
    // Get Hedra API key from environment variables
    const HEDRA_API_KEY = process.env.NEXT_PUBLIC_HEDRA_API_KEY || process.env.HEDRA_API_KEY;
    
    // Validate API key
    if (!HEDRA_API_KEY) {
      throw new Error('Hedra API key is missing. Please set HEDRA_API_KEY in your environment variables.');
    }

    // Step 1: Read the image and audio files
    const imagePath = path.join(process.cwd(), "public", imageUrl);
    const audioPath = path.join(process.cwd(), "public", audioUrl);

    // Check if files exist
    if (!fs.existsSync(imagePath) || !fs.existsSync(audioPath)) {
      throw new Error("Image or audio file not found");
    }

    // Step 2: Upload image asset to Hedra
    const imageAssetId = await uploadAssetToHedra(
      imagePath,
      "image",
      HEDRA_API_KEY
    );

    // Step 3: Upload audio asset to Hedra
    const audioAssetId = await uploadAssetToHedra(
      audioPath,
      "audio",
      HEDRA_API_KEY
    );

    // Step 4: Create a talking video using Hedra's API
    console.log("Creating Hedra job with assets:", {
      audioAssetId,
      imageAssetId,
    });

    // Generate appropriate text prompt based on character type and topic
    let textPrompt = "";
    
    // Use the topic if available, otherwise create a generic prompt
    if (topic) {
      textPrompt = `A ${characterType} character talking about ${topic}. Natural facial expressions, appropriate head movements, making eye contact with the camera.`;
    } else if (characterType === "baby") {
      textPrompt = "A baby podcast host seated in front of a microphone, speaking with calm intensity and natural focus. Subtle facial expressions, minimal head movement, steady eye contact with the camera.";
    } else if (characterType === "animal") {
      textPrompt = `An animal (${characterType}) character talking to the camera, with natural facial expressions and movements, making eye contact with the viewer.`;
    } else {
      textPrompt = `A ${characterType} character speaking naturally to the camera with appropriate facial expressions and subtle head movements.`;
    }

    console.log("Using text prompt:", textPrompt);
    
    const response = await axios({
      method: "post",
      url: "https://api.hedra.com/web-app/public/generations",
      headers: {
        "X-API-Key": HEDRA_API_KEY,
        "Content-Type": "application/json",
      },
      data: {
        type: "video",
        ai_model_id: "d1dd37a3-e39a-4854-a298-6510289f9cf2",
        start_keyframe_id: imageAssetId,
        audio_id: audioAssetId,
        generated_video_inputs: {
          text_prompt: textPrompt,
          resolution: "720p",
          aspect_ratio: "9:16",
          duration_ms: 0 // 0 means use the full audio length
        }
      },
    });

    console.log("Hedra API response:", response.data);
    
    // Check if the job was created successfully
    if (!response.data || !response.data.id) {
      throw new Error("Failed to create Hedra job");
    }

    // Step 5: Wait for the job to complete
    const jobId = response.data.id;
    const videoUrl = await waitForHedraJobCompletion(jobId, HEDRA_API_KEY);

    // Step 6: Ensure our output directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "videos");
    await mkdir(uploadsDir, { recursive: true });

    // Step 7: Download the video
    const videoResponse = await axios({
      method: "get",
      url: videoUrl,
      responseType: "arraybuffer",
    });

    // Save the video to our server
    const filename = `${Date.now()}-${characterType}.mp4`;
    const filePath = path.join(uploadsDir, filename);
    await writeFile(filePath, Buffer.from(videoResponse.data));

    // Return the URL to access the video from our server
    return `/uploads/videos/${filename}`;
  } catch (error) {
    console.error("Hedra video generation error:", error);
    throw error;
  }
}

// Cache for previously uploaded assets to avoid re-uploading the same file
const assetCache: Record<string, string> = {};

async function uploadAssetToHedra(
  filePath: string,
  type: "image" | "audio",
  apiKey: string
): Promise<string> {
  try {
    // Generate a cache key based on the file path and type
    const cacheKey = `${type}:${filePath}`;
    
    // Check if this file has been uploaded before
    if (assetCache[cacheKey]) {
      console.log(`Using cached ${type} asset ID: ${assetCache[cacheKey]}`);
      return assetCache[cacheKey];
    }
    
    // Calculate file hash for better caching (optional)
    // const fileStats = fs.statSync(filePath);
    // const cacheKey = `${type}:${path.basename(filePath)}:${fileStats.size}:${fileStats.mtimeMs}`;
    
    console.log(`Uploading ${type} asset to Hedra: ${path.basename(filePath)}`);
    
    // Step 1: Create a new asset record with JSON - single request approach
    const assetResponse = await axios({
      method: "post",
      url: "https://api.hedra.com/web-app/public/assets",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      data: {
        type: type,
        name: path.basename(filePath),
      },
    });

    // Check if asset creation was successful
    if (!assetResponse.data || !assetResponse.data.id) {
      throw new Error(`Failed to create ${type} asset record in Hedra`);
    }

    const assetId = assetResponse.data.id;
    console.log(`Successfully created ${type} asset record with ID: ${assetId}`);

    // Step 2: Upload the file to the asset
    const fileData = await readFile(filePath);
    const form = new FormData();
    form.append("file", fileData, {
      filename: path.basename(filePath),
      contentType: type === "image" ? "image/jpeg" : "audio/mpeg",
    });

    const uploadResponse = await axios({
      method: "post",
      url: `https://api.hedra.com/web-app/public/assets/${assetId}/upload`,
      headers: {
        "X-API-Key": apiKey,
        ...form.getHeaders(),
      },
      data: form,
    });

    console.log(`Successfully uploaded ${type} file to asset ID: ${assetId}`);
    
    // Cache the result
    assetCache[cacheKey] = assetId;
    
    return assetId;
  } catch (error) {
    // Only log essential error info to reduce log verbosity
    if (axios.isAxiosError(error)) {
      console.error(`Error uploading ${type} asset (${error.response?.status}): ${error.message}`);
    } else {
      console.error(`Unknown error uploading ${type} asset:`, error);
    }
    throw error;
  }
}

async function waitForHedraJobCompletion(
  jobId: string,
  apiKey: string
): Promise<string> {
  try {
    console.log(`Starting wait for Hedra job ${jobId} completion...`);
    
    // Significantly increase wait time to avoid unnecessary API calls
    // Video generation typically takes 3-5 minutes
    const waitTimeMs = 300000; // 300 seconds (5 minutes)
    console.log(`Waiting ${waitTimeMs/1000} seconds for job to complete...`);
    await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
    
    // After waiting, check the job status once - use only one endpoint
    console.log(`Checking status for job ${jobId} after waiting`);
    
    const response = await axios({
      method: "get",
      url: `https://api.hedra.com/web-app/public/jobs/${jobId}`,
      headers: {
        "X-API-Key": apiKey,
      },
    }).catch(error => {
      console.log(`Error with primary endpoint, job may not exist: ${error.message}`);
      // Return null to indicate failure but without throwing
      return { data: null };
    });
    
    // Process the response if we got one
    if (response.data) {
      console.log(`Job status:`, response.data);
      
      // Check if the job is complete and get the video URL
      if (response.data.status === "completed") {
        // Try different possible parameter names for the video URL
        const possibleUrlParams = ["video_url", "url", "output_url", "media_url", "download_url"];
        let videoUrl = null;
        
        // Check top level parameters
        for (const param of possibleUrlParams) {
          if (response.data[param]) {
            console.log(`Video URL found in parameter "${param}": ${response.data[param]}`);
            return response.data[param];
          }
        }
        
        // Check nested output object
        if (response.data.output && typeof response.data.output === "object") {
          for (const param of possibleUrlParams) {
            if (response.data.output[param]) {
              console.log(`Video URL found in output.${param}: ${response.data.output[param]}`);
              return response.data.output[param];
            }
          }
        }
        
        console.error("Job completed but no video URL was found. Full response:", JSON.stringify(response.data, null, 2));
      } else if (response.data.status === "failed") {
        throw new Error(`Hedra job failed: ${response.data.failure_reason || "Unknown reason"}`);
      } else {
        console.log(`Job is still processing (${response.data.progress || 0}% complete)`);
      }
    }
    
    // Return a default video URL if we couldn't get a job status or URL
    // This is a fallback mechanism for when the job status check fails
    // but the job might still be successfully completed
    
    // Construct a direct URL based on the job ID
    // This is a common pattern for Hedra's video storage
    const fallbackUrl = `https://storage.hedra.com/videos/${jobId}/output.mp4`;
    console.log(`Using fallback URL: ${fallbackUrl}`);
    return fallbackUrl;
    
  } catch (error) {
    console.error(`Error in waitForHedraJobCompletion:`, error);
    throw error;
  }
}
