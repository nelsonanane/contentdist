import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ScriptGenerationParams {
  characterType: string;
  characterAttributes: Record<string, string>;
  topic: string;
}

interface ImageGenerationParams {
  characterType: string;
  characterAttributes: Record<string, string>;
  prompt?: string;
}

export async function generateImage({
  characterType,
  characterAttributes,
  prompt,
}: ImageGenerationParams): Promise<{
  imageUrl: string;
  imageDescription: string;
}> {
  try {
    // Create character description based on type and attributes
    let characterDescription = "";

    switch (characterType) {
      case "baby":
        characterDescription = `a ${characterAttributes.ethnicity} baby with ${characterAttributes.babyHair} hair`;
        break;
      case "animal":
        characterDescription = `a ${characterAttributes.trait} ${characterAttributes.species}`;
        break;
      case "historical":
        characterDescription = `a ${characterAttributes.nationality} person from the ${characterAttributes.era} era`;
        break;
      default:
        characterDescription = "an interesting character";
    }

    // Build a detailed prompt for image generation
    let imagePrompt;

    if (characterType === "baby") {
      // Use the specific baby prompt provided
      imagePrompt =
        prompt ||
        `Generate a high resolution image prompt of a very cute chubby ${characterAttributes.babyHair} hair ${characterAttributes.ethnicity} baby wearing large over-ear headphones speaking into a professional podcast microphone. The baby should be sitting in a professional podcast studio with appropriate lighting and background.`;
    } else if (characterType === "animal") {
      imagePrompt =
        prompt ||
        `Generate a high resolution image of a ${characterAttributes.trait} ${characterAttributes.species} wearing headphones in a podcast studio setup. The animal should be positioned in front of a professional microphone with proper studio lighting and podcast equipment visible in the background.`;
    } else if (characterType === "historical") {
      imagePrompt =
        prompt ||
        `Generate a high resolution image of a ${characterAttributes.nationality} historical figure from the ${characterAttributes.era} era sitting at a podcast setup with headphones and a professional microphone. Include period-appropriate elements while maintaining the modern podcast studio environment with proper lighting.`;
    } else {
      imagePrompt =
        prompt ||
        `Generate a high-quality, photorealistic portrait of ${characterDescription} in a professional podcast studio with headphones and microphone. The character should be centered in the frame with good lighting.`;
    }

    // Generate the image using gpt-image-1 in vertical format
    const result = await openai.images.generate({
      model: "gpt-image-1", // Using the correct model name
      prompt: imagePrompt,
      size: "1024x1536", // Using vertical format that's officially supported
      // gpt-image-1 doesn't support the response_format parameter at all
    });

    // Check if we have data from the API response
    if (!result.data || result.data.length === 0) {
      throw new Error("No data returned from OpenAI image generation");
    }

    // Check what format the response is in
    // gpt-image-1 might return data in different formats depending on the API version
    let imageBuffer;

    if (result.data[0].b64_json) {
      // If we have base64 data, use it
      const image_base64 = result.data[0].b64_json;
      imageBuffer = Buffer.from(image_base64, "base64");
    } else if (result.data[0].url) {
      // If we have a URL, throw an error for now (we'd need to fetch the image)
      throw new Error("URL format not supported in this implementation");
    } else {
      // If we don't have either format, throw an error
      throw new Error(
        "No image data returned from OpenAI in a recognized format"
      );
    }

    // imageBuffer is already defined and populated above

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "images");
    await mkdir(uploadsDir, { recursive: true });

    // Save the image with a unique filename
    const filename = `${Date.now()}-${characterType}.png`;
    const filePath = path.join(uploadsDir, filename);
    await writeFile(filePath, imageBuffer);

    // Return the URL to access the image from the browser
    return {
      imageUrl: `/uploads/images/${filename}`, // Path to the locally saved image
      imageDescription: result.data[0]?.revised_prompt || imagePrompt,
    };
  } catch (error) {
    console.error("OpenAI image generation error:", error);
    throw error;
  }
}

export async function generateScript({
  characterType,
  characterAttributes,
  topic,
}: ScriptGenerationParams): Promise<string> {
  try {
    // Create character description based on type and attributes
    let characterDescription = "";

    switch (characterType) {
      case "baby":
        characterDescription = `a ${characterAttributes.ethnicity} baby with ${characterAttributes.babyHair} hair`;
        break;
      case "animal":
        characterDescription = `a ${characterAttributes.trait} ${characterAttributes.species}`;
        break;
      case "historical":
        characterDescription = `a ${characterAttributes.nationality} person from the ${characterAttributes.era} era`;
        break;
      default:
        characterDescription = "an interesting character";
    }

    // Generate the script using GPT-4.1
    let systemPrompt;
    let userPrompt;

    if (characterType === "baby") {
      systemPrompt = `You are an expert scriptwriter specializing in creating humorous, educational, and engaging podcast scripts. 
        Your task is to write a 1-2 minute entertaining monologue from the perspective of a ${characterAttributes.ethnicity} baby with ${characterAttributes.babyHair} hair.
        The monologue should be in first person with cute baby mispronunciations and simple vocabulary, focusing on the topic provided.
        Make it adorable, innocent, and funny - as if a baby is attempting to explain a complex topic.`;
    } else if (characterType === "animal") {
      systemPrompt = `You are an expert scriptwriter specializing in creating humorous, educational, and engaging podcast scripts. 
        Your task is to write a 1-2 minute entertaining monologue from the perspective of a ${characterAttributes.trait} ${characterAttributes.species}.
        The monologue should incorporate animal-specific mannerisms, perspectives, and references related to the species.
        Make it both humorous and informative, with the animal bringing its unique point of view to the topic.`;
    } else if (characterType === "historical") {
      systemPrompt = `You are an expert scriptwriter specializing in creating humorous, educational, and engaging podcast scripts. 
        Your task is to write a 1-2 minute entertaining monologue from the perspective of a ${characterAttributes.era} era ${characterAttributes.nationality} historical figure.
        Use period-appropriate language, references, and viewpoints while still making it accessible to modern audiences.
        The historical figure should bring their unique perspective to the contemporary topic, creating both humor and insight.`;
    } else {
      // Default prompt
      systemPrompt = `You are an expert scriptwriter specializing in creating humorous, educational, and engaging podcast scripts. 
        Your task is to write a 1-2 minute entertaining monologue from the perspective of ${characterDescription}.
        The monologue should be in the first person and focus on the topic provided.`;
    }

    // Use the Joe Rogan style prompt for all character types
    userPrompt = `Generate a podcast-style monologue in the style of Joe Rogan, discussing the topic of ${topic}. Ensure the tone is casual, intense, and slightly conspiratorial, with tangents, unexpected analogies, and the characteristic Joe Rogan style of pondering deep existential questions.

Avoid line breaks, special characters, or formatting that would invalidate the JSON structure. Keep it flowing naturally as if it's a segment from a podcast episode.
Ensure the entire monologue is output as a single JSON object called Podcast and is ONLY 500 characters long.`;

    // Add character-specific context if needed
    if (characterType === "historical") {
      systemPrompt += `\n\nThe monologue should be from the perspective of a ${characterAttributes.nationality} ${characterAttributes.era} era figure, with period-appropriate references while maintaining Joe Rogan's style.`;
    } else if (characterType === "baby") {
      systemPrompt += `\n\nThe monologue should be from the perspective of a baby but in Joe Rogan's style - imagine Joe Rogan pretending to be a baby while still sounding like himself.`;
    } else if (characterType === "animal") {
      systemPrompt += `\n\nThe monologue should be from the perspective of a ${characterAttributes.species} but in Joe Rogan's style - imagine Joe Rogan taking on the personality of this animal while still sounding like himself.`;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return (
      completion.choices[0].message.content ||
      "Failed to generate script content."
    );
  } catch (error) {
    console.error("OpenAI script generation error:", error);
    throw error;
  }
}
