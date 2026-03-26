import { ConflictException, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

type ConnectionCandidate = {
  id: string;
  applicationId?: string;
  webhookSecret?: string;
};

export type MercadoPagoWebhookValidationResult = {
  connectionId: string;
  requestId: string;
  signatureTimestamp: string;
  dataId: string;
};

function asTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function safeHexToBuffer(value: string) {
  try {
    return Buffer.from(value, 'hex');
  } catch {
    return null;
  }
}

@Injectable()
export class MercadoPagoWebhookPolicy {
  validateSignature(params: {
    xSignature?: string;
    xRequestId?: string;
    dataId?: string;
    applicationId?: string;
    connections: ConnectionCandidate[];
  }): MercadoPagoWebhookValidationResult | null {
    const signatureHeader = asTrimmedString(params.xSignature);
    const requestId = asTrimmedString(params.xRequestId);
    const dataId = asTrimmedString(params.dataId)?.toLowerCase();

    if (!signatureHeader || !requestId || !dataId) {
      return null;
    }

    const parsedSignature = this.parseSignatureHeader(signatureHeader);

    if (!parsedSignature) {
      return null;
    }

    const manifest = `id:${dataId};request-id:${requestId};ts:${parsedSignature.ts};`;
    const candidateConnections = this.filterByApplicationId(
      params.connections,
      params.applicationId,
    );
    const matchedConnections = candidateConnections.filter((connection) =>
      this.matchesSignature(
        manifest,
        parsedSignature.v1,
        connection.webhookSecret,
      ),
    );

    if (matchedConnections.length > 1) {
      throw new ConflictException(
        'Mercado Pago webhook signature matched multiple active integrations',
      );
    }

    if (matchedConnections.length === 0) {
      return null;
    }

    return {
      connectionId: matchedConnections[0].id,
      requestId,
      signatureTimestamp: parsedSignature.ts,
      dataId,
    };
  }

  private filterByApplicationId(
    connections: ConnectionCandidate[],
    applicationId?: string,
  ) {
    const normalizedApplicationId = asTrimmedString(applicationId);

    if (!normalizedApplicationId) {
      return connections;
    }

    const sameApplicationConnections = connections.filter(
      (connection) => connection.applicationId === normalizedApplicationId,
    );

    return sameApplicationConnections.length > 0
      ? sameApplicationConnections
      : connections;
  }

  private parseSignatureHeader(header: string) {
    const entries = header.split(',');
    const signatureParts = entries.reduce<Record<string, string>>(
      (carry, entry) => {
        const [key, value] = entry.split('=');
        const normalizedKey = asTrimmedString(key);
        const normalizedValue = asTrimmedString(value);

        if (normalizedKey && normalizedValue) {
          carry[normalizedKey] = normalizedValue;
        }

        return carry;
      },
      {},
    );

    if (!signatureParts.ts || !signatureParts.v1) {
      return null;
    }

    return {
      ts: signatureParts.ts,
      v1: signatureParts.v1,
    };
  }

  private matchesSignature(
    manifest: string,
    signature: string,
    secret?: string,
  ) {
    const normalizedSecret = asTrimmedString(secret);

    if (!normalizedSecret) {
      return false;
    }

    const expectedSignature = createHmac('sha256', normalizedSecret)
      .update(manifest)
      .digest('hex');
    const expectedBuffer = safeHexToBuffer(expectedSignature);
    const signatureBuffer = safeHexToBuffer(signature);

    if (!expectedBuffer || !signatureBuffer) {
      return false;
    }

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer);
  }
}
