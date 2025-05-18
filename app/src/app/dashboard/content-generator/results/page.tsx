"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface ResultData {
  status:
    | "loading"
    | "generating_script"
    | "generating_image"
    | "generating_audio"
    | "generating_video"
    | "completed"
    | "error";
  script?: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  error?: string;
  character_type?: string;
  topic?: string;
}

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const { user, session, isLoading } = useAuth();
  const [resultData, setResultData] = useState<ResultData>({
    status: "loading",
  });
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  // Track the last time we made a request to prevent excessive polling
  const [lastRequestTime, setLastRequestTime] = useState<number>(0);
  // Track how many times we've polled to implement exponential backoff
  const [pollCount, setPollCount] = useState<number>(0);
  // Store job IDs we're already polling for to prevent duplicate polling
  const [pollingJobIds] = useState<Set<string>>(new Set());

  // Calculate polling delay with exponential backoff
  const getPollingDelay = (count: number, status: string): number => {
    // Base polling intervals by status (in milliseconds)
    const baseIntervals: Record<string, number> = {
      generating_script: 5000,    // 5 seconds for script generation
      generating_image: 8000,     // 8 seconds for image generation
      generating_audio: 10000,    // 10 seconds for audio generation
      generating_video: 15000,    // 15 seconds for video generation
      default: 10000,             // 10 seconds default
    };
    
    // Get base interval based on status
    const baseInterval = baseIntervals[status] || baseIntervals.default;
    
    // For video generation, use longer intervals with exponential backoff
    if (status === 'generating_video') {
      // Max delay capped at 60 seconds (1 minute)
      return Math.min(baseInterval * Math.pow(1.5, Math.min(count, 5)), 60000);
    }
    
    // For other statuses, use moderate backoff
    // Max delay capped at 30 seconds
    return Math.min(baseInterval * Math.pow(1.2, Math.min(count, 3)), 30000);
  };

  const fetchJobStatus = async () => {
    if (!id || !user) return;
    
    // Throttle requests - ensure minimum time between requests
    const now = Date.now();
    const minRequestInterval = 3000; // 3 seconds minimum between requests
    
    if (now - lastRequestTime < minRequestInterval) {
      console.log('Throttling job status request - too soon since last request');
      return;
    }
    
    // Update last request time
    setLastRequestTime(now);
    
    try {
      // No need for auth token, session is handled via cookies
      const response = await fetch(
        `/api/content-generator/job-status?id=${id}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch job status");
      }

      const data = await response.json();
      
      // Increment poll count for backoff calculation
      setPollCount(prevCount => prevCount + 1);
      
      setResultData({
        status: data.status,
        script: data.script,
        imageUrl: data.image_url,
        audioUrl: data.audio_url,
        videoUrl: data.video_url,
        character_type: data.character_type,
        topic: data.topic,
      });

      // If the job is completed or encountered an error, stop polling
      if (data.status === "completed" || data.status === "error") {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
        
        // Remove from polling job IDs set
        if (id) pollingJobIds.delete(id);
      }
    } catch (error) {
      console.error("Error fetching job status:", error);
      setResultData({
        status: "error",
        error:
          error instanceof Error ? error.message : "Failed to fetch job status",
      });

      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      
      // Remove from polling job IDs set
      if (id) pollingJobIds.delete(id);
    }
  };

  useEffect(() => {
    // Use a ref to track if this effect is still mounted
    let isMounted = true;
    
    // Function to safely set state only if component is still mounted
    const safeSetPollingInterval = (interval: NodeJS.Timeout | null) => {
      if (isMounted) {
        setPollingInterval(interval);
      }
    };

    // Cleanup function to run on unmount or dependency change
    const cleanup = () => {
      isMounted = false;
      
      // Clear any active intervals/timeouts
      if (pollingInterval) {
        clearTimeout(pollingInterval);
        clearInterval(pollingInterval);
      }
      
      // Remove from the polling job IDs set
      if (id) {
        console.log(`Cleaning up polling for job ${id}`);
        pollingJobIds.delete(id);
      }
    };
    
    // Redirect if not authenticated
    if (!isLoading && !user) {
      router.push("/signin");
      return cleanup;
    }

    if (!id) {
      router.push("/dashboard/content-generator");
      return cleanup;
    }
    
    // Prevent duplicate polling for the same job ID
    if (id && pollingJobIds.has(id)) {
      console.log(`Already polling for job ${id}, skipping duplicate setup`);
      return cleanup;
    }
    
    // Add to polling job IDs set
    if (id) {
      console.log(`Starting to poll for job ${id}`);
      pollingJobIds.add(id);
    }

    // Initial fetch
    fetchJobStatus();

    // Only set up polling if we don't already have an error or completed status
    if (resultData.status !== "error" && resultData.status !== "completed") {
      // Calculate initial delay based on current job status
      const initialDelay = getPollingDelay(0, resultData.status || 'default');
      console.log(`Setting up polling for job ${id} with delay: ${initialDelay}ms`);
      
      // Set up a simple interval that uses the current state for each call
      const newInterval = setInterval(() => {
        // This will use the current state values when the interval executes
        if (isMounted) {
          console.log(`Polling job ${id} - interval triggered`);
          fetchJobStatus();
        }
      }, initialDelay);
      
      // Store the interval
      safeSetPollingInterval(newInterval);
    }
    
    // Return cleanup function
    return () => {
      cleanup();
    };
  }, [id, router, isLoading, user, resultData.status]);

  const renderStatusMessage = () => {
    switch (resultData.status) {
      case "loading":
        return "Loading your content...";
      case "generating_script":
        return "Creating an engaging script for your character...";
      case "generating_image":
        return "Designing your character's appearance...";
      case "generating_audio":
        return "Bringing your character to life with a voice...";
      case "generating_video":
        return "Assembling the final video...";
      case "completed":
        return "Your character content is ready!";
      case "error":
        return "An error occurred while creating your content";
      default:
        return "Processing your request...";
    }
  };

  const renderContent = () => {
    switch (resultData.status) {
      case "loading":
        return (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        );

      case "generating_script":
      case "generating_image":
      case "generating_audio":
      case "generating_video":
        return (
          <div className="text-center p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
              <div className="flex justify-center mt-6">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            </div>
          </div>
        );

      case "completed":
        return (
          <div className="text-center p-8">
            <div className="mb-6">
              <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-4 rounded-lg inline-block">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 inline mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Content generation complete!
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your {resultData.character_type} character discussing{" "}
              {resultData.topic} is ready to view.
            </p>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6 mx-auto max-w-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Generated Script:
              </h3>
              <p className="text-gray-700 dark:text-gray-300 italic">
                {resultData.script || "No script content available"}
              </p>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Audio:
              </h3>
              {resultData.audioUrl && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mx-auto max-w-lg">
                  <audio controls className="w-full">
                    <source src={resultData.audioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Video:
              </h3>
              {resultData.videoUrl ? (
                <div className="flex flex-col items-center">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mx-auto max-w-xs">
                    <video
                      controls
                      className="w-full rounded-lg shadow-lg max-h-[70vh]"
                      playsInline
                      poster={resultData.imageUrl || undefined}
                    >
                      <source src={resultData.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="mt-4">
                    <a
                      href={resultData.videoUrl}
                      download={`${
                        resultData.character_type
                      }-podcast-${Date.now()}.mp4`}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:bg-green-700 dark:hover:bg-green-600"
                    >
                      Download Video
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-200 dark:bg-gray-700 w-full max-w-xs h-[70vh] mx-auto rounded-lg flex items-center justify-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Video not available
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={() => router.push("/dashboard/content-generator")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Another
              </button>
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                Share Content
              </button>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="text-center p-8">
            <div className="mb-6">
              <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-4 rounded-lg inline-block">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 inline mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Error Generating Content
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {resultData.error ||
                "An unknown error occurred. Please try again."}
            </p>
            <button
              onClick={() => router.push("/dashboard/content-generator")}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Try Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Content Generation</h1>
      <h2 className="text-xl text-gray-600 dark:text-gray-400 mb-6">
        Status: {renderStatusMessage()}
      </h2>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {renderContent()}
      </div>
    </div>
  );
}
