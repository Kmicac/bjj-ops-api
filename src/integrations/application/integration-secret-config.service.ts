import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';

type EncryptedIntegrationConfigEnvelope = {
  kind: 'encrypted';
  version: 1;
  algorithm: 'aes-256-gcm';
  keyRef: 'env:INTEGRATIONS_CONFIG_ENCRYPTION_KEY';
  iv: string;
  authTag: string;
  ciphertext: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isEncryptedEnvelope(
  value: unknown,
): value is EncryptedIntegrationConfigEnvelope {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    value.kind === 'encrypted' &&
    value.version === 1 &&
    value.algorithm === 'aes-256-gcm' &&
    value.keyRef === 'env:INTEGRATIONS_CONFIG_ENCRYPTION_KEY' &&
    typeof value.iv === 'string' &&
    typeof value.authTag === 'string' &&
    typeof value.ciphertext === 'string'
  );
}

@Injectable()
export class IntegrationSecretConfigService {
  constructor(private readonly configService: ConfigService) {}

  encryptObject(value: Record<string, unknown>): Prisma.InputJsonObject {
    const key = this.getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return {
      kind: 'encrypted',
      version: 1,
      algorithm: 'aes-256-gcm',
      keyRef: 'env:INTEGRATIONS_CONFIG_ENCRYPTION_KEY',
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    } satisfies Prisma.InputJsonObject;
  }

  decryptObject(
    value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  ): Record<string, unknown> | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (!isEncryptedEnvelope(value)) {
      throw new ConflictException(
        'Sensitive integration configuration must be re-saved before it can be used',
      );
    }

    const key = this.getEncryptionKey();

    try {
      const decipher = createDecipheriv(
        value.algorithm,
        key,
        Buffer.from(value.iv, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(value.authTag, 'base64'));

      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(value.ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8');
      const parsed = JSON.parse(plaintext);

      if (!isPlainObject(parsed)) {
        throw new ConflictException(
          'Sensitive integration configuration payload is invalid',
        );
      }

      return parsed;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw new ConflictException(
        'Sensitive integration configuration could not be decrypted',
      );
    }
  }

  private getEncryptionKey() {
    const configuredKey = this.configService.get<string>(
      'INTEGRATIONS_CONFIG_ENCRYPTION_KEY',
    );

    if (!configuredKey) {
      throw new InternalServerErrorException(
        'INTEGRATIONS_CONFIG_ENCRYPTION_KEY is not configured',
      );
    }

    const key = Buffer.from(configuredKey, 'base64');

    if (key.length !== 32) {
      throw new InternalServerErrorException(
        'INTEGRATIONS_CONFIG_ENCRYPTION_KEY is invalid',
      );
    }

    return key;
  }
}
