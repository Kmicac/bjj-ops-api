import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import { PromotionsPolicy } from '../../domain/promotions.policy';
import { PromotionsRepository } from '../../infrastructure/promotions.repository';

@Injectable()
export class GetPromotionDetailUseCase {
  constructor(
    private readonly promotionsPolicy: PromotionsPolicy,
    private readonly promotionsRepository: PromotionsRepository,
  ) {}

  async execute(
    principal: AuthenticatedPrincipal,
    organizationId: string,
    promotionId: string,
  ) {
    const promotion = await this.promotionsRepository.getPromotionDetailForAccess(
      organizationId,
      promotionId,
    );

    this.promotionsPolicy.ensureCanRead(principal, organizationId, promotion);
    return promotion;
  }
}
