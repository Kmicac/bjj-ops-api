import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IntegrationSecretConfigService } from './integration-secret-config.service';

describe('IntegrationSecretConfigService', () => {
  let service: IntegrationSecretConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationSecretConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockReturnValue(Buffer.alloc(32, 7).toString('base64')),
          },
        },
      ],
    }).compile();

    service = module.get<IntegrationSecretConfigService>(
      IntegrationSecretConfigService,
    );
  });

  it('encrypts and decrypts provider config payloads', () => {
    const encrypted = service.encryptObject({
      accessToken: 'APP_USR-12345678901234567890',
      environment: 'test',
    });
    const decrypted = service.decryptObject(encrypted);

    expect(encrypted.kind).toBe('encrypted');
    expect(decrypted).toEqual({
      accessToken: 'APP_USR-12345678901234567890',
      environment: 'test',
    });
  });
});
