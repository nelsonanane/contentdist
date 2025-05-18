import axios from "axios";

interface TtsRequest {
  text: string;
  voiceId?: string;
}

export async function generateAudio({
  text,
  voiceId,
}: TtsRequest): Promise<Buffer> {
  try {
    // Use default voice ID if none specified
    const selectedVoiceId =
      voiceId ||
      process.env.NEXT_PUBLIC_ELEVEN_LABS_VOICE_ID ||
      "BtWabtumIemAotTjP5sk";

    // Get API key from environment variables
    let apiKey = 
      process.env.NEXT_PUBLIC_ELEVEN_LABS_API_KEY || 
      process.env.ELEVEN_LABS_API_KEY;

    if (!apiKey) {
      throw new Error(
        "ElevenLabs API key is missing. Please set ELEVEN_LABS_API_KEY in your environment variables."
      );
    }

    // Trim any whitespace that might have been accidentally included in the .env file
    apiKey = apiKey.trim();

    console.log(
      "Attempting ElevenLabs API request with native fetch"
    );
    console.log(`Voice ID: ${selectedVoiceId}`);
    console.log(`API Key exists: ${!!apiKey} (length: ${apiKey.length})`);
    // Don't log the actual API key for security reasons

    // Use native fetch instead of axios as an alternative approach
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      
      // Handle specific error codes with more helpful messages
      if (response.status === 401) {
        throw new Error(
          `ElevenLabs API authentication failed (401): Your API key may be invalid or expired. Please check your environment variables.`
        );
      } else if (response.status === 429) {
        throw new Error(
          `ElevenLabs API rate limit exceeded (429): You've reached your usage limit. Please try again later or upgrade your plan.`
        );
      } else {
        throw new Error(
          `ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Eleven Labs audio generation error:", error);
    throw error;
  }
}

export function selectVoiceByCharacter(
  characterType: string,
  attributes: Record<string, string>
): string {
  // Mapping of character types to voice IDs
  // These are examples and would need to be updated with actual Eleven Labs voice IDs
  const voices = {
    // Baby voices based on characteristics
    baby: {
      default: "BtWabtumIemAotTjP5sk", // Male baby voice
      alternative: "jsCqWAovK2LkecY7zXl4", // Josh (child-like)
    },
    // Animal voices based on species
    animal: {
      Dog: "XrExE9yKIg1WjnnlVkGX", // Daniel (playful)
      Cat: "z9fAnlkpzviPz146aGWa", // Charlotte (smooth)
      Elephant: "g5CIjZEefAph4nQFvHAz", // Matilda (deep)
      Lion: "VR6AewLTigWG4xSOukaG", // Arnold (strong)
      Monkey: "ErXwobaYiN019PkySvjV", // Antoni (energetic)
      Penguin: "MF3mGyEYCl7XYWbV9V6O", // Elli (cute)
    },
    // Historical figure voices based on era and nationality
    historical: {
      Ancient: "TxGEqnHWrfWFTfGW9XjX", // Rachel (wise)
      Medieval: "AZnzlk1XvdvUeBnXmlld", // Domi (dramatic)
      Renaissance: "1tNePSElFnDmAyDqkLSY", // Thomas (educated)
      Industrial: "ODq5zmih8GkE1Yx5CZz6", // Dave (formal)
      Modern: "SOYHLrjzK2X1ezoPC6cr", // Sarah (professional)
    },
  };

  // Select appropriate voice based on character type and attributes
  switch (characterType) {
    case "baby":
      return attributes.babyHair === "Bald"
        ? voices.baby.default
        : voices.baby.alternative;

    case "animal":
      return (
        voices.animal[attributes.species as keyof typeof voices.animal] ||
        voices.animal.Dog
      );

    case "historical":
      return (
        voices.historical[attributes.era as keyof typeof voices.historical] ||
        voices.historical.Modern
      );

    default:
      return "BtWabtumIemAotTjP5sk"; // Male baby voice as default
  }
}
