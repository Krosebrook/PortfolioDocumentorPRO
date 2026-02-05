import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, RepoAnalysis, PortfolioSummary } from '../types';

const apiKey = process.env.API_KEY;

// --- UTILITIES ---
const cleanCodeBlock = (text: string): string => {
  // Removes markdown code fences (e.g., ```json ... ```) to return raw content
  return text.replace(/^```[a-z]*\n([\s\S]*)\n```$/i, '$1').trim();
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
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is set.");
  }

  const ai = new GoogleGenAI({ apiKey });

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
      return JSON.parse(response.text) as AnalysisResult;
    } else {
      throw new Error("Empty response from AI");
    }
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};

export const generateReadme = async (repo: RepoAnalysis): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });

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
    6. **Troubleshooting**: 2-3 common issues & solutions for ${repo.primaryLanguage}.
    7. **Roadmap**: A checklist of 3-4 future items.
    8. **License**: Reference the LICENSE file.
    
    Output raw Markdown. No fences.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return cleanCodeBlock(response.text || "Failed to generate README.");
};

export const generateCiCd = async (repo: RepoAnalysis): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });

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
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });

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
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });

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
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });

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
