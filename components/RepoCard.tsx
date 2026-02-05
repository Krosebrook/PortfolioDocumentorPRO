import React, { useState } from 'react';
import { RepoAnalysis, RepoAudit } from '../types';
import HealthChart from './RadarChart';
import { ChevronDown, ChevronUp, ExternalLink, ShieldCheck, FileText, Zap, Loader2, Scale, GitCommit } from 'lucide-react';
import { generateReadme, generateCiCd, generateLicense, generateCommitConfig } from '../services/geminiService';
import CodeModal from './CodeModal';

interface RepoCardProps {
  repo: RepoAnalysis;
}

const RepoCard: React.FC<RepoCardProps> = ({ repo }) => {
  const [expanded, setExpanded] = useState(false);
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [loadingCiCd, setLoadingCiCd] = useState(false);
  const [loadingLicense, setLoadingLicense] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: '' });

  // Explicitly map keys to avoid accidental inclusion of non-numeric props if schema changes
  const auditKeys: (keyof RepoAudit)[] = [
    'documentation', 
    'buildDevX', 
    'testing', 
    'ciCd', 
    'security', 
    'observability', 
    'maintainability', 
    'productionReadiness'
  ];

  const scores = auditKeys.map(key => repo.audit[key] as number);
  const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-emerald-400';
    if (score >= 2.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleGenerateReadme = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingReadme(true);
    try {
      const content = await generateReadme(repo);
      setModalContent({ title: `README.md - ${repo.name}`, content });
      setModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Failed to generate README");
    } finally {
      setLoadingReadme(false);
    }
  };

  const handleGenerateCiCd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingCiCd(true);
    try {
      const content = await generateCiCd(repo);
      setModalContent({ title: `.github/workflows/ci.yml - ${repo.name}`, content });
      setModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Failed to generate CI/CD Config");
    } finally {
      setLoadingCiCd(false);
    }
  };

  const handleGenerateLicense = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingLicense(true);
    try {
      const content = await generateLicense(repo);
      setModalContent({ title: `LICENSE - ${repo.name}`, content });
      setModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Failed to generate License");
    } finally {
      setLoadingLicense(false);
    }
  };

  const handleGenerateCommitConfig = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingCommit(true);
    try {
      const content = await generateCommitConfig(repo);
      const isJs = repo.primaryLanguage?.toLowerCase().match(/(javascript|typescript|node|react|vue|angular)/);
      const filename = isJs ? 'commitlint.config.js' : '.pre-commit-config.yaml';
      setModalContent({ title: `${filename} - ${repo.name}`, content });
      setModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Failed to generate Commit Config");
    } finally {
      setLoadingCommit(false);
    }
  };

  return (
    <>
      <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden mb-4 transition-all hover:border-slate-600">
        <div 
          className="p-4 flex items-center justify-between cursor-pointer bg-slate-800/50"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center space-x-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold bg-slate-700 ${getScoreColor(parseFloat(avgScore))}`}>
              {avgScore}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {repo.name}
                <a href={repo.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-slate-400 hover:text-white">
                  <ExternalLink size={14} />
                </a>
              </h3>
              <div className="flex items-center space-x-2 text-sm text-slate-400">
                <span className="px-2 py-0.5 bg-slate-700 rounded text-xs">{repo.status}</span>
                <span>{repo.primaryLanguage}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
              <div className="hidden md:flex space-x-2">
                  {repo.frameworks.slice(0, 3).map(fw => (
                      <span key={fw} className="text-xs text-slate-500 border border-slate-700 px-2 py-1 rounded-full">{fw}</span>
                  ))}
              </div>
            {expanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
          </div>
        </div>

        {expanded && (
          <div className="p-4 border-t border-slate-700 bg-slate-850">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm uppercase tracking-wider text-slate-500 mb-2 font-bold">Health Audit</h4>
                <HealthChart audit={repo.audit} />
                <div className="mt-4">
                  <h5 className="text-sm font-semibold text-emerald-400 mb-1 flex items-center gap-1">
                      <ShieldCheck size={14}/> Top Fixes
                  </h5>
                  <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                    {repo.audit.topFixes.map((fix, idx) => (
                      <li key={idx}>{fix}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm uppercase tracking-wider text-slate-500 mb-2 font-bold">Rationale</h4>
                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-800 p-3 rounded border border-slate-700">
                    {repo.audit.rationale}
                  </p>
                </div>
                
                <div>
                   <h4 className="text-sm uppercase tracking-wider text-slate-500 mb-2 font-bold">Description</h4>
                   <p className="text-sm text-slate-400">{repo.description}</p>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                   {repo.frameworks.map(fw => (
                      <span key={fw} className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-400 font-mono">
                          {fw}
                      </span>
                   ))}
                </div>

                <div className="pt-4 border-t border-slate-800">
                   <h4 className="text-sm uppercase tracking-wider text-slate-500 mb-3 font-bold">Generators</h4>
                   <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={handleGenerateReadme}
                        disabled={loadingReadme}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-sm text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         {loadingReadme ? <Loader2 className="animate-spin" size={16}/> : <FileText size={16} />}
                         README
                      </button>
                      <button 
                        onClick={handleGenerateCiCd}
                        disabled={loadingCiCd}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-sm text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         {loadingCiCd ? <Loader2 className="animate-spin" size={16}/> : <Zap size={16} />}
                         CI/CD & Docs
                      </button>
                      <button 
                        onClick={handleGenerateLicense}
                        disabled={loadingLicense}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-sm text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         {loadingLicense ? <Loader2 className="animate-spin" size={16}/> : <Scale size={16} />}
                         License
                      </button>
                       <button 
                        onClick={handleGenerateCommitConfig}
                        disabled={loadingCommit}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-sm text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         {loadingCommit ? <Loader2 className="animate-spin" size={16}/> : <GitCommit size={16} />}
                         Commit Config
                      </button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <CodeModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={modalContent.title} 
        content={modalContent.content} 
      />
    </>
  );
};

export default RepoCard;