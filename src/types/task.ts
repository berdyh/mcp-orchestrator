/**
 * Task and Subtask Type Definitions
 * 
 * This module contains TypeScript interfaces and types for task analysis,
 * subtask management, and task-to-MCP mapping.
 */

import { z } from 'zod';

/**
 * Detected tool from task analysis
 */
export interface DetectedTool {
  tool_name: string;
  category: 'npm' | 'python' | 'git' | 'database' | 'docker' | 'api' | 'other';
  confidence: number;
  relevant_subtasks: string[];
}

/**
 * Task analysis result
 */
export interface TaskAnalysisResult {
  detected_tools: DetectedTool[];
  recommendations: string[];
}

/**
 * Subtask definition
 */
export interface Subtask {
  id: string;
  description: string;
  dependencies: string[];
  tools?: string[];
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * Task definition
 */
export interface Task {
  id: string;
  description: string;
  subtasks: Subtask[];
  project_context?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * Task-MCP mapping for subtasks
 */
export interface SubtaskMCPMapping {
  subtaskId: string;
  taskDescription: string;
  requiredTools: string[];
  attachedMCPs: Array<{
    mcpId: string;
    mcpName: string;
    reason: string;
    status: 'pending' | 'installing' | 'active' | 'error';
    configPath: string;
    availableTools: string[];
  }>;
  credentialsReady: boolean;
  executionReady: boolean;
}

/**
 * Task plan input
 */
export interface TaskPlanInput {
  task_description: string;
  task_list: Array<{
    id: string;
    description: string;
    dependencies?: string[] | undefined;
  }>;
  project_context?: string;
}

/**
 * MCP attachment result
 */
export interface MCPAttachmentResult {
  attached_mcps: Array<{
    name: string;
    status: 'active' | 'installing' | 'error';
    available_tools: string[];
  }>;
  ready_to_execute: boolean;
}

/**
 * Zod schemas for validation
 */
export const DetectedToolSchema = z.object({
  tool_name: z.string().min(1),
  category: z.enum(['npm', 'python', 'git', 'database', 'docker', 'api', 'other']),
  confidence: z.number().min(0).max(1),
  relevant_subtasks: z.array(z.string()),
});

export const TaskAnalysisResultSchema = z.object({
  detected_tools: z.array(DetectedToolSchema),
  recommendations: z.array(z.string()),
});

export const SubtaskSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  dependencies: z.array(z.string()),
  tools: z.array(z.string()).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
});

export const TaskSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  subtasks: z.array(SubtaskSchema),
  project_context: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
});

export const SubtaskMCPMappingSchema = z.object({
  subtaskId: z.string().min(1),
  taskDescription: z.string().min(1),
  requiredTools: z.array(z.string()),
  attachedMCPs: z.array(z.object({
    mcpId: z.string().min(1),
    mcpName: z.string().min(1),
    reason: z.string().min(1),
    status: z.enum(['pending', 'installing', 'active', 'error']),
    configPath: z.string().min(1),
    availableTools: z.array(z.string()),
  })),
  credentialsReady: z.boolean(),
  executionReady: z.boolean(),
});

export const TaskPlanInputSchema = z.object({
  task_description: z.string().min(1),
  task_list: z.array(z.object({
    id: z.string().min(1),
    description: z.string().min(1),
    dependencies: z.array(z.string()).optional().default([]),
  })),
  project_context: z.string().optional(),
});

export const MCPAttachmentResultSchema = z.object({
  attached_mcps: z.array(z.object({
    name: z.string().min(1),
    status: z.enum(['active', 'installing', 'error']),
    available_tools: z.array(z.string()),
  })),
  ready_to_execute: z.boolean(),
});

