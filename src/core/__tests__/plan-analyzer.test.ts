/**
 * Unit tests for Plan Analyzer module
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  analyzeTaskPlan, 
  extractDependenciesFromPackageJson, 
  extractDependenciesFromRequirements 
} from '../plan-analyzer';
import { TaskPlanInput } from '../../types/task';

// Mock the logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock the validators module
jest.mock('../../utils/validators', () => ({
  validate: (schema: any, data: any) => ({
    success: true,
    data: data
  })
}));

describe('Plan Analyzer', () => {
  describe('analyzeTaskPlan', () => {
    it('should detect npm tools from task description', async () => {
      const taskInput: TaskPlanInput = {
        task_description: 'Create a new npm package with TypeScript support',
        task_list: [
          {
            id: 'task-1',
            description: 'Initialize npm project and install dependencies',
            dependencies: []
          }
        ],
        project_context: 'Node.js development project'
      };

      const result = await analyzeTaskPlan(taskInput);
      
      expect(result.detected_tools).toHaveLength(1);
      expect(result.detected_tools[0].tool_name).toBe('npm');
      expect(result.detected_tools[0].category).toBe('npm');
      expect(result.detected_tools[0].confidence).toBeGreaterThan(0.3);
    });

    it('should detect python tools from task description', async () => {
      const taskInput: TaskPlanInput = {
        task_description: 'Set up a Python Flask web application with pip requirements',
        task_list: [
          {
            id: 'task-1',
            description: 'Create virtual environment and install Flask',
            dependencies: []
          }
        ],
        project_context: 'Python web development'
      };

      const result = await analyzeTaskPlan(taskInput);
      
      expect(result.detected_tools).toHaveLength(1);
      expect(result.detected_tools[0].tool_name).toBe('python');
      expect(result.detected_tools[0].category).toBe('python');
      expect(result.detected_tools[0].confidence).toBeGreaterThan(0.3);
    });

    it('should detect git tools from task description', async () => {
      const taskInput: TaskPlanInput = {
        task_description: 'Initialize git repository and push to GitHub',
        task_list: [
          {
            id: 'task-1',
            description: 'Clone repository and create new branch',
            dependencies: []
          }
        ],
        project_context: 'Version control setup'
      };

      const result = await analyzeTaskPlan(taskInput);
      
      expect(result.detected_tools).toHaveLength(1);
      expect(result.detected_tools[0].tool_name).toBe('git');
      expect(result.detected_tools[0].category).toBe('git');
      expect(result.detected_tools[0].confidence).toBeGreaterThan(0.3);
    });

    it('should detect database tools from task description', async () => {
      const taskInput: TaskPlanInput = {
        task_description: 'Set up PostgreSQL database with Prisma ORM',
        task_list: [
          {
            id: 'task-1',
            description: 'Configure database connection and run migrations',
            dependencies: []
          }
        ],
        project_context: 'Database setup'
      };

      const result = await analyzeTaskPlan(taskInput);
      
      expect(result.detected_tools).toHaveLength(1);
      expect(result.detected_tools[0].tool_name).toBe('database');
      expect(result.detected_tools[0].category).toBe('database');
      expect(result.detected_tools[0].confidence).toBeGreaterThan(0.3);
    });

    it('should detect docker tools from task description', async () => {
      const taskInput: TaskPlanInput = {
        task_description: 'Containerize application with Docker and docker-compose',
        task_list: [
          {
            id: 'task-1',
            description: 'Create Dockerfile and docker-compose.yml',
            dependencies: []
          }
        ],
        project_context: 'Containerization'
      };

      const result = await analyzeTaskPlan(taskInput);
      
      expect(result.detected_tools).toHaveLength(1);
      expect(result.detected_tools[0].tool_name).toBe('docker');
      expect(result.detected_tools[0].category).toBe('docker');
      expect(result.detected_tools[0].confidence).toBeGreaterThan(0.3);
    });

    it('should detect api tools from task description', async () => {
      const taskInput: TaskPlanInput = {
        task_description: 'Create REST API endpoints and test with axios',
        task_list: [
          {
            id: 'task-1',
            description: 'Implement API endpoints and add integration tests',
            dependencies: []
          }
        ],
        project_context: 'API development'
      };

      const result = await analyzeTaskPlan(taskInput);
      
      expect(result.detected_tools.length).toBeGreaterThanOrEqual(1);
      const apiTool = result.detected_tools.find(tool => tool.tool_name === 'api');
      expect(apiTool).toBeDefined();
      expect(apiTool!.category).toBe('api');
      expect(apiTool!.confidence).toBeGreaterThan(0.3);
    });

    it('should detect multiple tools from complex task', async () => {
      const taskInput: TaskPlanInput = {
        task_description: 'Build a full-stack application with React frontend, Node.js backend, PostgreSQL database, and Docker containers',
        task_list: [
          {
            id: 'task-1',
            description: 'Set up npm project with TypeScript and React',
            dependencies: []
          },
          {
            id: 'task-2',
            description: 'Create Express.js API with Prisma ORM',
            dependencies: ['task-1']
          },
          {
            id: 'task-3',
            description: 'Configure PostgreSQL database and run migrations',
            dependencies: ['task-2']
          },
          {
            id: 'task-4',
            description: 'Create Dockerfile and docker-compose for deployment',
            dependencies: ['task-3']
          }
        ],
        project_context: 'Full-stack web application'
      };

      const result = await analyzeTaskPlan(taskInput);
      
      expect(result.detected_tools.length).toBeGreaterThanOrEqual(3);
      
      const toolNames = result.detected_tools.map(t => t.tool_name);
      expect(toolNames).toContain('npm');
      expect(toolNames).toContain('database');
      expect(toolNames).toContain('docker');
    });

    it('should generate appropriate recommendations', async () => {
      const taskInput: TaskPlanInput = {
        task_description: 'Set up npm project with git version control',
        task_list: [
          {
            id: 'task-1',
            description: 'Initialize npm and git repository',
            dependencies: []
          }
        ],
        project_context: 'Project setup'
      };

      const result = await analyzeTaskPlan(taskInput);
      
      expect(result.recommendations).toContain('Consider using npm-mcp for package management operations');
      expect(result.recommendations).toContain('Consider using git-mcp for version control operations');
    });

    it('should handle empty task list', async () => {
      const taskInput: TaskPlanInput = {
        task_description: 'Simple task without subtasks',
        task_list: [],
        project_context: 'Simple project'
      };

      const result = await analyzeTaskPlan(taskInput);
      
      expect(result.detected_tools).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should handle task with no detected tools', async () => {
      const taskInput: TaskPlanInput = {
        task_description: 'Write documentation and plan project structure',
        task_list: [
          {
            id: 'task-1',
            description: 'Create README and project documentation',
            dependencies: []
          }
        ],
        project_context: 'Documentation project'
      };

      const result = await analyzeTaskPlan(taskInput);
      
      expect(result.detected_tools).toHaveLength(0);
      expect(result.recommendations).toContain('No specific tools detected. Consider manual MCP selection based on project requirements.');
    });

    it('should provide recommendation for large task lists', async () => {
      const taskInput: TaskPlanInput = {
        task_description: 'Complex project with many subtasks',
        task_list: Array.from({ length: 10 }, (_, i) => ({
          id: `task-${i + 1}`,
          description: `Task ${i + 1} description`,
          dependencies: i > 0 ? [`task-${i}`] : []
        })),
        project_context: 'Large project'
      };

      const result = await analyzeTaskPlan(taskInput);
      
      expect(result.recommendations).toContain('Large number of subtasks detected. Consider breaking down into smaller, more focused tasks.');
    });

    it('should detect framework-specific patterns', async () => {
      const taskInput: TaskPlanInput = {
        task_description: 'Create a React application with Next.js and Redux',
        task_list: [
          {
            id: 'task-1',
            description: 'Set up Next.js project with React components and Redux store',
            dependencies: []
          }
        ],
        project_context: 'React frontend development'
      };

      const result = await analyzeTaskPlan(taskInput);
      
      expect(result.recommendations.some(rec => 
        rec.includes('react') && rec.includes('framework-specific')
      )).toBe(true);
    });

    it('should handle invalid input gracefully', async () => {
      // Test with invalid input that will cause validation to fail
      const invalidInput = {
        task_description: '', // Invalid: empty string
        task_list: null // Invalid: null instead of array
      };

      await expect(analyzeTaskPlan(invalidInput as any)).rejects.toThrow();
    });
  });

  describe('extractDependenciesFromPackageJson', () => {
    it('should extract dependencies from valid package.json', () => {
      const packageJsonContent = JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'express': '^4.18.0',
          'lodash': '^4.17.21'
        },
        devDependencies: {
          'typescript': '^4.9.0',
          'jest': '^29.0.0'
        },
        peerDependencies: {
          'react': '^18.0.0'
        }
      });

      const dependencies = extractDependenciesFromPackageJson(packageJsonContent);
      
      expect(dependencies).toContain('express');
      expect(dependencies).toContain('lodash');
      expect(dependencies).toContain('typescript');
      expect(dependencies).toContain('jest');
      expect(dependencies).toContain('react');
      expect(dependencies).toHaveLength(5);
    });

    it('should handle package.json with missing dependency sections', () => {
      const packageJsonContent = JSON.stringify({
        name: 'test-project',
        version: '1.0.0'
      });

      const dependencies = extractDependenciesFromPackageJson(packageJsonContent);
      
      expect(dependencies).toHaveLength(0);
    });

    it('should handle empty package.json', () => {
      const packageJsonContent = JSON.stringify({});

      const dependencies = extractDependenciesFromPackageJson(packageJsonContent);
      
      expect(dependencies).toHaveLength(0);
    });

    it('should handle invalid JSON gracefully', () => {
      const packageJsonContent = 'invalid json content';

      const dependencies = extractDependenciesFromPackageJson(packageJsonContent);
      
      expect(dependencies).toHaveLength(0);
    });

    it('should handle null/undefined values in dependencies', () => {
      const packageJsonContent = JSON.stringify({
        name: 'test-project',
        dependencies: {
          'valid-dep': '^1.0.0',
          'null-dep': null,
          'undefined-dep': undefined
        }
      });

      const dependencies = extractDependenciesFromPackageJson(packageJsonContent);
      
      expect(dependencies).toContain('valid-dep');
      expect(dependencies).toContain('null-dep');
      // undefined values are filtered out by Object.keys()
    });
  });

  describe('extractDependenciesFromRequirements', () => {
    it('should extract dependencies from requirements.txt', () => {
      const requirementsContent = `
# Web framework
Flask==2.3.0
Django>=4.0.0,<5.0.0

# Database
psycopg2-binary>=2.9.0
SQLAlchemy==1.4.0

# Testing
pytest>=7.0.0
pytest-cov>=4.0.0

# Development
black>=22.0.0
flake8>=5.0.0
      `;

      const dependencies = extractDependenciesFromRequirements(requirementsContent);
      
      expect(dependencies).toContain('Flask');
      expect(dependencies).toContain('Django');
      expect(dependencies).toContain('psycopg2-binary');
      expect(dependencies).toContain('SQLAlchemy');
      expect(dependencies).toContain('pytest');
      expect(dependencies).toContain('pytest-cov');
      expect(dependencies).toContain('black');
      expect(dependencies).toContain('flake8');
      expect(dependencies).toHaveLength(8);
    });

    it('should handle empty requirements.txt', () => {
      const requirementsContent = '';

      const dependencies = extractDependenciesFromRequirements(requirementsContent);
      
      expect(dependencies).toHaveLength(0);
    });

    it('should handle requirements.txt with only comments', () => {
      const requirementsContent = `
# This is a comment
# Another comment
      `;

      const dependencies = extractDependenciesFromRequirements(requirementsContent);
      
      expect(dependencies).toHaveLength(0);
    });

    it('should handle requirements.txt with empty lines', () => {
      const requirementsContent = `
Flask==2.3.0

Django>=4.0.0

# Comment
pytest>=7.0.0
      `;

      const dependencies = extractDependenciesFromRequirements(requirementsContent);
      
      expect(dependencies).toContain('Flask');
      expect(dependencies).toContain('Django');
      expect(dependencies).toContain('pytest');
      expect(dependencies).toHaveLength(3);
    });

    it('should handle requirements.txt with complex version specifiers', () => {
      const requirementsContent = `
package1==1.0.0
package2>=2.0.0,<3.0.0
package3~=1.1.0
package4!=1.0.0
package5>=1.0.0,!=1.1.0,<2.0.0
      `;

      const dependencies = extractDependenciesFromRequirements(requirementsContent);
      
      expect(dependencies).toContain('package1');
      expect(dependencies).toContain('package2');
      expect(dependencies).toContain('package3~'); // The ~ is preserved in the split
      expect(dependencies).toContain('package4');
      expect(dependencies).toContain('package5');
      expect(dependencies).toHaveLength(5);
    });

    it('should handle requirements.txt with git URLs', () => {
      const requirementsContent = `
Flask==2.3.0
git+https://github.com/user/repo.git@branch
git+ssh://git@github.com/user/repo.git@tag
      `;

      const dependencies = extractDependenciesFromRequirements(requirementsContent);
      
      expect(dependencies).toContain('Flask');
      expect(dependencies).toContain('git+https://github.com/user/repo.git@branch');
      expect(dependencies).toContain('git+ssh://git@github.com/user/repo.git@tag');
      expect(dependencies).toHaveLength(3); // Git URLs are not filtered out in current implementation
    });

    it('should handle requirements.txt with file paths', () => {
      const requirementsContent = `
Flask==2.3.0
./local-package
../relative-package
      `;

      const dependencies = extractDependenciesFromRequirements(requirementsContent);
      
      expect(dependencies).toContain('Flask');
      expect(dependencies).toContain('./local-package');
      expect(dependencies).toContain('../relative-package');
      expect(dependencies).toHaveLength(3); // File paths are not filtered out in current implementation
    });
  });
});
