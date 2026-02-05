import React, { useState } from 'react';
import { AnalysisResult, ActionItem } from '../types';
import RepoCard from './RepoCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle, AlertOctagon, Terminal, Activity, Layers, Award, Book, Loader2 } from 'lucide-react';
import { generateDocStrategy } from '../services/geminiService';
import CodeModal from './CodeModal';

interface DashboardProps {
  data: AnalysisResult;
  onReset: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  const { summary, repos, actions, claimsCheck } = data;
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [strategyContent, setStrategyContent] = useState('');

  const langData = Object.entries(summary.stats.languages || {}).map(([name, count]) => ({
    name,
    count,
  }));

  const sortedRepos = [...repos].sort((a, b) => {
    // Basic sort by active status then by name
    if (a.status === 'Active' && b.status !== 'Active') return -1;
    if (a.status !== 'Active' && b.status === 'Active') return 1;
    return 0;
  });

  const handleGenerateStrategy = async () => {
    setLoadingStrategy(true);
    try {
      const content = await generateDocStrategy(summary);
      setStrategyContent(content);
      setModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Failed to generate Documentation Strategy");
    } finally {
      setLoadingStrategy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Terminal className="text-emerald-400" />
          <h1 className="text-xl font-bold tracking-tight text-white">Portfolio<span className="text-emerald-400">Signal</span></h1>
        </div>
        <button 
          onClick={onReset}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          New Analysis
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Executive Summary */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity size={20} className="text-emerald-400"/> Executive Summary
              </h2>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {summary.executiveSummary}
              </p>
              
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-3 rounded border border-slate-700 text-center">
                    <div className="text-2xl font-bold text-white">{summary.stats.totalRepos}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Total Repos</div>
                </div>
                <div className="bg-slate-900 p-3 rounded border border-slate-700 text-center">
                    <div className="text-2xl font-bold text-emerald-400">{summary.stats.activeCount}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Active</div>
                </div>
                <div className="bg-slate-900 p-3 rounded border border-slate-700 text-center">
                    <div className="text-2xl font-bold text-slate-400">{summary.stats.archivedCount}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Archived</div>
                </div>
                <div className="bg-slate-900 p-3 rounded border border-slate-700 text-center">
                    <div className="text-2xl font-bold text-indigo-400">{langData.length}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Languages</div>
                </div>
              </div>
            </div>

            {/* Capabilities */}
             <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h3 className="text-md font-semibold text-white mb-4">Engineering Capabilities (Verified)</h3>
                <div className="flex flex-wrap gap-2">
                    {summary.capabilities.map((cap, i) => (
                        <span key={i} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm">
                            {cap}
                        </span>
                    ))}
                </div>
             </div>
          </div>

          <div className="space-y-6">
            {/* Tech Stack Chart */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-64 flex flex-col">
              <h3 className="text-md font-semibold text-white mb-2">Primary Languages</h3>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={langData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                            itemStyle={{ color: '#10b981' }}
                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                            {langData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Claims Check */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <h3 className="text-md font-semibold text-white mb-3 flex items-center gap-2">
                    <AlertOctagon size={16} className="text-orange-400" /> Claims Check
                </h3>
                <ul className="text-sm text-slate-400 space-y-2">
                    {claimsCheck.length > 0 ? claimsCheck.map((claim, i) => (
                        <li key={i} className="flex gap-2 items-start">
                            <span className="text-orange-400 mt-1">•</span> {claim}
                        </li>
                    )) : (
                        <li className="text-emerald-400 flex gap-2 items-center">
                            <CheckCircle size={14} /> No contradictions found.
                        </li>
                    )}
                </ul>
            </div>
          </div>
        </section>
        
        {/* Docs Strategy Section */}
        <section className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700 flex items-center justify-between">
           <div>
               <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                   <Book className="text-indigo-400" /> Portfolio Documentation Strategy
               </h2>
               <p className="text-slate-400 text-sm max-w-2xl">
                   Generate a standardized documentation strategy, including tool recommendations, folder structures, and maintenance plans tailored to your specific stack and portfolio size.
               </p>
           </div>
           <button 
             onClick={handleGenerateStrategy}
             disabled={loadingStrategy}
             className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
           >
              {loadingStrategy ? <Loader2 className="animate-spin" /> : <Book size={18} />}
              Generate Strategy
           </button>
        </section>

        {/* Action Plan */}
        <section>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Layers className="text-indigo-400" /> Prioritized Action Plan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(['High', 'Medium', 'Low'] as const).map(priority => {
                    const priorityActions = actions.filter(a => a.priority === priority);
                    if (priorityActions.length === 0) return null;
                    
                    const colorMap = {
                        High: 'border-red-500/50 bg-red-500/5',
                        Medium: 'border-yellow-500/50 bg-yellow-500/5',
                        Low: 'border-blue-500/50 bg-blue-500/5'
                    };
                    
                    const badgeColor = {
                         High: 'text-red-400 bg-red-400/10',
                        Medium: 'text-yellow-400 bg-yellow-400/10',
                        Low: 'text-blue-400 bg-blue-400/10'
                    }

                    return (
                        <div key={priority} className={`rounded-xl border ${colorMap[priority]} p-4`}>
                            <h3 className={`font-bold mb-4 flex items-center gap-2 ${badgeColor[priority]} inline-block px-3 py-1 rounded text-sm`}>
                                {priority} Priority
                            </h3>
                            <div className="space-y-4">
                                {priorityActions.map((action, idx) => (
                                    <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-700 shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-semibold text-slate-200 text-sm">{action.title}</span>
                                            <span className="text-xs font-mono text-slate-500">{action.effort} Effort</span>
                                        </div>
                                        <div className="text-xs text-indigo-400 mb-2 font-mono">{action.repo}</div>
                                        <p className="text-xs text-slate-400 leading-normal">{action.rationale}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>

        {/* Repository Audit */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Terminal className="text-emerald-400" /> Repository Audit
          </h2>
          <div className="space-y-4">
            {sortedRepos.map((repo) => (
              <RepoCard key={repo.name} repo={repo} />
            ))}
          </div>
        </section>

        {/* Spotlight Projects */}
        <section className="pb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Award className="text-yellow-400" /> Spotlight Projects
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {summary.spotlightProjects.map((project, i) => (
                    <div key={i} className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 rounded-xl hover:border-emerald-500/50 transition-colors group">
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{project.name}</h3>
                        <p className="text-slate-400 text-sm mb-4 h-20 overflow-y-auto">{project.description}</p>
                        <div className="bg-slate-950/50 p-3 rounded border border-slate-800">
                            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block mb-1">Impressive Factor</span>
                            <p className="text-sm text-emerald-300">{project.impressiveFactor}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
      </main>
      
      <CodeModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title="Portfolio Documentation Strategy" 
        content={strategyContent} 
      />
    </div>
  );
};

export default Dashboard;