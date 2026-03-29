import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoCheckoutConfigService } from './mercado-pago-checkout-config.service';

describe('MercadoPagoCheckoutConfigService', () => {
  let service: MercadoPagoCheckoutConfigService;
  let configService: {
    get: jest.Mock;
  };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string | undefined> = {
          MERCADO_PAGO_SUCCESS_URL: 'http://localhost:3001/payments/success',
          MERCADO_PAGO_FAILURE_URL: 'http://localhost:3001/payments/failure',
          MERCADO_PAGO_PENDING_URL: 'http://localhost:3001/payments/pending',
          MERCADO_PAGO_NOTIFICATION_URL:
            'https://payments.example.com/api/v1/integrations/webhooks/mercado-pago',
        };

        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MercadoPagoCheckoutConfigService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<MercadoPagoCheckoutConfigService>(
      MercadoPagoCheckoutConfigService,
    );
  });

  it('returns back_urls, auto_return and notification_url from environment', () => {
    expect(service.getPreferenceConfig()).toEqual({
      backUrls: {
        success: 'http://localhost:3001/payments/success',
        failure: 'http://localhost:3001/payments/failure',
        pending: 'http://localhost:3001/payments/pending',
      },
      autoReturn: 'approved',
      notificationUrl:
        'https://payments.example.com/api/v1/integrations/webhooks/mercado-pago',
    });
  });

  it('rejects partial back_urls configuration', () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string | undefined> = {
        MERCADO_PAGO_SUCCESS_URL: 'http://localhost:3001/payments/success',
        MERCADO_PAGO_FAILURE_URL: undefined,
        MERCADO_PAGO_PENDING_URL: 'http://localhost:3001/payments/pending',
        MERCADO_PAGO_NOTIFICATION_URL: undefined,
      };

      return values[key];
    });

    expect(() => service.getPreferenceConfig()).toThrow(ConflictException);
    expect(() => service.getPreferenceConfig()).toThrow(
      'Mercado Pago Checkout Pro back URLs must configure success, failure, and pending together',
    );
  });

  it('rejects notification_url values that are not https', () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, string | undefined> = {
        MERCADO_PAGO_SUCCESS_URL: undefined,
        MERCADO_PAGO_FAILURE_URL: undefined,
        MERCADO_PAGO_PENDING_URL: undefined,
        MERCADO_PAGO_NOTIFICATION_URL:
          'http://localhost:3001/api/v1/integrations/webhooks/mercado-pago',
      };

      return values[key];
    });

    expect(() => service.getPreferenceConfig()).toThrow(ConflictException);
    expect(() => service.getPreferenceConfig()).toThrow(
      'Mercado Pago notification URL must use https',
    );
  });
});
