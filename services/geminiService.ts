import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, RepoAnalysis, PortfolioSummary } from '../types';

const apiKey = process.env.API_KEY;

export class GeminiError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'GeminiError';
  }
}

// --- UTILITIES ---
const cleanCodeBlock = (text: string): string => {
  // Removes markdown code fences (e.g., ```json ... ```, ```markdown ... ```) to return raw content
  // Handles cases where language might be specified or not
  if (!text) return '';
  return text.replace(/^```[a-z-]*\n([\s\S]*)\n```$/i, '$1').trim();
};

const validateApiKey = () => {
  if (!apiKey) {
    throw new GeminiError("API Key is missing. Please ensure process.env.API_KEY is set.");
  }
};

// --- SCHEMAS ---
const auditSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    documentation: { type: Type.NUMBER, description: "Score 0-5" },
    buildDevX: { type: Type.NUMBER, description: "Score 0-5" },
    testing: { type: Type.NUMBER, description: "Score 0-5" },
    ciCd: { type: Type.NUMBER, description: "Score 0-5" },
    security: { type: Type.NUMBER, description: "Score 0-5" },
    observability: { type: Type.NUMBER, description: "Score 0-5" },
    maintainability: { type: Type.NUMBER, description: "Score 0-5" },
    productionReadiness: { type: Type.NUMBER, description: "Score 0-5" },
    rationale: { type: Type.STRING },
    topFixes: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["documentation", "buildDevX", "testing", "ciCd", "security", "maintainability", "productionReadiness", "rationale", "topFixes"]
};

const repoSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    url: { type: Type.STRING },
    status: { type: Type.STRING, enum: ['Active', 'Dormant', 'Archived', 'Template', 'Fork', 'Unknown'] },
    primaryLanguage: { type: Type.STRING },
    frameworks: { type: Type.ARRAY, items: { type: Type.STRING } },
    audit: auditSchema,
    description: { type: Type.STRING }
  },
  required: ["name", "url", "status", "primaryLanguage", "audit", "description"]
};

const actionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    repo: { type: Type.STRING },
    priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
    impact: { type: Type.STRING },
    effort: { type: Type.STRING, enum: ['Small', 'Medium', 'Large'] },
    rationale: { type: Type.STRING }
  },
  required: ["title", "repo", "priority", "impact", "effort", "rationale"]
};

const summarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    executiveSummary: { type: Type.STRING },
    stats: {
      type: Type.OBJECT,
      properties: {
        totalRepos: { type: Type.NUMBER },
        activeCount: { type: Type.NUMBER },
        archivedCount: { type: Type.NUMBER },
        languages: { type: Type.OBJECT, description: "Key is language name, value is count" }
      },
      required: ["totalRepos", "activeCount", "archivedCount"]
    },
    capabilities: { type: Type.ARRAY, items: { type: Type.STRING } },
    spotlightProjects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          impressiveFactor: { type: Type.STRING }
        },
        required: ["name", "description", "impressiveFactor"]
      }
    }
  },
  required: ["executiveSummary", "stats", "capabilities", "spotlightProjects"]
};

const rootSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: summarySchema,
    repos: { type: Type.ARRAY, items: repoSchema },
    actions: { type: Type.ARRAY, items: actionSchema },
    claimsCheck: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["summary", "repos", "actions", "claimsCheck"]
};

// --- SERVICES ---

export const analyzePortfolio = async (urls: string, context: string): Promise<AnalysisResult> => {
  validateApiKey();
  if (!urls || urls.trim().length === 0) {
    throw new GeminiError("URLs cannot be empty.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey! });

  const systemInstruction = `
    You are a Portfolio Intelligence Auditor and Engineering Signal Analyst. 
    Your job is to analyze GitHub repositories provided by the user.
    
    HARD RULES:
    1. Do NOT invent stars, forks, or traffic metrics.
    2. Prefer conservative language.
    3. Output STRICT JSON matching the provided schema.
    4. If you cannot access a URL, infer what you can from the URL structure or user context, but mark status as Unknown if completely blocked.
    5. Score repos 0-5 on audit dimensions based on typical best practices (e.g., presence of README, CI/CD configs, Tests).
  `;

  const prompt = `
    Analyze the following GitHub URLs and Context:
    
    URLs:
    ${urls}
    
    Context/Notes:
    ${context}
    
    If specific repo details aren't accessible via the tool, use the names and context to perform a "best-effort" inferred analysis based on standard engineering patterns for such projects.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: rootSchema,
        tools: [{ googleSearch: {} }] 
      }
    });

    if (response.text) {
      try {
          return JSON.parse(response.text) as AnalysisResult;
      } catch (parseError) {
          throw new GeminiError("Failed to parse AI response. Please try again.", parseError);
      }
    } else {
      throw new GeminiError("Empty response from AI. The model may be overloaded.");
    }
  } catch (error: any) {
    console.error("Gemini Analysis Failed:", error);
    if (error instanceof GeminiError) throw error;
    throw new GeminiError(error.message || "Unknown error during analysis.", error);
  }
};

export const generateReadme = async (repo: RepoAnalysis): Promise<string> => {
  validateApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey! });

  const prompt = `
    Generate a comprehensive README.md for:
    Name: ${repo.name}
    Language: ${repo.primaryLanguage}
    Description: ${repo.description}
    
    Structure:
    1. **Title & Badge Placeholder**: (CI/CD, License)
    2. **Description**: Clear value prop.
    3. **Project Structure**: A file tree representation showing where source code, tests, and documentation reside.
    4. **Documentation**: EXPLICITLY state where docs are. E.g., "See \`/docs\` for detailed guides" or "Docs are inline".
    5. **Getting Started**: Installation & Run steps.
    6. **Contribution Guidelines**: A dedicated section explaining how to contribute (e.g., "Fork, Branch, PR, Test").
    7. **Troubleshooting**: 2-3 common issues & solutions for ${repo.primaryLanguage}.
    8. **Roadmap**: A checklist of 3-4 future items.
    9. **License**: Reference the LICENSE file.
    
    Output raw Markdown. No fences.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return cleanCodeBlock(response.text || "Failed to generate README.");
};

export const generateCiCd = async (repo: RepoAnalysis): Promise<string> => {
  validateApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey! });

  const prompt = `
    Generate a production-grade Github Actions Workflow (.github/workflows/ci.yml) for:
    Repo: ${repo.name} (${repo.primaryLanguage})
    
    Requirements:
    1. **Triggers**: Push to main, PRs.
    2. **Jobs**:
       - 'lint-and-test': Checkout, setup env, install deps, run lint (eslint/flake8), run tests, run build.
       - 'commit-lint': Check conventional commits.
       - 'deploy-docs': 
         - Runs only on push to main && success.
         - Permissions: contents:read, pages:write, id-token:write.
         - Tooling: Use 'typedoc' (if TS/JS) or 'mkdocs' (if Python) to build static site.
         - Deploy: Use 'actions/upload-pages-artifact' & 'actions/deploy-pages'.
    
    Output raw YAML. No fences.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });

  return cleanCodeBlock(response.text || "Failed to generate CI/CD configuration.");
};

export const generateDocStrategy = async (summary: PortfolioSummary): Promise<string> => {
  validateApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey! });

  const prompt = `
    Design a "Documentation-as-Code" Strategy for this portfolio:
    Repos: ${summary.stats.totalRepos}
    Langs: ${Object.keys(summary.stats.languages).join(', ')}
    
    Cover:
    1. **Taxonomy**: Standard folder structure (e.g., /docs/architecture, /docs/api).
    2. **Tooling**: 
       - JS/TS: Recommend Docusaurus or TypeDoc.
       - Python: Recommend MkDocs with Material theme.
    3. **CI/CD Integration**: How to auto-build/deploy docs on merge.
    4. **Maintenance**: Strategy for keeping docs in sync (e.g., "Doc Tests", PR checklists).
    
    Output raw Markdown. No fences.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });

  return cleanCodeBlock(response.text || "Failed to generate Strategy.");
};

export const generateLicense = async (repo: RepoAnalysis): Promise<string> => {
  validateApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey! });

  const prompt = `
    Generate a standard LICENSE (MIT or Apache 2.0) for "${repo.name}".
    Copyright Year: ${new Date().getFullYear()}.
    Holder: The ${repo.name} Contributors.
    Output raw text.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return cleanCodeBlock(response.text || "Failed to generate License.");
};

export const generateCommitConfig = async (repo: RepoAnalysis): Promise<string> => {
  validateApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey! });

  const prompt = `
    Generate a config file for Conventional Commits.
    Language: ${repo.primaryLanguage}.
    
    Rules:
    - If JS/TS: Generate 'commitlint.config.js'.
    - If Python/Go/Other: Generate '.pre-commit-config.yaml' with 'commitizen' hook.
    
    Output raw code. No fences.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return cleanCodeBlock(response.text || "Failed to generate Commit Config.");
};

export const generateIssueTemplates = async (repo: RepoAnalysis): Promise<string> => {
  validateApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey! });

  const prompt = `
    Generate GitHub Issue Templates for: ${repo.name}.
    
    Produce two separate markdown files content in one output:
    1. **.github/ISSUE_TEMPLATE/bug_report.md**
    2. **.github/ISSUE_TEMPLATE/feature_request.md**
    
    Standardize fields (Description, Steps to Reproduce, Expected Behavior, Environment).
    
    Output format:
    ### .github/ISSUE_TEMPLATE/bug_report.md
    [Content...]
    
    ### .github/ISSUE_TEMPLATE/feature_request.md
    [Content...]
    
    No code fences.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return cleanCodeBlock(response.text || "Failed to generate Issue Templates.");
};

export const generateSecurityPolicy = async (repo: RepoAnalysis): Promise<string> => {
  validateApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey! });

  const prompt = `
    Generate a SECURITY.md file for ${repo.name}.
    
    Include:
    - Supported versions (e.g., "Latest release").
    - Reporting a vulnerability (e.g., "Email security@example.com").
    - Expected response time.
    
    Output raw Markdown. No fences.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return cleanCodeBlock(response.text || "Failed to generate Security Policy.");
};

export const generateCodeOfConduct = async (repo: RepoAnalysis): Promise<string> => {
  validateApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey! });

  const prompt = `
    Generate a CODE_OF_CONDUCT.md (Contributor Covenant v2.1) for ${repo.name}.
    Include standard sections: Our Pledge, Our Standards, Enforcement, Attribution.
    
    Output raw Markdown. No fences.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return cleanCodeBlock(response.text || "Failed to generate Code of Conduct.");
};

export const generateDirectoryStructure = async (repo: RepoAnalysis): Promise<string> => {
  validateApiKey();
  const ai = new GoogleGenAI({ apiKey: apiKey! });

  const prompt = `
    Analyze ${repo.name} (Language: ${repo.primaryLanguage}, Frameworks: ${repo.frameworks.join(', ')}) and recommend an Optimal Standardized Directory Structure.
    
    Output a file tree diagram and a brief explanation of the key directories (e.g., src, tests, docs, .github).
    
    Example output format:
    root/
    ├── src/        # Source code
    ├── tests/      # Unit and integration tests
    ...
    
    Explanation:
    ...
    
    Output raw text/markdown. No fences.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return cleanCodeBlock(response.text || "Failed to generate Directory Structure.");
};
