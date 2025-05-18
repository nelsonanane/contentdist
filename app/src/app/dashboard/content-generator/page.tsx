"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CharacterForm from "@/components/content-generator/CharacterForm";

export default function ContentGeneratorPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Character Voice Content Generator</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Generate entertaining podcasts and videos featuring different characters discussing your chosen topics.
      </p>
      
      <CharacterForm />
    </div>
  );
}
