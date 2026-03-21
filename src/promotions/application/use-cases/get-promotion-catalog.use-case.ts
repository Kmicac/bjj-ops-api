import { Injectable } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../../../auth/authenticated-principal.interface';
import {
  listPromotionRankCatalog,
  listPromotionTrackCatalog,
} from '../../domain/promotion-rank-catalog';
import { PromotionsPolicy } from '../../domain/promotions.policy';

@Injectable()
export class GetPromotionCatalogUseCase {
  constructor(private readonly promotionsPolicy: PromotionsPolicy) {}

  execute(principal: AuthenticatedPrincipal, organizationId: string) {
    this.promotionsPolicy.ensureCanViewCatalog(principal, organizationId);

    return {
      tracks: listPromotionTrackCatalog(),
      ranks: listPromotionRankCatalog(),
    };
  }
}
