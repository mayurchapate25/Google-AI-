import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateTransformation } from './services/geminiService';
import { UploadIcon, DownloadIcon, SparklesIcon, ViewColumnsIcon } from './components/icons';
import { Spinner } from './components/Spinner';

interface ImageFile {
  base64: string;
  mimeType: string;
  name: string;
}

const App: React.FC = () => {
  const [beforeImage, setBeforeImage] = useState<ImageFile | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [additionalPrompt, setAdditionalPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBmi, setCurrentBmi] = useState<number | null>(null);
  const [idealWeight, setIdealWeight] = useState<number | null>(null);
  const [startMonth, setStartMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [lossPerMonth, setLossPerMonth] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [showSideBySide, setShowSideBySide] = useState<boolean>(true);
  const [activeComparisonView, setActiveComparisonView] = useState<'after' | 'before'>('after');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);

    if (h > 0 && w > 0) {
      const heightInMeters = h / 100;
      const bmi = w / (heightInMeters * heightInMeters);
      const ideal = 22 * (heightInMeters * heightInMeters);
      setCurrentBmi(parseFloat(bmi.toFixed(1)));
      setIdealWeight(parseFloat(ideal.toFixed(1)));
    } else {
      setCurrentBmi(null);
      setIdealWeight(null);
    }
  }, [height, weight]);

  useEffect(() => {
    const currentWeightNum = parseFloat(weight);
    const monthlyLossNum = parseFloat(lossPerMonth);

    if (idealWeight && currentWeightNum > idealWeight && monthlyLossNum > 0 && startMonth) {
        const weightToLose = currentWeightNum - idealWeight;
        const monthsNeeded = Math.ceil(weightToLose / monthlyLossNum);
        
        const startDate = new Date(startMonth + '-02T00:00:00Z'); // Use a specific day to avoid timezone issues
        startDate.setUTCMonth(startDate.getUTCMonth() + monthsNeeded -1);

        const targetDateString = startDate.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        setTargetDate(targetDateString);
    } else {
        setTargetDate(null);
    }
  }, [weight, idealWeight, lossPerMonth, startMonth]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file (PNG, JPG, etc.).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setBeforeImage({ base64: base64Data, mimeType: file.type, name: file.name });
        setAfterImage(null);
        setError(null);
        setShowSideBySide(true);
        setActiveComparisonView('after');
      };
      reader.onerror = () => {
        setError('Failed to read the image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!beforeImage) {
      setError('Please upload a "before" picture.');
      return;
    }
    if (!height || !weight || +height <= 0 || +weight <= 0) {
      setError('Please enter valid height and weight.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAfterImage(null);

    try {
      const basePrompt = `Transform the person in this image into an athletic version of themselves with a lean, muscular build, consistent with a healthy BMI of 22. They should be wearing tight-fitting athletic clothes that accentuate their new physique. Critically, maintain the original person's facial features and identity. Generate a high-quality, realistic image.`;
      const fullPrompt = additionalPrompt ? `${basePrompt} Additional instructions: ${additionalPrompt}` : basePrompt;
      
      const generatedImageBase64 = await generateTransformation(beforeImage.base64, beforeImage.mimeType, fullPrompt);
      
      setAfterImage(`data:image/png;base64,${generatedImageBase64}`);
      setShowSideBySide(true);
      setActiveComparisonView('after');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during image generation.');
    } finally {
      setIsLoading(false);
    }
  }, [beforeImage, height, weight, additionalPrompt]);
  

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-6xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
            See your Transformed Version!
          </h1>
          <p className="text-slate-400 mt-2">See your transformed version and be ready to achieve it. Remember, consistency is the key.</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-slate-800 p-6 rounded-2xl shadow-lg flex flex-col space-y-6">
            <h2 className="text-2xl font-semibold text-cyan-300 border-b border-slate-700 pb-3">1. Your Details</h2>
            
            {/* Image Uploader */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Upload "Before" Picture</label>
              <div 
                onClick={triggerFileSelect}
                className="relative w-full h-64 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-slate-400 hover:border-cyan-400 hover:text-cyan-400 transition-colors cursor-pointer bg-slate-900/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {beforeImage ? (
                  <img src={`data:${beforeImage.mimeType};base64,${beforeImage.base64}`} alt="Before preview" className="object-contain h-full w-full rounded-md p-1" />
                ) : (
                  <div className="text-center">
                    <UploadIcon className="w-10 h-10 mx-auto mb-2" />
                    <p>Click to upload an image</p>
                    <p className="text-xs text-slate-500">PNG, JPG, WEBP</p>
                  </div>
                )}
              </div>
            </div>

            {/* Height and Weight Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="height" className="block text-sm font-medium text-slate-300 mb-2">Height (cm)</label>
                <input
                  type="number"
                  id="height"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g., 175"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                />
              </div>
              <div>
                <label htmlFor="weight" className="block text-sm font-medium text-slate-300 mb-2">Weight (kg)</label>
                <input
                  type="number"
                  id="weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g., 80"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                />
              </div>
            </div>

            {/* BMI and Ideal Weight Display */}
            {currentBmi && idealWeight && (
              <div className="bg-slate-700/50 p-4 rounded-lg text-center space-y-2 transition-all duration-300">
                <div className="flex justify-around items-center">
                  <div>
                    <p className="text-sm text-slate-400">Current BMI</p>
                    <p className="text-2xl font-bold text-cyan-300">{currentBmi}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Ideal Weight (BMI 22)</p>
                    <p className="text-2xl font-bold text-purple-300">{idealWeight} kg</p>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Changes */}
            <div>
              <label htmlFor="additional-prompt" className="block text-sm font-medium text-slate-300 mb-2">Additional Changes (Optional)</label>
              <textarea
                id="additional-prompt"
                rows={3}
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                placeholder="e.g., wearing a blue shirt, on a running track"
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
              />
            </div>
            
            {/* Timeline Projection */}
            <div className="border-t border-slate-700 pt-6 space-y-4">
              <h3 className="text-xl font-semibold text-slate-300">Timeline Projection</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startMonth" className="block text-sm font-medium text-slate-300 mb-2">Start Month</label>
                  <input
                    type="month"
                    id="startMonth"
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label htmlFor="lossPerMonth" className="block text-sm font-medium text-slate-300 mb-2">Monthly Loss (kg)</label>
                  <input
                    type="number"
                    id="lossPerMonth"
                    value={lossPerMonth}
                    onChange={(e) => setLossPerMonth(e.target.value)}
                    placeholder="e.g., 2"
                    min="0.1"
                    step="0.1"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                  />
                </div>
              </div>
              {targetDate && (
                <div className="bg-slate-900/50 p-4 rounded-lg text-center transition-all duration-300">
                  <p className="text-sm text-slate-400">Projected Goal Date</p>
                  <p className="text-2xl font-bold text-green-300">{targetDate}</p>
                </div>
              )}
            </div>
            
            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isLoading || !beforeImage || !height || !weight}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
            >
              {isLoading ? (
                <>
                  <Spinner />
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  Generate Transformation
                </>
              )}
            </button>
            {error && <p className="text-red-400 text-center text-sm mt-2">{error}</p>}
          </div>

          {/* Output Panel */}
          <div className="bg-slate-800 p-6 rounded-2xl shadow-lg flex flex-col">
            <h2 className="text-2xl font-semibold text-purple-300 border-b border-slate-700 pb-3 mb-6">2. Your Transformation</h2>
            <div className="flex-grow flex flex-col items-center justify-center bg-slate-900/50 rounded-lg min-h-[300px] lg:min-h-full p-4">
              {isLoading ? (
                <div className="text-center text-slate-400">
                  <Spinner className="w-12 h-12" />
                  <p className="mt-4">AI is sculpting your new physique...</p>
                  <p className="text-sm text-slate-500">This may take a moment.</p>
                </div>
              ) : afterImage && beforeImage ? (
                <div className="w-full h-full flex flex-col items-center gap-4">
                   <div className="w-full flex justify-end">
                      <button
                          onClick={() => setShowSideBySide(!showSideBySide)}
                          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors p-2 rounded-lg bg-slate-700/80 hover:bg-slate-700"
                          title="Toggle side-by-side view"
                      >
                          <ViewColumnsIcon className="w-5 h-5" />
                          <span className="text-sm font-medium">{showSideBySide ? 'Single View' : 'Compare View'}</span>
                      </button>
                  </div>
                  
                  {showSideBySide ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-slate-400 mb-2">Before</h3>
                        <img src={`data:${beforeImage.mimeType};base64,${beforeImage.base64}`} alt="Before" className="object-contain w-full rounded-lg shadow-md" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-slate-400 mb-2">After</h3>
                        <img src={afterImage} alt="Transformed" className="object-contain w-full rounded-lg shadow-md" />
                        <a
                            href={afterImage}
                            download="transformation.png"
                            className="mt-4 inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            Download Image
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col items-center">
                        <div className="flex justify-center border border-slate-700 rounded-lg p-1 bg-slate-900 mb-4">
                            <button onClick={() => setActiveComparisonView('before')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeComparisonView === 'before' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>Before</button>
                            <button onClick={() => setActiveComparisonView('after')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeComparisonView === 'after' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>After</button>
                        </div>
                        <img src={activeComparisonView === 'before' ? `data:${beforeImage.mimeType};base64,${beforeImage.base64}` : afterImage} alt={activeComparisonView} className="object-contain w-full max-h-[50vh] rounded-lg shadow-md" />
                        <a
                            href={activeComparisonView === 'before' ? `data:${beforeImage.mimeType};base64,${beforeImage.base64}` : afterImage}
                            download={`transformation-${activeComparisonView}.png`}
                            className="mt-4 inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            <DownloadIcon className="w-5 h-5" />
                            Download {activeComparisonView === 'before' ? 'Before' : 'After'} Image
                        </a>
                    </div>
                  )}
                </div>
              ) : (
                 <div className="text-center text-slate-500 p-8">
                    <SparklesIcon className="w-16 h-16 mx-auto text-slate-600 mb-4"/>
                    <h3 className="text-lg font-medium text-slate-400">Your "After" Pic Awaits</h3>
                    <p className="text-sm">Fill in your details and upload a photo to see the magic happen.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;