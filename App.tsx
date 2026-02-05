import React, { useState } from 'react';
import { analyzePortfolio } from './services/geminiService';
import Dashboard from './components/Dashboard';
import { AnalysisResult, InputState } from './types';
import { Loader2, Search, Github } from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState<InputState>({
    urls: '',
    context: ''
  });

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.urls.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await analyzePortfolio(input.urls, input.context);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setInput({ urls: '', context: '' });
  };

  if (result) {
    return <Dashboard data={result} onReset={reset} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-slate-800 rounded-xl border border-slate-700 shadow-xl mb-4">
             <Github size={48} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Portfolio<span className="text-emerald-500">Signal</span>
          </h1>
          <p className="text-lg text-slate-400">
            AI-powered intelligence auditor for engineering portfolios. 
            Generate verified signals, health scores, and action plans instantly.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl">
          <form onSubmit={handleAnalyze} className="space-y-6">
            <div>
              <label htmlFor="urls" className="block text-sm font-medium text-slate-300 mb-2">
                GitHub URLs (Profile or Repos)
              </label>
              <textarea
                id="urls"
                required
                className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono text-sm resize-none placeholder-slate-600"
                placeholder="https://github.com/username/repo1&#10;https://github.com/username/repo2"
                value={input.urls}
                onChange={(e) => setInput(prev => ({ ...prev, urls: e.target.value }))}
              />
            </div>

            <div>
              <label htmlFor="context" className="block text-sm font-medium text-slate-300 mb-2">
                Context Notes (Optional)
              </label>
              <textarea
                id="context"
                className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm resize-none placeholder-slate-600"
                placeholder="e.g. 'Repo 1 is an MVP for a client', 'Repo 2 is a deprecated experiment'..."
                value={input.context}
                onChange={(e) => setInput(prev => ({ ...prev, context: e.target.value }))}
              />
            </div>

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-200 text-sm">
                Error: {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !input.urls.trim()}
              className={`w-full py-4 px-6 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                ${loading 
                  ? 'bg-slate-700 cursor-not-allowed opacity-70' 
                  : 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/20 active:transform active:scale-[0.98]'
                }`}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" /> Analyzing Engineering Signals...
                </>
              ) : (
                <>
                  <Search size={20} /> Run Audit & Analysis
                </>
              )}
            </button>
            
            <p className="text-center text-xs text-slate-500 mt-4">
              Powered by Google Gemini 3.0 Pro. Analysis is inferred based on provided URLs and public availability.
            </p>
          </form>
        </div>

        {/* Sample / Demo Data Helper */}
        <div className="text-center">
            <button 
                type="button"
                className="text-xs text-slate-500 hover:text-emerald-400 underline decoration-dotted"
                onClick={() => setInput({
                    urls: "https://github.com/facebook/react\nhttps://github.com/vercel/next.js",
                    context: "React is a library. Next.js is a framework."
                })}
            >
                Fill with example data (React/Next.js)
            </button>
        </div>

      </div>
    </div>
  );
};

export default App;
