export interface RepoAudit {
  documentation: number;
  buildDevX: number;
  testing: number;
  ciCd: number;
  security: number;
  observability: number;
  maintainability: number;
  productionReadiness: number;
  rationale: string;
  topFixes: string[];
}

export interface RepoAnalysis {
  name: string;
  url: string;
  status: 'Active' | 'Dormant' | 'Archived' | 'Template' | 'Fork' | 'Unknown';
  primaryLanguage: string;
  frameworks: string[];
  audit: RepoAudit;
  description: string;
}

export interface ActionItem {
  title: string;
  repo: string;
  priority: 'High' | 'Medium' | 'Low';
  impact: string;
  effort: 'Small' | 'Medium' | 'Large';
  rationale: string;
}

export interface PortfolioSummary {
  executiveSummary: string;
  stats: {
    totalRepos: number;
    activeCount: number;
    archivedCount: number;
    languages: Record<string, number>;
  };
  capabilities: string[];
  spotlightProjects: {
    name: string;
    description: string;
    impressiveFactor: string;
  }[];
}

export interface AnalysisResult {
  summary: PortfolioSummary;
  repos: RepoAnalysis[];
  actions: ActionItem[];
  claimsCheck: string[];
}

export interface InputState {
  urls: string;
  context: string;
}