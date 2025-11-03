import React, { useState, useCallback } from 'react';
import type { GeneratedImage } from './types';
import { PromptInput } from './components/PromptInput';
import { ImageGrid } from './components/ImageGrid';
import { generateImage } from './services/geminiService';
import { DownloadIcon, SparklesIcon, RefreshIcon } from './components/icons';

// Make JSZip available from CDN
declare var JSZip: any;

const imageStyles = [
  'Photorealistic', 'Anime', 'Watercolor', 'Digital art', 'Fantasy', 'Cyberpunk', 'Steampunk', 'Minimalist', 'Impressionistic'
];

const aspectRatios = [
  '1:1', '4:3', '3:4', '16:9', '9:16'
];

export default function App() {
  const [prompts, setPrompts] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [imageStyle, setImageStyle] = useState<string>('Watercolor');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const runGeneration = useCallback(async (tasks: GeneratedImage[]) => {
    for (const task of tasks) {
      try {
        const imageUrl = await generateImage(task.prompt, aspectRatio, imageStyle);
        setGeneratedImages(prev => 
          prev.map(img => img.id === task.id ? { ...img, status: 'done', imageUrl, error: undefined } : img)
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        setGeneratedImages(prev => 
          prev.map(img => img.id === task.id ? { ...img, status: 'error', error: errorMessage, imageUrl: undefined } : img)
        );
      }
    }
  }, [aspectRatio, imageStyle]);

  const handleGenerate = async () => {
    if (!prompts.trim()) {
      setError("Please enter at least one prompt.");
      return;
    }
    setError(null);
    setIsLoading(true);

    const promptLines = prompts.trim().split('\n').filter(p => p.trim() !== '');
    const initialImages: GeneratedImage[] = promptLines.map((prompt, index) => ({
      id: `${Date.now()}-${index}`,
      prompt,
      status: 'generating',
    }));
    setGeneratedImages(initialImages);

    await runGeneration(initialImages);
    setIsLoading(false);
  };
  
  const handleRegenerate = useCallback(async (id: string, prompt: string) => {
      setGeneratedImages(prev => prev.map(img => img.id === id ? { ...img, status: 'generating', imageUrl: undefined, error: undefined } : img));
      const task: GeneratedImage = { id, prompt, status: 'generating' };
      await runGeneration([task]);
  }, [runGeneration]);
  
  const handleRegenerateFailed = useCallback(async () => {
    const failedTasks = generatedImages.filter(img => img.status === 'error');
    if (failedTasks.length === 0) return;

    setIsLoading(true);

    setGeneratedImages(prev => 
        prev.map(img => 
            failedTasks.some(failed => failed.id === img.id) 
                ? { ...img, status: 'generating', imageUrl: undefined, error: undefined } 
                : img
        )
    );

    await runGeneration(failedTasks);
    setIsLoading(false);
  }, [generatedImages, runGeneration]);

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    
    const imagePromises = generatedImages.map(async (image, index) => {
      if (image.status === 'done' && image.imageUrl) {
        const response = await fetch(image.imageUrl!);
        const blob = await response.blob();
        zip.file(`${index + 1}.png`, blob);
      }
    });

    await Promise.all(imagePromises);

    if (Object.keys(zip.files).length > 0) {
      zip.generateAsync({ type: "blob" }).then((content: Blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'generated-images.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
    }
  };

  const handleImageClick = (imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
  };

  const hasFailedGenerations = generatedImages.some(i => i.status === 'error');
  const hasSuccessfulGenerations = generatedImages.some(i => i.status === 'done');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">
            Bulk Image Generator
          </h1>
          <p className="mt-3 text-lg text-gray-400 max-w-2xl mx-auto">
            Bring your ideas to life. Write your prompts, choose your style, and generate stunning images in batches.
          </p>
        </header>
        
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-6 p-6 bg-gray-800/50 rounded-xl border border-gray-700 h-fit">
            <h2 className="text-xl font-semibold text-gray-200">Controls</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="style" className="block mb-2 text-sm font-medium text-gray-300">Style</label>
                <select id="style" value={imageStyle} onChange={(e) => setImageStyle(e.target.value)} className="block p-2.5 w-full text-sm rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 bg-gray-800 border-gray-600 text-white">
                  {imageStyles.map(style => <option key={style} value={style}>{style}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="ratio" className="block mb-2 text-sm font-medium text-gray-300">Aspect Ratio</label>
                <select id="ratio" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="block p-2.5 w-full text-sm rounded-lg border focus:ring-indigo-500 focus:border-indigo-500 bg-gray-800 border-gray-600 text-white">
                  {aspectRatios.map((ratio) => <option key={ratio} value={ratio}>{ratio}</option>)}
                </select>
              </div>
            </div>

            <div>
                <PromptInput prompts={prompts} onPromptsChange={setPrompts} isDisabled={isLoading} />
            </div>
            
            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleGenerate}
              disabled={isLoading || !prompts.trim()}
              className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 mt-auto"
            >
              {isLoading ? (
                 <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                 </>
              ) : (
                <>
                    <SparklesIcon className="w-5 h-5 mr-2"/>
                    Generate
                </>
              )}
            </button>
          </div>
          
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-200">Generated Images</h2>
                <div className="flex items-center space-x-2">
                  {hasFailedGenerations && (
                      <button
                          onClick={handleRegenerateFailed}
                          disabled={isLoading}
                          className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Regenerate all failed images"
                      >
                          <RefreshIcon className="w-5 h-5 mr-2"/>
                          Regenerate Failed
                      </button>
                  )}
                  {hasSuccessfulGenerations && (
                      <button
                          onClick={handleDownloadAll}
                          className="inline-flex items-center px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
                      >
                          <DownloadIcon className="w-5 h-5 mr-2"/>
                          Download All (.zip)
                      </button>
                  )}
                </div>
            </div>
            <div className="bg-black/20 p-6 rounded-xl border border-gray-800 min-h-[50vh]">
              <ImageGrid images={generatedImages} onRegenerate={handleRegenerate} onImageClick={handleImageClick} />
            </div>
          </div>
        </main>
      </div>

      {previewImageUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImageUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <img
            src={previewImageUrl}
            alt="Enlarged preview"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/75 transition-colors"
            aria-label="Close preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}