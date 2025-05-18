"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from '@/lib/supabase-browser';

type CharacterType = "baby" | "animal" | "historical";

interface FormData {
  characterType: CharacterType;
  topic: string;
  // We'll add more fields dynamically based on character type
  attributes: Record<string, string>;
}

export default function CharacterForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  // We no longer need to get the authentication token
  // The session is now handled automatically via cookies
  
  const [formData, setFormData] = useState<FormData>({
    characterType: "baby",
    topic: "",
    attributes: {
      // Default baby attributes
      ethnicity: "Asian",
      babyHair: "Curly"
    }
  });

  const handleCharacterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const characterType = e.target.value as CharacterType;
    let attributes: Record<string, string> = {};
    
    // Set default attributes based on character type
    switch (characterType) {
      case "baby":
        attributes = { ethnicity: "Asian", babyHair: "Curly" };
        break;
      case "animal":
        attributes = { species: "Dog", trait: "Playful" };
        break;
      case "historical":
        attributes = { era: "Modern", nationality: "American" };
        break;
    }

    setFormData({
      ...formData,
      characterType,
      attributes
    });
  };

  const handleAttributeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      attributes: {
        ...formData.attributes,
        [name]: value
      }
    });
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      topic: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Step 1: Submit form to create the job
      const submitResponse = await fetch('/api/content-generator/submit-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterType: formData.characterType,
          attributes: formData.attributes,
          topic: formData.topic
        }),
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }

      const data = await submitResponse.json();
      
      // Step 2: Trigger job processing in the background
      fetch('/api/content-generator/process-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: data.id
        }),
      }).catch(err => {
        console.error('Background job processing error:', err);
        // We don't need to handle this error since it's a background process
      });
      
      // Step 3: Redirect to results page with the job ID
      router.push(`/dashboard/content-generator/results?id=${data.id}`);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(error instanceof Error ? error.message : 'An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Character Voice Generator
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="characterType"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Character Type
            </label>
            <select
              id="characterType"
              name="characterType"
              value={formData.characterType}
              onChange={handleCharacterTypeChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              required
            >
              <option value="baby">Baby</option>
              <option value="animal">Animal</option>
              <option value="historical">Historical Figure</option>
            </select>
          </div>

          {/* Dynamic attributes based on character type */}
          {formData.characterType === "baby" && (
            <>
              <div className="mb-4">
                <label
                  htmlFor="ethnicity"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Ethnicity
                </label>
                <select
                  id="ethnicity"
                  name="ethnicity"
                  value={formData.attributes.ethnicity}
                  onChange={handleAttributeChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Hair Type
                </label>
                <select
                  id="babyHair"
                  name="babyHair"
                  value={formData.attributes.babyHair}
                  onChange={handleAttributeChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                >
                  <option value="Bald">Bald</option>
                  <option value="Curly">Curly</option>
                  <option value="Straight">Straight</option>
                </select>
              </div>
            </>
          )}

          {formData.characterType === "animal" && (
            <>
              <div className="mb-4">
                <label
                  htmlFor="species"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Species
                </label>
                <select
                  id="species"
                  name="species"
                  value={formData.attributes.species}
                  onChange={handleAttributeChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                >
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Elephant">Elephant</option>
                  <option value="Lion">Lion</option>
                  <option value="Monkey">Monkey</option>
                  <option value="Penguin">Penguin</option>
                </select>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="trait"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Personality
                </label>
                <select
                  id="trait"
                  name="trait"
                  value={formData.attributes.trait}
                  onChange={handleAttributeChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                >
                  <option value="Playful">Playful</option>
                  <option value="Grumpy">Grumpy</option>
                  <option value="Wise">Wise</option>
                  <option value="Energetic">Energetic</option>
                  <option value="Lazy">Lazy</option>
                </select>
              </div>
            </>
          )}

          {formData.characterType === "historical" && (
            <>
              <div className="mb-4">
                <label
                  htmlFor="era"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Era
                </label>
                <select
                  id="era"
                  name="era"
                  value={formData.attributes.era}
                  onChange={handleAttributeChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                >
                  <option value="Ancient">Ancient (before 500 CE)</option>
                  <option value="Medieval">Medieval (500-1500 CE)</option>
                  <option value="Renaissance">Renaissance (1400-1700 CE)</option>
                  <option value="Industrial">Industrial Revolution (1760-1840)</option>
                  <option value="Modern">Modern Era (1900-present)</option>
                </select>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="nationality"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Nationality/Region
                </label>
                <select
                  id="nationality"
                  name="nationality"
                  value={formData.attributes.nationality}
                  onChange={handleAttributeChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                >
                  <option value="American">American</option>
                  <option value="European">European</option>
                  <option value="Asian">Asian</option>
                  <option value="African">African</option>
                  <option value="Middle Eastern">Middle Eastern</option>
                </select>
              </div>
            </>
          )}

          <div className="mb-6">
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Topic of Discussion
            </label>
            <input
              id="topic"
              name="topic"
              type="text"
              value={formData.topic}
              onChange={handleTopicChange}
              placeholder="Climate change, space exploration, healthy eating..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? "Generating..." : "Generate Content"}
          </button>
        </form>
      </div>
    </div>
  );
}
