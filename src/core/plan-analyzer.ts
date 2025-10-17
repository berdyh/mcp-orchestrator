/**
 * Plan Analyzer Module
 * 
 * This module analyzes coding tasks and extracts required tools, libraries, and technologies.
 * It uses pattern matching, keyword detection, and context analysis to identify dependencies.
 */

import { createLogger } from '../utils/logger.js';
import type { 
  TaskPlanInput, 
  TaskAnalysisResult, 
  DetectedTool
} from '../types/task.js';
import { TaskPlanInputSchema } from '../types/task.js';
import { validate } from '../utils/validators.js';

const logger = createLogger('plan-analyzer');

/**
 * Tool detection patterns and keywords
 */
const TOOL_PATTERNS = {
  npm: {
    keywords: ['npm', 'node', 'nodejs', 'javascript', 'typescript', 'js', 'ts', 'package.json', 'yarn', 'pnpm'],
    patterns: [
      /npm\s+(install|add|init)/i,
      /package\.json/i,
      /node_modules/i,
      /yarn\s+(add|install)/i,
      /pnpm\s+(add|install)/i
    ],
    confidence: 0.9
  },
  python: {
    keywords: ['python', 'pip', 'requirements.txt', 'py', 'django', 'flask', 'fastapi', 'pytest', 'virtualenv', 'conda'],
    patterns: [
      /pip\s+(install|freeze)/i,
      /requirements\.txt/i,
      /python\s+[0-9]/i,
      /\.py$/i,
      /virtualenv/i,
      /conda\s+(install|create)/i
    ],
    confidence: 0.9
  },
  git: {
    keywords: ['git', 'github', 'gitlab', 'bitbucket', 'version control', 'commit', 'push', 'pull', 'clone', 'branch'],
    patterns: [
      /git\s+(clone|push|pull|commit|branch)/i,
      /github\.com/i,
      /gitlab\.com/i,
      /bitbucket\.org/i,
      /\.git$/i
    ],
    confidence: 0.8
  },
  database: {
    keywords: ['database', 'db', 'sql', 'postgresql', 'postgres', 'mysql', 'sqlite', 'mongodb', 'redis', 'prisma', 'sequelize', 'typeorm'],
    patterns: [
      /postgresql|postgres/i,
      /mysql/i,
      /sqlite/i,
      /mongodb|mongo/i,
      /redis/i,
      /prisma/i,
      /sequelize/i,
      /typeorm/i,
      /database/i
    ],
    confidence: 0.8
  },
  docker: {
    keywords: ['docker', 'container', 'dockerfile', 'docker-compose', 'kubernetes', 'k8s', 'podman'],
    patterns: [
      /docker/i,
      /dockerfile/i,
      /docker-compose/i,
      /kubernetes|k8s/i,
      /container/i
    ],
    confidence: 0.8
  },
  api: {
    keywords: ['api', 'rest', 'graphql', 'http', 'https', 'endpoint', 'microservice', 'service', 'fetch', 'axios', 'curl'],
    patterns: [
      /api/i,
      /rest/i,
      /graphql/i,
      /endpoint/i,
      /microservice/i,
      /fetch\(/i,
      /axios\./i,
      /curl/i
    ],
    confidence: 0.7
  }
};

/**
 * Framework and library patterns
 */
const FRAMEWORK_PATTERNS = {
  frontend: {
    react: ['react', 'jsx', 'component', 'hooks', 'redux', 'next.js', 'nextjs'],
    vue: ['vue', 'vue.js', 'nuxt', 'nuxtjs'],
    angular: ['angular', 'ng-', 'typescript'],
    svelte: ['svelte', 'sveltekit']
  },
  backend: {
    express: ['express', 'express.js'],
    fastapi: ['fastapi', 'uvicorn'],
    django: ['django', 'django-admin'],
    flask: ['flask', 'werkzeug'],
    spring: ['spring', 'spring boot', 'java']
  },
  mobile: {
    react_native: ['react-native', 'expo'],
    flutter: ['flutter', 'dart'],
    ionic: ['ionic', 'capacitor']
  }
};

/**
 * Analyzes a task plan and extracts required tools and technologies
 */
export async function analyzeTaskPlan(input: unknown): Promise<TaskAnalysisResult> {
  logger.info('Starting task plan analysis');
  
  try {
    // Validate input
    const validation = validate(TaskPlanInputSchema, input);
    if (!validation.success) {
      throw new Error(`Invalid input: ${validation.error}`);
    }
    
    const taskInput = validation.data!;
    logger.info(`Analyzing task: ${taskInput.task_description}`);
    
    // Combine all text for analysis
    const allText = [
      taskInput.task_description,
      ...taskInput.task_list.map(task => `${task.description} ${(task.dependencies || []).join(' ')}`),
      taskInput.project_context ?? ''
    ].join(' ').toLowerCase();
    
    // Detect tools
    const detectedTools = detectTools(allText, taskInput.task_list);
    
    // Generate recommendations
    const recommendations = generateRecommendations(detectedTools, {
      task_description: taskInput.task_description,
      task_list: taskInput.task_list,
      ...(taskInput.project_context !== undefined && { project_context: taskInput.project_context })
    });
    
    const result: TaskAnalysisResult = {
      detected_tools: detectedTools,
      recommendations
    };
    
    logger.info(`Analysis complete. Detected ${detectedTools.length} tools`);
    return result;
    
  } catch (error) {
    logger.error('Task plan analysis failed:', error);
    throw error;
  }
}

/**
 * Detects tools from text content and task list
 */
function detectTools(allText: string, taskList: TaskPlanInput['task_list']): DetectedTool[] {
  const detectedTools: DetectedTool[] = [];
  const toolScores = new Map<string, { score: number; subtasks: Set<string> }>();
  
  // Analyze each tool category
  for (const [category, config] of Object.entries(TOOL_PATTERNS)) {
    let score = 0;
    const relevantSubtasks = new Set<string>();
    
    // Check keywords
    for (const keyword of config.keywords) {
      if (allText.includes(keyword.toLowerCase())) {
        score += 0.3;
      }
    }
    
    // Check patterns
    for (const pattern of config.patterns) {
      if (pattern.test(allText)) {
        score += 0.4;
      }
    }
    
    // Check specific subtasks
    for (const task of taskList) {
      const taskText = `${task.description} ${(task.dependencies || []).join(' ')}`.toLowerCase();
      
      for (const keyword of config.keywords) {
        if (taskText.includes(keyword.toLowerCase())) {
          score += 0.2;
          relevantSubtasks.add(task.id);
        }
      }
      
      for (const pattern of config.patterns) {
        if (pattern.test(taskText)) {
          score += 0.3;
          relevantSubtasks.add(task.id);
        }
      }
    }
    
    // Normalize score and add if above threshold
    const normalizedScore = Math.min(score * config.confidence, 1.0);
    if (normalizedScore > 0.3) {
      toolScores.set(category, { score: normalizedScore, subtasks: relevantSubtasks });
    }
  }
  
  // Convert to DetectedTool array
  for (const [toolName, data] of toolScores.entries()) {
    detectedTools.push({
      tool_name: toolName,
      category: toolName as DetectedTool['category'],
      confidence: data.score,
      relevant_subtasks: Array.from(data.subtasks)
    });
  }
  
  // Sort by confidence
  detectedTools.sort((a, b) => b.confidence - a.confidence);
  
  return detectedTools;
}

/**
 * Generates recommendations based on detected tools
 */
function generateRecommendations(detectedTools: DetectedTool[], taskInput: TaskPlanInput): string[] {
  const recommendations: string[] = [];
  
  // Tool-specific recommendations
  for (const tool of detectedTools) {
    switch (tool.tool_name) {
      case 'npm':
        recommendations.push('Consider using npm-mcp for package management operations');
        break;
      case 'python':
        recommendations.push('Consider using python-mcp for Python environment management');
        break;
      case 'git':
        recommendations.push('Consider using git-mcp for version control operations');
        break;
      case 'database':
        recommendations.push('Consider using database-mcp for database operations');
        break;
      case 'docker':
        recommendations.push('Consider using docker-mcp for containerization tasks');
        break;
      case 'api':
        recommendations.push('Consider using api-mcp for API testing and integration');
        break;
    }
  }
  
  // General recommendations
  if (detectedTools.length === 0) {
    recommendations.push('No specific tools detected. Consider manual MCP selection based on project requirements.');
  }
  
  if (taskInput.task_list.length > 5) {
    recommendations.push('Large number of subtasks detected. Consider breaking down into smaller, more focused tasks.');
  }
  
    // Framework-specific recommendations
    const allText = [
      taskInput.task_description,
      ...taskInput.task_list.map(task => task.description),
      taskInput.project_context ?? ''
    ].join(' ').toLowerCase();
  
  for (const [category, frameworks] of Object.entries(FRAMEWORK_PATTERNS)) {
    for (const [framework, keywords] of Object.entries(frameworks)) {
      if (keywords.some(keyword => allText.includes(keyword.toLowerCase()))) {
        recommendations.push(`Detected ${framework} usage. Consider framework-specific MCP servers for better integration.`);
      }
    }
  }
  
  return recommendations;
}

/**
 * Extracts dependencies from package.json content (if provided)
 */
export function extractDependenciesFromPackageJson(packageJsonContent: string): string[] {
  try {
    const packageJson = JSON.parse(packageJsonContent);
    const dependencies = [
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {}),
      ...Object.keys(packageJson.peerDependencies || {})
    ];
    return dependencies;
  } catch (error) {
    logger.warn('Failed to parse package.json:', error);
    return [];
  }
}

/**
 * Extracts dependencies from requirements.txt content (if provided)
 */
export function extractDependenciesFromRequirements(requirementsContent: string): string[] {
  try {
    return requirementsContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split(/[>=<!=]/)[0]?.trim() ?? '')
      .filter(dep => dep.length > 0);
  } catch (error) {
    logger.warn('Failed to parse requirements.txt:', error);
    return [];
  }
}
