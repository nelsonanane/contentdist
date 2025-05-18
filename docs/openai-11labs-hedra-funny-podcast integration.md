# Streamlined Guide: Next.js + OpenAI + Eleven Labs + Hedra Video Generation

This guide provides a precise, step-by-step workflow for creating a Next.js application that generates videos from form inputs using OpenAI for script and image generation, Eleven Labs for audio generation, and Hedra for the final video creation.

## Table of Contents

1. [Project Setup](#project-setup)
2. [Form Creation](#form-creation)
3. [OpenAI Integration](#openai-integration)
4. [Eleven Labs Integration](#eleven-labs-integration)
5. [Hedra Integration](#hedra-integration)
6. [Complete Workflow Implementation](#complete-workflow-implementation)
7. [Troubleshooting](#troubleshooting)

## Project Setup

### 1. Create a Next.js Project with TypeScript and Tailwind CSS

```bash
npx create-next-app@latest baby-podcast-generator
cd baby-podcast-generator
```

### 2. Install Required Dependencies

```bash
npm install axios formidable uuid
npm install -D @types/formidable @types/uuid
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```
OPENAI_API_KEY=your_openai_api_key
ELEVEN_LABS_API_KEY=your_elevenlabs_api_key
ELEVEN_LABS_VOICE_ID=your_preferred_voice_id
HEDRA_API_KEY=your_hedra_api_key
```

### 4. Create Environment Type Definitions

Create a file at `src/env.ts`:

```typescript
export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  ELEVEN_LABS_API_KEY: process.env.ELEVEN_LABS_API_KEY || "",
  ELEVEN_LABS_VOICE_ID: process.env.ELEVEN_LABS_VOICE_ID || "",
  HEDRA_API_KEY: process.env.HEDRA_API_KEY || "",
};
```

## Form Creation

### 1. Create the Form Component

Create a file at `src/components/PodcastForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PodcastForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    ethnicity: "Asian",
    babyHair: "Curly",
    topic: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/submit-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Form submission failed");
      }

      const data = await response.json();
      router.push(`/results?id=${data.id}`);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Baby Podcast Generator
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="ethnicity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Ethnicity of the baby
            </label>
            <select
              id="ethnicity"
              name="ethnicity"
              value={formData.ethnicity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="Asian">Asian</option>
              <option value="Middle Eastern">Middle Eastern</option>
              <option value="African">African</option>
              <option value="European">European</option>
              <option value="Hispanic">Hispanic</option>
            </select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="babyHair"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Baby Hair
            </label>
            <select
              id="babyHair"
              name="babyHair"
              value={formData.babyHair}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="Bald">Bald</option>
              <option value="Curly">Curly</option>
              <option value="Straight">Straight</option>
            </select>
          </div>

          <div className="mb-6">
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Topic of Discussion
            </label>
            <input
              id="topic"
              name="topic"
              type="text"
              value={formData.topic}
              onChange={handleChange}
              placeholder="Vaccines, Global Warming, Weather"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? "Generating..." : "Generate Podcast"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 2. Create the Home Page

Update `src/app/page.tsx`:

```tsx
import PodcastForm from "@/components/PodcastForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Baby Podcast Generator
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Generate a cute baby podcast with customized appearance and topic.
          </p>
        </div>
        <PodcastForm />
      </div>
    </main>
  );
}
```

### 3. Create the Form Submission API Route

Create a file at `src/app/api/submit-form/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// In-memory storage for submissions (use a database in production)
const submissions = new Map();

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the request body
    if (!body.ethnicity || !body.babyHair || !body.topic) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate a unique ID for this submission
    const id = uuidv4();

    // Store the submission data
    submissions.set(id, {
      ...body,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    // Process the submission asynchronously
    processSubmission(id);

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Error processing form submission:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Missing submission ID" },
      { status: 400 }
    );
  }

  const submission = submissions.get(id);

  if (!submission) {
    return NextResponse.json(
      { error: "Submission not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(submission);
}

async function processSubmission(id: string) {
  // This function will be implemented in the following sections
  // It will orchestrate the entire process:
  // 1. Generate script with OpenAI
  // 2. Generate image with OpenAI
  // 3. Generate audio with Eleven Labs
  // 4. Create video with Hedra
}
```

## OpenAI Integration

### 1. Create the Script Generation API Route

Create a file at `src/app/api/generate-script/route.ts`:

```typescript
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/env";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the request body
    if (!body.topic) {
      return NextResponse.json({ error: "Missing topic" }, { status: 400 });
    }

    // Create the system prompt
    const systemPrompt = `
      You are a cute, friendly baby who is hosting a podcast. You speak in simple, child-like language
      but you're surprisingly knowledgeable about the topic. Keep your sentences short and use an
      enthusiastic, curious tone. The podcast should be about 30 seconds when read aloud.
    `;

    // Create the user prompt
    const userPrompt = `
      Create a short podcast script about ${body.topic}. 
      The baby host is ${body.ethnicity} with ${body.babyHair} hair.
      Start with a cute introduction and then share 2-3 interesting facts about the topic.
      End with a cheerful goodbye.
    `;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    // Extract the generated script
    const script = response.choices[0]?.message?.content?.trim() || "";

    if (!script) {
      throw new Error("Failed to generate a script");
    }

    return NextResponse.json({ script });
  } catch (error) {
    console.error("Error generating script:", error);
    return NextResponse.json(
      { error: "Failed to generate script" },
      { status: 500 }
    );
  }
}
```

### 2. Create the Image Prompt Generation API Route

Create a file at `src/app/api/generate-prompt/route.ts`:

```typescript
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/env";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the request body
    if (!body.ethnicity || !body.babyHair || !body.topic) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the prompt for DALL-E
    const promptTemplate = `
      Generate a high resolution image prompt of a very cute chubby ${body.babyHair} hair ${body.ethnicity} baby 
      wearing large over-ear headphones speaking into a professional podcast microphone. 
      The baby should be sitting in a professional podcast studio with appropriate lighting and background.
      The baby is talking about ${body.topic}.
    `;

    // Call the OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: `Create a detailed image generation prompt based on this description: ${promptTemplate}. 
                   Make it very detailed for DALL-E to generate a high-quality, realistic image.`,
        },
      ],
      temperature: 0.7,
    });

    // Extract the generated prompt
    const prompt = response.choices[0]?.message?.content?.trim() || "";

    if (!prompt) {
      throw new Error("Failed to generate an image prompt");
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error("Error generating image prompt:", error);
    return NextResponse.json(
      { error: "Failed to generate image prompt" },
      { status: 500 }
    );
  }
}
```

### 3. Create the Image Generation API Route

Create a file at `src/app/api/generate-image/route.ts`:

```typescript
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { env } from "@/env";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the request body
    if (!body.prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Call the OpenAI API to generate an image
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: body.prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    });

    // Extract the generated image
    const imageData = response.data[0]?.b64_json;

    if (!imageData) {
      throw new Error("Failed to generate an image");
    }

    // Save the image to a temporary file or store it in memory
    // For this example, we'll return the base64 data
    return NextResponse.json({
      imageUrl: `data:image/png;base64,${imageData}`,
      imageBase64: imageData,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
```

## Eleven Labs Integration

### 1. Create the Voice Generation API Route

Create a file at `src/app/api/generate-voice/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { env } from "@/env";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the request body
    if (!body.text) {
      return NextResponse.json(
        { error: "Missing text content" },
        { status: 400 }
      );
    }

    const voiceId = env.ELEVEN_LABS_VOICE_ID;

    if (!env.ELEVEN_LABS_API_KEY) {
      return NextResponse.json(
        { error: "Eleven Labs API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": env.ELEVEN_LABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: body.text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Eleven Labs API error: ${errorText}`);
    }

    // Get the audio data as an ArrayBuffer
    const audioData = await response.arrayBuffer();

    // Convert to base64 for easy transmission
    const base64Audio = Buffer.from(audioData).toString("base64");

    return NextResponse.json({
      audioBase64: base64Audio,
      format: "mp3",
    });
  } catch (error) {
    console.error("Error generating voice:", error);
    return NextResponse.json(
      { error: "Failed to generate voice" },
      { status: 500 }
    );
  }
}
```

## Hedra Integration

### 1. Create the Hedra Video Generation API Route

Create a file at `src/app/api/generate-video/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { env } from "@/env";
import { writeFile } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

// In-memory storage for video generation jobs
const videoJobs = new Map();

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate the request body
    if (!body.imageBase64 || !body.audioBase64) {
      return NextResponse.json(
        { error: "Missing image or audio data" },
        { status: 400 }
      );
    }

    // Generate a unique job ID
    const jobId = uuidv4();

    // Store job information
    videoJobs.set(jobId, {
      status: "uploading_assets",
      createdAt: new Date().toISOString(),
    });

    // Process the video generation asynchronously
    processVideoGeneration(
      jobId,
      body.imageBase64,
      body.audioBase64,
      body.textPrompt || ""
    );

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Error initiating video generation:", error);
    return NextResponse.json(
      { error: "Failed to initiate video generation" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Missing job ID" }, { status: 400 });
  }

  const job = videoJobs.get(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}

async function processVideoGeneration(
  jobId: string,
  imageBase64: string,
  audioBase64: string,
  textPrompt: string
) {
  try {
    // Update job status
    videoJobs.set(jobId, {
      ...videoJobs.get(jobId),
      status: "uploading_image",
    });

    // 1. Upload the image to Hedra
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const imagePath = join(process.cwd(), "tmp", `${jobId}-image.png`);
    await writeFile(imagePath, imageBuffer);

    // Create image asset in Hedra
    const imageAssetResponse = await fetch(
      "https://api.hedra.com/webapp/public/assets",
      {
        method: "POST",
        headers: {
          "X-API-Key": env.HEDRA_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `image-${jobId}`,
          type: "image",
        }),
      }
    );

    if (!imageAssetResponse.ok) {
      throw new Error("Failed to create image asset in Hedra");
    }

    const imageAssetData = await imageAssetResponse.json();
    const imageAssetId = imageAssetData.id;

    // Upload image to the asset
    const imageFormData = new FormData();
    imageFormData.append("file", new Blob([imageBuffer]), "image.png");

    const imageUploadResponse = await fetch(
      `https://api.hedra.com/webapp/public/assets/${imageAssetId}/upload`,
      {
        method: "POST",
        headers: {
          "X-API-Key": env.HEDRA_API_KEY,
        },
        body: imageFormData,
      }
    );

    if (!imageUploadResponse.ok) {
      throw new Error("Failed to upload image to Hedra");
    }

    // Update job status
    videoJobs.set(jobId, {
      ...videoJobs.get(jobId),
      status: "uploading_audio",
      imageAssetId,
    });

    // 2. Upload the audio to Hedra
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const audioPath = join(process.cwd(), "tmp", `${jobId}-audio.mp3`);
    await writeFile(audioPath, audioBuffer);

    // Create audio asset in Hedra
    const audioAssetResponse = await fetch(
      "https://api.hedra.com/webapp/public/assets",
      {
        method: "POST",
        headers: {
          "X-API-Key": env.HEDRA_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `audio-${jobId}`,
          type: "audio",
        }),
      }
    );

    if (!audioAssetResponse.ok) {
      throw new Error("Failed to create audio asset in Hedra");
    }

    const audioAssetData = await audioAssetResponse.json();
    const audioAssetId = audioAssetData.id;

    // Upload audio to the asset
    const audioFormData = new FormData();
    audioFormData.append("file", new Blob([audioBuffer]), "audio.mp3");

    const audioUploadResponse = await fetch(
      `https://api.hedra.com/webapp/public/assets/${audioAssetId}/upload`,
      {
        method: "POST",
        headers: {
          "X-API-Key": env.HEDRA_API_KEY,
        },
        body: audioFormData,
      }
    );

    if (!audioUploadResponse.ok) {
      throw new Error("Failed to upload audio to Hedra");
    }

    // Update job status
    videoJobs.set(jobId, {
      ...videoJobs.get(jobId),
      status: "generating_video",
      audioAssetId,
    });

    // 3. Generate the video with Hedra
    const generateVideoResponse = await fetch(
      "https://api.hedra.com/webapp/public/character-3/generate",
      {
        method: "POST",
        headers: {
          "X-API-Key": env.HEDRA_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          aspect_ratio: "9:16",
          resolution: "540p",
          text_prompt: textPrompt || "A baby talking in a podcast studio",
          audio_asset_id: audioAssetId,
          image_asset_id: imageAssetId,
        }),
      }
    );

    if (!generateVideoResponse.ok) {
      throw new Error("Failed to generate video with Hedra");
    }

    const generateVideoData = await generateVideoResponse.json();
    const videoJobId = generateVideoData.id;

    // Update job status
    videoJobs.set(jobId, {
      ...videoJobs.get(jobId),
      status: "waiting_for_completion",
      videoJobId,
    });

    // 4. Poll for video generation completion
    let isComplete = false;
    let videoUrl = "";

    while (!isComplete) {
      // Wait for 5 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const checkStatusResponse = await fetch(
        `https://api.hedra.com/webapp/public/character-3/jobs/${videoJobId}`,
        {
          headers: {
            "X-API-Key": env.HEDRA_API_KEY,
          },
        }
      );

      if (!checkStatusResponse.ok) {
        continue;
      }

      const statusData = await checkStatusResponse.json();

      if (statusData.status === "completed") {
        isComplete = true;
        videoUrl = statusData.video_url;
      } else if (statusData.status === "failed") {
        throw new Error("Video generation failed");
      }
    }

    // Update job status to completed
    videoJobs.set(jobId, {
      ...videoJobs.get(jobId),
      status: "completed",
      videoUrl,
    });
  } catch (error) {
    console.error(`Error processing video generation for job ${jobId}:`, error);
    videoJobs.set(jobId, {
      ...videoJobs.get(jobId),
      status: "error",
      error: error.message,
    });
  }
}
```

## Complete Workflow Implementation

### 1. Update the Form Submission Processing Function

Update the `processSubmission` function in `src/app/api/submit-form/route.ts`:

```typescript
async function processSubmission(id: string) {
  try {
    const submission = submissions.get(id);
    if (!submission) return;

    // Update status
    submissions.set(id, { ...submission, status: "generating_prompt" });

    // Generate the prompt
    const promptResponse = await fetch(
      "http://localhost:3000/api/generate-prompt",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ethnicity: submission.ethnicity,
          babyHair: submission.babyHair,
          topic: submission.topic,
        }),
      }
    );

    if (!promptResponse.ok) {
      throw new Error("Failed to generate prompt");
    }

    const { prompt } = await promptResponse.json();

    // Update status
    submissions.set(id, { ...submission, status: "generating_image", prompt });

    // Generate the image
    const imageResponse = await fetch(
      "http://localhost:3000/api/generate-image",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      }
    );

    if (!imageResponse.ok) {
      throw new Error("Failed to generate image");
    }

    const { imageUrl, imageBase64 } = await imageResponse.json();

    // Update status
    submissions.set(id, {
      ...submission,
      status: "generating_script",
      imageUrl,
      imageBase64,
    });

    // Generate podcast script
    const scriptResponse = await fetch(
      "http://localhost:3000/api/generate-script",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: submission.topic,
          ethnicity: submission.ethnicity,
          babyHair: submission.babyHair,
        }),
      }
    );

    if (!scriptResponse.ok) {
      throw new Error("Failed to generate podcast script");
    }

    const { script } = await scriptResponse.json();

    // Update status
    submissions.set(id, {
      ...submission,
      status: "generating_voice",
      script,
    });

    // Generate voice
    const voiceResponse = await fetch(
      "http://localhost:3000/api/generate-voice",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: script,
        }),
      }
    );

    if (!voiceResponse.ok) {
      throw new Error("Failed to generate voice");
    }

    const { audioBase64, format } = await voiceResponse.json();

    // Update status
    submissions.set(id, {
      ...submission,
      status: "generating_video",
      audioBase64,
      audioFormat: format,
    });

    // Generate video with Hedra
    const videoResponse = await fetch(
      "http://localhost:3000/api/generate-video",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64,
          audioBase64,
          textPrompt: `A ${submission.ethnicity} baby with ${submission.babyHair} hair talking about ${submission.topic} in a podcast studio`,
        }),
      }
    );

    if (!videoResponse.ok) {
      throw new Error("Failed to initiate video generation");
    }

    const { jobId } = await videoResponse.json();

    // Update status
    submissions.set(id, {
      ...submission,
      status: "waiting_for_video",
      videoJobId: jobId,
    });

    // Poll for video completion
    let isComplete = false;
    let videoUrl = "";

    while (!isComplete) {
      // Wait for 5 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const checkStatusResponse = await fetch(
        `http://localhost:3000/api/generate-video?jobId=${jobId}`
      );

      if (!checkStatusResponse.ok) {
        continue;
      }

      const statusData = await checkStatusResponse.json();

      if (statusData.status === "completed") {
        isComplete = true;
        videoUrl = statusData.videoUrl;
      } else if (statusData.status === "error") {
        throw new Error(`Video generation failed: ${statusData.error}`);
      }
    }

    // Update status to completed
    submissions.set(id, {
      ...submission,
      status: "completed",
      videoUrl,
    });
  } catch (error) {
    console.error(`Error processing submission ${id}:`, error);
    const submission = submissions.get(id);
    if (submission) {
      submissions.set(id, {
        ...submission,
        status: "error",
        error: error.message,
      });
    }
  }
}
```

### 2. Create the Results Page

Create a file at `src/app/results/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface ResultData {
  status: string;
  error?: string;
  imageUrl?: string;
  videoUrl?: string;
  script?: string;
  ethnicity?: string;
  babyHair?: string;
  topic?: string;
}

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [resultData, setResultData] = useState<ResultData>({
    status: "loading",
  });
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/submit-form?id=${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch results");
        }

        const data = await response.json();
        setResultData(data);

        // If the status is not final, continue polling
        if (data.status !== "completed" && data.status !== "error") {
          return false;
        }

        // Status is final, stop polling
        return true;
      } catch (error) {
        console.error("Error fetching results:", error);
        setResultData({ status: "error", error: "Failed to load results" });
        return true; // Stop polling on error
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling
    const interval = setInterval(async () => {
      const shouldStopPolling = await fetchData();
      if (shouldStopPolling && pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }, 3000);

    setPollingInterval(interval);

    // Clean up on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [id]);

  const renderContent = () => {
    switch (resultData.status) {
      case "loading":
        return <div className="text-center">Loading results...</div>;

      case "error":
        return (
          <div className="bg-red-50 p-4 rounded-md">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">
              {resultData.error || "An unknown error occurred"}
            </p>
          </div>
        );

      case "pending":
      case "generating_prompt":
      case "generating_image":
      case "generating_script":
      case "generating_voice":
      case "generating_video":
      case "waiting_for_video":
        return (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">
              Processing Your Podcast
            </h2>
            <p className="text-gray-600 capitalize">
              {resultData.status.replace(/_/g, " ")}...
            </p>
          </div>
        );

      case "completed":
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Your Baby Podcast
            </h1>

            {resultData.videoUrl && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3">Video</h2>
                <div className="aspect-w-9 aspect-h-16 bg-black rounded-lg overflow-hidden">
                  <video
                    src={resultData.videoUrl}
                    controls
                    className="w-full"
                    poster={resultData.imageUrl}
                  />
                </div>
              </div>
            )}

            {resultData.imageUrl && !resultData.videoUrl && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-3">Image</h2>
                <div className="relative h-64 sm:h-80 md:h-96 w-full mb-4">
                  <Image
                    src={resultData.imageUrl}
                    alt="Baby podcast host"
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>
              </div>
            )}

            {resultData.script && (
              <div className="my-6">
                <h2 className="text-xl font-semibold mb-2">Podcast Script</h2>
                <div className="bg-gray-50 p-4 rounded-md whitespace-pre-line">
                  {resultData.script}
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-md mt-6">
              <h2 className="text-xl font-semibold mb-2">Podcast Details</h2>
              <ul className="space-y-2">
                <li>
                  <span className="font-medium">Baby Ethnicity:</span>{" "}
                  {resultData.ethnicity}
                </li>
                <li>
                  <span className="font-medium">Baby Hair:</span>{" "}
                  {resultData.babyHair}
                </li>
                <li>
                  <span className="font-medium">Topic:</span> {resultData.topic}
                </li>
              </ul>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center">Unknown status: {resultData.status}</div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-8">
            {renderContent()}

            <div className="flex justify-center mt-8">
              <Link
                href="/"
                className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Create Another Podcast
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Troubleshooting

### Common Issues and Solutions

1. **API Key Issues**:

   - Ensure all API keys (OpenAI, Eleven Labs, Hedra) are correctly set in your `.env.local` file
   - Verify you have sufficient credits/quota on all platforms

2. **Image Generation Failures**:

   - Check if your prompt adheres to OpenAI's content policy
   - Try simplifying the prompt if it's too complex

3. **Audio Generation Issues**:

   - Verify your Eleven Labs voice ID is correct
   - Ensure the script isn't too long (Eleven Labs has character limits)

4. **Hedra Integration Problems**:

   - Confirm your Hedra API key has the correct permissions
   - Check that image and audio formats are compatible (PNG/JPG for images, MP3 for audio)
   - Ensure the aspect ratio and resolution are supported by Hedra

5. **Next.js API Route Timeouts**:
   - For production, consider using a queue system for long-running processes
   - Implement proper error handling and retry mechanisms

### Testing Your Implementation

1. Start your Next.js development server:

   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000` in your browser

3. Fill out the form with test data and submit

4. Monitor the console for any errors during processing

5. Check the results page for the final video output

This guide provides a streamlined workflow for creating a Next.js application that generates videos from form inputs using OpenAI for script and image generation, Eleven Labs for audio generation, and Hedra for the final video creation. The implementation focuses on the essential components needed for this specific tech stack and avoids unnecessary steps.
