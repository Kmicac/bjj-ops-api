import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ReceiveMercadoPagoWebhookUseCase } from './application/use-cases/receive-mercado-pago-webhook.use-case';
import { MercadoPagoWebhookNotificationDto } from './dto/mercado-pago-webhook-notification.dto';

@SkipThrottle()
@Controller({
  path: 'integrations/webhooks/mercado-pago',
  version: '1',
})
export class IntegrationsWebhooksController {
  constructor(
    private readonly receiveMercadoPagoWebhookUseCase: ReceiveMercadoPagoWebhookUseCase,
  ) {}

  @Post()
  @HttpCode(201)
  receiveMercadoPagoWebhook(
    @Body() body: MercadoPagoWebhookNotificationDto,
    @Query() query: Record<string, string | string[] | undefined>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.receiveMercadoPagoWebhookUseCase.execute({
      body,
      query,
      headers,
    });
  }
}
