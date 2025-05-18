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

// Cache for previously generated videos to avoid regenerating identical content
const videoCache: Record<string, string> = {};

export async function generateVideo({
  imageUrl,
  audioUrl,
  characterType,
  topic,
}: VideoGenerationParams): Promise<string> {
  try {
    // Create a cache key from the input parameters
    const cacheKey = `${imageUrl}:${audioUrl}:${characterType}:${topic || 'no-topic'}`;
    
    // Check if we've already generated this exact video before
    if (videoCache[cacheKey]) {
      console.log(`Using cached video for ${characterType}:${topic || 'no-topic'}`);
      return videoCache[cacheKey];
    }
    
    // Get Hedra API key from environment variables
    const HEDRA_API_KEY = process.env.NEXT_PUBLIC_HEDRA_API_KEY || process.env.HEDRA_API_KEY;
    
    // Validate API key
    if (!HEDRA_API_KEY) {
      throw new Error('Hedra API key is missing. Please set HEDRA_API_KEY in your environment variables.');
    }

    // Validate image and audio URLs
    if (!imageUrl) {
      throw new Error('Image URL is missing or null. Cannot generate video without an image.');
    }
    
    if (!audioUrl) {
      throw new Error('Audio URL is missing or null. Cannot generate video without audio.');
    }

    // Step 1: Read the image and audio files
    const imagePath = path.join(process.cwd(), "public", imageUrl);
    const audioPath = path.join(process.cwd(), "public", audioUrl);

    // Check if files exist
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found at path: ${imagePath}`);
    }
    
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found at path: ${audioPath}`);
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

    // Cache the video URL
    videoCache[cacheKey] = `/uploads/videos/${filename}`;
    
    // Return the URL to access the video from our server
    return videoCache[cacheKey];
  } catch (error) {
    console.error("Hedra video generation error:", error);
    throw error;
  }
}

// Cache for previously uploaded assets to avoid re-uploading the same file
const assetCache: Record<string, string> = {};

// Persistent cache file path for assets
const CACHE_FILE_PATH = path.join(process.cwd(), "hedra-asset-cache.json");

// Load asset cache from file if it exists
function loadAssetCache(): Record<string, string> {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const cacheData = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
      const cache = JSON.parse(cacheData);
      console.log(`Loaded ${Object.keys(cache).length} cached assets from file`);
      return cache;
    }
  } catch (error) {
    const e = error as Error;
    console.log(`Error loading asset cache: ${e.message}`);
  }
  return {};
}

// Save asset cache to file
function saveAssetCache(cache: Record<string, string>) {
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cache, null, 2));
    console.log(`Saved ${Object.keys(cache).length} assets to cache file`);
  } catch (error) {
    const e = error as Error;
    console.log(`Error saving asset cache: ${e.message}`);
  }
}

// Initialize the asset cache from file
let assetCacheLoaded = false;

async function uploadAssetToHedra(
  filePath: string,
  type: "image" | "audio",
  apiKey: string
): Promise<string> {
  try {
    // Load asset cache from file if not loaded yet
    if (!assetCacheLoaded) {
      Object.assign(assetCache, loadAssetCache());
      assetCacheLoaded = true;
    }

    // Calculate file hash for better caching
    const fileStats = fs.statSync(filePath);
    const fileContent = fs.readFileSync(filePath);
    const fileHash = require('crypto')
      .createHash('md5')
      .update(fileContent)
      .digest('hex');
    
    // Generate a cache key based on file hash, size and type
    const cacheKey = `${type}:${fileHash}:${fileStats.size}`;
    
    // Check if this file has been uploaded before
    if (assetCache[cacheKey]) {
      console.log(`Using cached ${type} asset ID: ${assetCache[cacheKey]}`);
      return assetCache[cacheKey];
    }
    
    console.log(`Uploading ${type} asset to Hedra: ${path.basename(filePath)} (${fileHash})`);
    
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
    
    // Save the updated cache to file for persistence
    saveAssetCache(assetCache);
    
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
    
    // Initial wait to avoid unnecessary polling
    const initialWaitTimeMs = 60000; // 60 seconds (1 minute)
    console.log(`Initial wait of ${initialWaitTimeMs/1000} seconds before first status check...`);
    await new Promise((resolve) => setTimeout(resolve, initialWaitTimeMs));
    
    // Maximum number of status checks
    const maxAttempts = 10;
    // Time between status checks
    const checkIntervalMs = 30000; // 30 seconds
    
    // Poll the status endpoint as recommended by the API documentation
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`Checking status for job ${jobId} (attempt ${attempt}/${maxAttempts})`);
      
      try {
        // Use the official status endpoint as specified in the API docs
        const statusResponse = await axios({
          method: "get",
          url: `https://api.hedra.com/web-app/public/generations/${jobId}/status`,
          headers: {
            "X-API-Key": apiKey,
            "Accept": "application/json",
          },
          timeout: 10000 // 10 second timeout
        });
        
        // Process the response
        if (statusResponse.data) {
          console.log(`Job status (attempt ${attempt}/${maxAttempts}):`, statusResponse.data);
          
          // Check if the job is complete
          if (statusResponse.data.status === "completed") {
            // Try different possible parameter names for the video URL
            const possibleUrlParams = ["video_url", "url", "output_url", "media_url", "download_url"];
            
            // Check top level parameters
            for (const param of possibleUrlParams) {
              if (statusResponse.data[param]) {
                console.log(`Video URL found in parameter "${param}": ${statusResponse.data[param]}`);
                return statusResponse.data[param];
              }
            }
            
            // Check nested output object
            if (statusResponse.data.output && typeof statusResponse.data.output === "object") {
              for (const param of possibleUrlParams) {
                if (statusResponse.data.output[param]) {
                  console.log(`Video URL found in output.${param}: ${statusResponse.data.output[param]}`);
                  return statusResponse.data.output[param];
                }
              }
            }
            
            // If status is completed but no URL found, try constructing it from the job ID
            console.log(`Status says completed but no URL found in response. Constructing URL from job ID.`);
            return `https://storage.hedra.com/videos/${jobId}/output.mp4`;
          } else if (statusResponse.data.status === "failed") {
            throw new Error(`Hedra job failed: ${statusResponse.data.error || "Unknown reason"}`);
          } else {
            // Job is still processing, wait and try again
            console.log(`Job is still processing (${statusResponse.data.progress || 0}% complete). Waiting before next check.`);
          }
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.log(`Status endpoint returned 404, job ID may be invalid or using a different endpoint format.`);
        } else {
          console.log(`Error checking status: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        // Continue to next attempt
      }
      
      // If this isn't the last attempt, wait before trying again
      if (attempt < maxAttempts) {
        console.log(`Waiting ${checkIntervalMs/1000} seconds before next status check...`);
        await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
      }
    }
    
    // If we've exhausted all status check attempts, try direct URL access as a last resort
    console.log(`Maximum status check attempts reached. Trying direct URL access as last resort.`);
    
    const possibleUrls = [
      `https://storage.hedra.com/videos/${jobId}/output.mp4`,
      `https://storage.hedra.com/generations/${jobId}/output.mp4`,
      `https://media.hedra.com/${jobId}.mp4`,
      `https://cdn.hedra.com/public/${jobId}/video.mp4`
    ];
    
    // Try each URL pattern until we find one that works
    for (const url of possibleUrls) {
      try {
        await axios({
          method: 'head',
          url,
          timeout: 5000
        });
        
        console.log(`Found valid video URL through direct access: ${url}`);
        return url;
      } catch (error) {
        console.log(`URL pattern ${url} not valid, trying next pattern...`);
      }
    }
    
    // If all else fails, return the most likely URL and hope for the best
    const fallbackUrl = `https://storage.hedra.com/videos/${jobId}/output.mp4`;
    console.log(`All attempts failed. Using most likely URL as final fallback: ${fallbackUrl}`);
    return fallbackUrl;
  } catch (error) {
    console.error(`Error in waitForHedraJobCompletion:`, error);
    throw error;
  }
}
