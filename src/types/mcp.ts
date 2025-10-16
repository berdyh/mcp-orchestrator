/**
 * MCP (Model Context Protocol) Type Definitions
 * 
 * This module contains TypeScript interfaces and types for MCP server metadata,
 * registry entries, and related structures.
 */

import { z } from 'zod';

/**
 * Credential requirement for MCP servers
 */
export interface CredentialRequirement {
  keyName: string;
  envVarName: string;
  description: string;
  optional: boolean;
  obtainUrl?: string;
  validationPattern?: RegExp;
}

/**
 * Discovery metadata for MCP servers
 */
export interface DiscoveryMetadata {
  source: string;
  discoveredAt: Date;
  confidence: number;
  lastVerified: Date;
}

/**
 * Usage statistics for MCP servers
 */
export interface UsageStats {
  timesUsed: number;
  lastUsed: Date;
  averageSuccessRate: number;
}

/**
 * MCP Registry Entry
 */
export interface MCPRegistryEntry {
  id: string;
  name: string;
  category: string[];
  repository: string;
  npmPackage?: string;
  installCommand: string;
  configurationSchema: object;
  requiredCredentials: CredentialRequirement[];
  documentationUrl: string;
  examples: string[];
  discoveryMetadata: DiscoveryMetadata;
  usageStats: UsageStats;
}

/**
 * MCP Server Status
 */
export type MCPServerStatus = 'pending' | 'installing' | 'active' | 'error' | 'inactive';

/**
 * Attached MCP Server
 */
export interface AttachedMCP {
  mcpId: string;
  mcpName: string;
  reason: string;
  status: MCPServerStatus;
  configPath: string;
  availableTools: string[];
}

/**
 * MCP Discovery Result
 */
export interface MCPDiscoveryResult {
  mcp_name: string;
  repository_url: string;
  npm_package?: string;
  documentation_url: string;
  setup_instructions: string;
  required_credentials: string[];
  confidence_score: number;
  category?: string;
  last_updated?: string;
}

/**
 * MCP Search Result
 */
export interface MCPSearchResult {
  results: MCPRegistryEntry[];
  source_reliability: Record<string, number>;
}

/**
 * MCP Integration Code
 */
export interface MCPIntegrationCode {
  installation_command: string;
  configuration_json: object;
  setup_code: string;
  verification_steps: string[];
}

/**
 * Zod schemas for validation
 */
export const CredentialRequirementSchema = z.object({
  keyName: z.string().min(1),
  envVarName: z.string().min(1),
  description: z.string().min(1),
  optional: z.boolean(),
  obtainUrl: z.string().url().optional(),
  validationPattern: z.instanceof(RegExp).optional(),
});

export const DiscoveryMetadataSchema = z.object({
  source: z.string().min(1),
  discoveredAt: z.date(),
  confidence: z.number().min(0).max(1),
  lastVerified: z.date(),
});

export const UsageStatsSchema = z.object({
  timesUsed: z.number().min(0),
  lastUsed: z.date(),
  averageSuccessRate: z.number().min(0).max(1),
});

export const MCPRegistryEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.array(z.string()),
  repository: z.string().url(),
  npmPackage: z.string().optional(),
  installCommand: z.string().min(1),
  configurationSchema: z.object({}),
  requiredCredentials: z.array(CredentialRequirementSchema),
  documentationUrl: z.string().url(),
  examples: z.array(z.string()),
  discoveryMetadata: DiscoveryMetadataSchema,
  usageStats: UsageStatsSchema,
});

export const AttachedMCPSchema = z.object({
  mcpId: z.string().min(1),
  mcpName: z.string().min(1),
  reason: z.string().min(1),
  status: z.enum(['pending', 'installing', 'active', 'error', 'inactive']),
  configPath: z.string().min(1),
  availableTools: z.array(z.string()),
});

export const MCPDiscoveryResultSchema = z.object({
  mcp_name: z.string().min(1),
  repository_url: z.string().url(),
  npm_package: z.string().optional(),
  documentation_url: z.string().url(),
  setup_instructions: z.string().min(1),
  required_credentials: z.array(z.string()),
  confidence_score: z.number().min(0).max(1),
});

export const MCPIntegrationCodeSchema = z.object({
  installation_command: z.string().min(1),
  configuration_json: z.object({}),
  setup_code: z.string().min(1),
  verification_steps: z.array(z.string()),
});

