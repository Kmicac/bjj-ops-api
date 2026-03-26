import { ConflictException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { MercadoPagoWebhookPolicy } from './mercado-pago-webhook.policy';

describe('MercadoPagoWebhookPolicy', () => {
  let policy: MercadoPagoWebhookPolicy;

  beforeEach(() => {
    policy = new MercadoPagoWebhookPolicy();
  });

  it('validates a webhook signature against the matching configured secret', () => {
    const manifest = 'id:123456;request-id:req-1;ts:1742505638683;';
    const signature = createHmac('sha256', 'secret_123')
      .update(manifest)
      .digest('hex');

    const result = policy.validateSignature({
      xSignature: `ts=1742505638683,v1=${signature}`,
      xRequestId: 'req-1',
      dataId: '123456',
      connections: [
        {
          id: 'integration_1',
          webhookSecret: 'secret_123',
        },
      ],
    });

    expect(result).toEqual({
      connectionId: 'integration_1',
      requestId: 'req-1',
      signatureTimestamp: '1742505638683',
      dataId: '123456',
    });
  });

  it('returns null when the signature is invalid', () => {
    const result = policy.validateSignature({
      xSignature: 'ts=1742505638683,v1=invalid',
      xRequestId: 'req-1',
      dataId: '123456',
      connections: [
        {
          id: 'integration_1',
          webhookSecret: 'secret_123',
        },
      ],
    });

    expect(result).toBeNull();
  });

  it('narrows candidates by applicationId when available', () => {
    const manifest = 'id:123456;request-id:req-1;ts:1742505638683;';
    const signature = createHmac('sha256', 'secret_app_2')
      .update(manifest)
      .digest('hex');

    const result = policy.validateSignature({
      xSignature: `ts=1742505638683,v1=${signature}`,
      xRequestId: 'req-1',
      dataId: '123456',
      applicationId: 'app_2',
      connections: [
        {
          id: 'integration_1',
          applicationId: 'app_1',
          webhookSecret: 'secret_app_1',
        },
        {
          id: 'integration_2',
          applicationId: 'app_2',
          webhookSecret: 'secret_app_2',
        },
      ],
    });

    expect(result?.connectionId).toBe('integration_2');
  });

  it('fails when the signature matches more than one connection', () => {
    const manifest = 'id:123456;request-id:req-1;ts:1742505638683;';
    const signature = createHmac('sha256', 'shared_secret')
      .update(manifest)
      .digest('hex');

    expect(() =>
      policy.validateSignature({
        xSignature: `ts=1742505638683,v1=${signature}`,
        xRequestId: 'req-1',
        dataId: '123456',
        connections: [
          {
            id: 'integration_1',
            webhookSecret: 'shared_secret',
          },
          {
            id: 'integration_2',
            webhookSecret: 'shared_secret',
          },
        ],
      }),
    ).toThrow(ConflictException);
  });
});
