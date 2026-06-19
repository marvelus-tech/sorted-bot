import { PriceCheck } from '../types';

// Affiliate tag configuration
const AFFILIATE_TAGS = {
  amazon: 'sorted0f-20',
  chewy: 'sorted',
  petco: 'sorted',
  walmart: 'sorted'
};

export function generateAffiliateLink(vendor: string, productUrl: string, productName: string): string {
  const tag = AFFILIATE_TAGS[vendor as keyof typeof AFFILIATE_TAGS];
  
  switch (vendor) {
    case 'amazon':
      // Amazon format: https://www.amazon.com/dp/{ASIN}?tag={ASSOCIATE_TAG}
      return `${productUrl}?tag=${tag}`;
    
    case 'chewy':
      // Chewy format: add UTM params
      const separator = productUrl.includes('?') ? '&' : '?';
      return `${productUrl}${separator}utm_source=affiliate&utm_medium=${tag}&utm_campaign=petfood`;
    
    case 'petco':
      // Petco format
      return `${productUrl}?affiliate_id=${tag}`;
    
    case 'walmart':
      // Walmart format
      return `${productUrl}?affiliate=${tag}`;
    
    default:
      return productUrl;
  }
}

export function trackClick(userId: string, orderId: string, vendor: string): void {
  // Analytics tracking - store in database or send to analytics service
  console.log(`[AFFILIATE] Click tracked: user=${userId}, order=${orderId}, vendor=${vendor}`);
  
  // TODO: Store in analytics table
  // prisma.analytics.create({
  //   data: {
  //     userId,
  //     eventType: 'click',
  //     vendor,
  //     eventData: { orderId }
  //   }
  // });
}

export function trackConversion(userId: string, orderId: string, vendor: string, revenue: number): void {
  console.log(`[AFFILIATE] Conversion tracked: user=${userId}, order=${orderId}, vendor=${vendor}, revenue=${revenue}`);
  
  // TODO: Store conversion in analytics
  // prisma.analytics.create({
  //   data: {
  //     userId,
  //     eventType: 'conversion',
  //     vendor,
  //     revenue,
  //     eventData: { orderId }
  //   }
  // });
}

export function getVendorDisplayName(vendor: string): string {
  const names: Record<string, string> = {
    amazon: 'Amazon',
    chewy: 'Chewy',
    petco: 'Petco',
    walmart: 'Walmart'
  };
  return names[vendor] || vendor;
}
