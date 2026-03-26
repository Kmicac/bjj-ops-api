import { Test, TestingModule } from '@nestjs/testing';
import { ReceiveMercadoPagoWebhookUseCase } from './application/use-cases/receive-mercado-pago-webhook.use-case';
import { IntegrationsWebhooksController } from './integrations-webhooks.controller';

describe('IntegrationsWebhooksController', () => {
  let controller: IntegrationsWebhooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationsWebhooksController],
      providers: [
        {
          provide: ReceiveMercadoPagoWebhookUseCase,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<IntegrationsWebhooksController>(
      IntegrationsWebhooksController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
