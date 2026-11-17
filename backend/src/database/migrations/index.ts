import { InitialSchema1794000000000 } from './1794000000000-InitialSchema.js';
import { PaymentReceipts1794099600000 } from './1794099600000-PaymentReceipts.js';
import { SupportTickets1794180000000 } from './1794180000000-SupportTickets.js';

import { PromotionCampaigns1794186000000 } from './1794186000000-PromotionCampaigns.js';

/** Shared by the application, CLI and integration tests; append future migrations here. */
export const ALL_MIGRATIONS = [InitialSchema1794000000000, PaymentReceipts1794099600000, SupportTickets1794180000000, PromotionCampaigns1794186000000];
