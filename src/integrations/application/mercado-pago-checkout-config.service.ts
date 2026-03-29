import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type MercadoPagoCheckoutBackUrls = {
  success: string;
  failure: string;
  pending: string;
};

export type MercadoPagoCheckoutPreferenceConfig = {
  backUrls?: MercadoPagoCheckoutBackUrls;
  autoReturn?: 'approved';
  notificationUrl?: string;
};

function readTrimmedOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

@Injectable()
export class MercadoPagoCheckoutConfigService {
  constructor(private readonly configService: ConfigService) {}

  getPreferenceConfig(): MercadoPagoCheckoutPreferenceConfig {
    const successUrl = this.readUrl(
      'MERCADO_PAGO_SUCCESS_URL',
      'Mercado Pago success back URL',
      ['http:', 'https:'],
    );
    const failureUrl = this.readUrl(
      'MERCADO_PAGO_FAILURE_URL',
      'Mercado Pago failure back URL',
      ['http:', 'https:'],
    );
    const pendingUrl = this.readUrl(
      'MERCADO_PAGO_PENDING_URL',
      'Mercado Pago pending back URL',
      ['http:', 'https:'],
    );

    const configuredBackUrlCount = [
      successUrl,
      failureUrl,
      pendingUrl,
    ].filter(Boolean).length;

    if (configuredBackUrlCount > 0 && configuredBackUrlCount < 3) {
      throw new ConflictException(
        'Mercado Pago Checkout Pro back URLs must configure success, failure, and pending together',
      );
    }

    const backUrls =
      configuredBackUrlCount === 3
        ? {
            success: successUrl!,
            failure: failureUrl!,
            pending: pendingUrl!,
          }
        : undefined;

    const notificationUrl = this.readUrl(
      'MERCADO_PAGO_NOTIFICATION_URL',
      'Mercado Pago notification URL',
      ['https:'],
    );

    return {
      backUrls,
      autoReturn: backUrls ? 'approved' : undefined,
      notificationUrl,
    };
  }

  private readUrl(
    key: string,
    label: string,
    allowedProtocols: readonly string[],
  ) {
    const rawValue = readTrimmedOptionalString(this.configService.get<string>(key));

    if (!rawValue) {
      return undefined;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(rawValue);
    } catch {
      throw new ConflictException(`${label} must be a valid absolute URL`);
    }

    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      const protocols = allowedProtocols.join(' or ');

      throw new ConflictException(
        `${label} must use ${protocols.replace(':', '')}`,
      );
    }

    return parsedUrl.toString();
  }
}
