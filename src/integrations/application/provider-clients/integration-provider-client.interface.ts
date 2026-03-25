import {
  IntegrationProvider,
  IntegrationSyncKind,
  IntegrationSyncStatus,
} from '../../../generated/prisma/enums';

export type IntegrationProviderTestConnectionResult = {
  status: IntegrationSyncStatus;
  summaryJson?: Record<string, unknown>;
  errorMessage?: string;
};

export interface IntegrationProviderClient {
  readonly providerName: IntegrationProvider;
  readonly supportedSyncKinds: readonly IntegrationSyncKind[];

  validateConfig(config: unknown): Record<string, unknown>;

  testConnection(
    config: Record<string, unknown>,
  ): Promise<IntegrationProviderTestConnectionResult>;
}
