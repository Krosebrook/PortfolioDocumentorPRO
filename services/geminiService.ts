import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, RepoAnalysis, PortfolioSummary } from '../types';

const apiKey = process.env.API_KEY;

// Define the response schema strictly to match our TypeScript interfaces
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
        languages: { type: Type.OBJECT, description: "Key is language name, value is count" } // Map simulation
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
    // Using gemini-3-pro-preview for complex reasoning and potential search grounding (if configured)
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: rootSchema,
        // Enable Google Search to try and find public repo details if they are public URLs
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
    Generate a comprehensive README.md file for the following repository:
    Name: ${repo.name}
    Language: ${repo.primaryLanguage}
    Frameworks: ${repo.frameworks.join(', ')}
    Description: ${repo.description}
    
    The README must include:
    1. **Project Title & Description**: Clearly state what the project does.
    2. **Installation Instructions**: Specific steps for ${repo.primaryLanguage}.
    3. **Usage Examples**: Code snippets or command line examples.
    4. **Project Structure**: A section outlining the recommended directory structure for this project, specifically recommending where documentation should reside (e.g., a '/docs' folder vs inline markdown) based on best practices for ${repo.primaryLanguage}.
    5. **Contribution Guidelines**: How to contribute to the project.
    6. **Troubleshooting**: A section with 2-3 common/placeholder issues relevant to ${repo.primaryLanguage}/${repo.frameworks.join(', ')} (e.g., environment variable setup, dependency conflicts) and provide placeholder solutions.
    7. **Roadmap**: A section listing 3-4 future planned features or improvements using a markdown checklist format (e.g., '- [ ] Implement user authentication').
    8. **License**: A section stating the project is licensed under a common open-source license (e.g., MIT or Apache 2.0) and explicitly referencing the LICENSE file.
    
    Format the output as raw Markdown. Do not include markdown code block fences (like \`\`\`markdown).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text || "Failed to generate README.";
};

export const generateCiCd = async (repo: RepoAnalysis): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Generate a robust Github Actions CI/CD workflow YAML file (.github/workflows/ci.yml) for:
    Name: ${repo.name}
    Language: ${repo.primaryLanguage}
    Frameworks: ${repo.frameworks.join(', ')}
    
    The pipeline should include:
    1. **Triggers**: Push to main/master and pull requests.
    2. **Permissions**: contents: read, pages: write, id-token: write.
    3. **Job 'quality-check'**:
       - Checkout code.
       - Setup ${repo.primaryLanguage} environment.
       - Install dependencies.
       - **Commit Linting**: Enforce consistent commit messages (Conventional Commits) using a lightweight check or linter.
       - **Linting**: Run standard linters (eslint, flake8, etc.).
       - **Testing**: Run unit tests.
       - **Build**: Attempt build if applicable.
    4. **Job 'deploy-docs'**:
       - Run ONLY on push to main branch (after 'quality-check' passes).
       - Build documentation:
         - If JavaScript/TypeScript: Use 'typedoc' to generate static docs.
         - If Python: Use 'mkdocs build'.
       - Deploy to GitHub Pages using 'actions/deploy-pages' and 'actions/upload-pages-artifact'.
    
    Format the output as raw YAML. Do not include markdown code block fences.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });

  return response.text || "Failed to generate CI/CD configuration.";
};

export const generateDocStrategy = async (summary: PortfolioSummary): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Create a comprehensive Documentation Strategy for an engineering portfolio with the following stats:
    Total Repos: ${summary.stats.totalRepos}
    Languages: ${Object.keys(summary.stats.languages).join(', ')}
    Capabilities: ${summary.capabilities.join(', ')}
    
    The strategy should include:
    1. **Project Structure**: Recommendations for standardizing docs (e.g. /docs folder vs inline).
    2. **Tooling Recommendations**:
       - For Python projects: Recommend MkDocs.
       - For JS/TS projects: Recommend TypeDoc for API reference and Docusaurus for guides.
    3. **Maintenance Plan**: A strategy for keeping documentation up-to-date with code changes.
    4. **Automated Workflows**: Explain how to use CI/CD for auto-generating and deploying docs (Github Pages).
    5. **Definition of Done**: A clear checklist for documentation requirements in Pull Requests.
    
    Format the output as Markdown.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });

  return response.text || "Failed to generate Documentation Strategy.";
};

export const generateLicense = async (repo: RepoAnalysis): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Generate a standard open-source license file (MIT or Apache 2.0) for the repository named "${repo.name}".
    Choose the most appropriate one for a ${repo.primaryLanguage} project (default to MIT).
    Use the current year and "The ${repo.name} Contributors" as the copyright holder.
    Format as raw text.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text || "Failed to generate License.";
};

export const generateCommitConfig = async (repo: RepoAnalysis): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Generate a configuration file to enforce Conventional Commits for:
    Language: ${repo.primaryLanguage}

    - If JavaScript/TypeScript: Generate "commitlint.config.js" extending "@commitlint/config-conventional".
    - If Python or others: Generate ".pre-commit-config.yaml" using "commitizen" or "conventional-pre-commit".
    
    Add comments explaining how to install the necessary tools.
    Format as raw code (JS or YAML). Do not include markdown fences.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text || "Failed to generate Commit Config.";
};
