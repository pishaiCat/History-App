
export type GenerationStatus = 'pending' | 'generating' | 'done' | 'error';

export interface GeneratedImage {
  id: string;
  prompt: string;
  status: GenerationStatus;
  imageUrl?: string;
  error?: string;
}

// FIX: Define and export the CharacterImage type.
// This type was missing, causing an import error in CharacterUploader.tsx.
export interface CharacterImage {
  file: File;
  base64: string;
  mimeType: string;
}
