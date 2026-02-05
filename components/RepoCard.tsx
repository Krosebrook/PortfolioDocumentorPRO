import React, { useState } from 'react';
import { RepoAnalysis, RepoAudit } from '../types';
import HealthChart from './RadarChart';
import { ChevronDown, ChevronUp, ExternalLink, ShieldCheck, FileText, Zap, Loader2, Scale, GitCommit, FileWarning, Lock, Users, FolderTree } from 'lucide-react';
import { 
  generateReadme, 
  generateCiCd, 
  generateLicense, 
  generateCommitConfig,
  generateIssueTemplates,
  generateSecurityPolicy,
  generateCodeOfConduct,
  generateDirectoryStructure
} from '../services/geminiService';
import CodeModal from './CodeModal';

interface RepoCardProps {
  repo: RepoAnalysis;
}

interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  loading: boolean;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon: Icon, label, onClick, loading, disabled }) => (
  <button 
    onClick={onClick}
    disabled={loading || disabled}
    className={`
      flex items-center justify-start gap-2 px-3 py-2 
      bg-slate-800 hover:bg-slate-700 
      border border-slate-700 rounded-md 
      text-sm text-slate-300 transition-colors 
      disabled:opacity-50 disabled:cursor-not-allowed
      ${loading ? 'animate-pulse bg-slate-700' : ''}
    `}
  >
      {loading ? <Loader2 className="animate-spin" size={16}/> : <Icon size={16} className="text-indigo-400" />}
      <span className="truncate">{label}</span>
  </button>
);

const RepoCard: React.FC<RepoCardProps> = ({ repo }) => {
  const [expanded, setExpanded] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  
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

  const handleGenerator = async (
    e: React.MouseEvent, 
    actionName: string, 
    generatorFn: (repo: RepoAnalysis) => Promise<string>,
    title: string
  ) => {
    e.stopPropagation();
    setLoadingAction(actionName);
    try {
      const content = await generatorFn(repo);
      setModalContent({ title, content });
      setModalOpen(true);
    } catch (error) {
      console.error(error);
      alert(`Failed to generate ${title}`);
    } finally {
      setLoadingAction(null);
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
                <div className="h-64">
                   <HealthChart audit={repo.audit} />
                </div>
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
                   <h4 className="text-sm uppercase tracking-wider text-slate-500 mb-3 font-bold">Engineering Assets Generator</h4>
                   <div className="grid grid-cols-2 gap-3">
                      <ActionButton 
                        icon={FileText} label="README" 
                        loading={loadingAction === 'readme'} 
                        onClick={(e) => handleGenerator(e, 'readme', generateReadme, `README.md - ${repo.name}`)} 
                      />
                      <ActionButton 
                        icon={Zap} label="CI/CD & Docs" 
                        loading={loadingAction === 'cicd'} 
                        onClick={(e) => handleGenerator(e, 'cicd', generateCiCd, `.github/workflows/ci.yml - ${repo.name}`)} 
                      />
                      <ActionButton 
                        icon={FolderTree} label="Structure" 
                        loading={loadingAction === 'structure'} 
                        onClick={(e) => handleGenerator(e, 'structure', generateDirectoryStructure, `Structure - ${repo.name}`)} 
                      />
                      <ActionButton 
                        icon={FileWarning} label="Issues" 
                        loading={loadingAction === 'issues'} 
                        onClick={(e) => handleGenerator(e, 'issues', generateIssueTemplates, `Issue Templates - ${repo.name}`)} 
                      />
                      <ActionButton 
                        icon={Scale} label="License" 
                        loading={loadingAction === 'license'} 
                        onClick={(e) => handleGenerator(e, 'license', generateLicense, `LICENSE - ${repo.name}`)} 
                      />
                      <ActionButton 
                        icon={Lock} label="Security" 
                        loading={loadingAction === 'security'} 
                        onClick={(e) => handleGenerator(e, 'security', generateSecurityPolicy, `SECURITY.md - ${repo.name}`)} 
                      />
                      <ActionButton 
                        icon={Users} label="Conduct" 
                        loading={loadingAction === 'coc'} 
                        onClick={(e) => handleGenerator(e, 'coc', generateCodeOfConduct, `CODE_OF_CONDUCT.md - ${repo.name}`)} 
                      />
                      <ActionButton 
                        icon={GitCommit} label="Commits" 
                        loading={loadingAction === 'commit'} 
                        onClick={(e) => handleGenerator(e, 'commit', generateCommitConfig, `Commit Config - ${repo.name}`)} 
                      />
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