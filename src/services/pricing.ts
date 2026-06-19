import { PriceCheck } from '../types';

// Mock price data for MVP - replace with real scraping in v2
const MOCK_PRICES: Record<string, PriceCheck[]> = {
  'Blue Buffalo Adult Chicken': [
    {
      vendor: 'amazon',
      productName: 'Blue Buffalo Life Protection Formula Adult Chicken & Brown Rice Recipe',
      price: 4299,
      url: 'https://www.amazon.com/dp/B0009YUGA8?tag=sorted0f-20',
      inStock: true,
      shipping: 0,
      totalPrice: 4299,
      estimatedDelivery: '2 days'
    },
    {
      vendor: 'chewy',
      productName: 'Blue Buffalo Life Protection Formula Adult Chicken & Brown Rice Recipe',
      price: 4499,
      url: 'https://www.chewy.com/blue-buffalo-life-protection-formula/dp/34691?utm_source=affiliate&utm_medium=sorted',
      inStock: true,
      shipping: 499,
      totalPrice: 4998,
      estimatedDelivery: '1-2 days'
    },
    {
      vendor: 'petco',
      productName: 'Blue Buffalo Life Protection Formula Adult Chicken & Brown Rice Recipe',
      price: 4699,
      url: 'https://www.petco.com/shop/en/petcostore/product/blue-buffalo-life-protection-formula',
      inStock: true,
      shipping: 0,
      totalPrice: 4699,
      estimatedDelivery: '2-3 days'
    }
  ],
  'Royal Canin Medium Adult': [
    {
      vendor: 'amazon',
      productName: 'Royal Canin Medium Breed Adult Dry Dog Food',
      price: 5899,
      url: 'https://www.amazon.com/dp/B0032BK6GK?tag=sorted0f-20',
      inStock: true,
      shipping: 0,
      totalPrice: 5899,
      estimatedDelivery: '2 days'
    },
    {
      vendor: 'chewy',
      productName: 'Royal Canin Size Health Nutrition Medium Adult Dry Dog Food',
      price: 5999,
      url: 'https://www.chewy.com/royal-canin-size-health-nutrition/dp/29673?utm_source=affiliate&utm_medium=sorted',
      inStock: true,
      shipping: 499,
      totalPrice: 6498,
      estimatedDelivery: '1-2 days'
    }
  ],
  'Hill\'s Science Diet Adult': [
    {
      vendor: 'amazon',
      productName: 'Hill\'s Science Diet Adult No Corn, Wheat or Soy Chicken Recipe',
      price: 5499,
      url: 'https://www.amazon.com/dp/B01BKN3UV0?tag=sorted0f-20',
      inStock: true,
      shipping: 0,
      totalPrice: 5499,
      estimatedDelivery: '2 days'
    },
    {
      vendor: 'petco',
      productName: 'Hill\'s Science Diet Adult No Corn, Wheat or Soy',
      price: 5699,
      url: 'https://www.petco.com/shop/en/petcostore/product/hills-science-diet-adult',
      inStock: true,
      shipping: 0,
      totalPrice: 5699,
      estimatedDelivery: '2-3 days'
    }
  ]
};

export async function checkPrices(productName: string): Promise<PriceCheck[]> {
  // Try exact match first
  if (MOCK_PRICES[productName]) {
    return MOCK_PRICES[productName];
  }

  // Try partial match
  for (const [key, prices] of Object.entries(MOCK_PRICES)) {
    if (productName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(productName.toLowerCase())) {
      return prices;
    }
  }

  // Return generic prices if no match
  return [
    {
      vendor: 'amazon',
      productName: productName,
      price: 4999,
      url: `https://www.amazon.com/s?k=${encodeURIComponent(productName)}&tag=sorted0f-20`,
      inStock: true,
      shipping: 0,
      totalPrice: 4999,
      estimatedDelivery: '2 days'
    },
    {
      vendor: 'chewy',
      productName: productName,
      price: 5299,
      url: `https://www.chewy.com/app/search?query=${encodeURIComponent(productName)}&utm_source=affiliate&utm_medium=sorted`,
      inStock: true,
      shipping: 499,
      totalPrice: 5798,
      estimatedDelivery: '1-2 days'
    }
  ];
}

export function findBestDeal(prices: PriceCheck[]): PriceCheck {
  return prices.reduce((best, current) => 
    current.totalPrice < best.totalPrice ? current : best
  );
}

export function formatPriceComparison(prices: PriceCheck[], bestDeal: PriceCheck): string {
  let message = `💰 *Price Comparison*\n\n`;
  
  prices.forEach(price => {
    const isBest = price.vendor === bestDeal.vendor;
    const savings = price.totalPrice - bestDeal.totalPrice;
    const icon = isBest ? '✅' : '•';
    const savingsText = savings > 0 ? ` (Save $${(savings/100).toFixed(2)})` : '';
    
    message += `${icon} *${price.vendor.toUpperCase()}*\n`;
    message += `   $${(price.totalPrice/100).toFixed(2)}${savingsText}\n`;
    message += `   Delivery: ${price.estimatedDelivery}\n\n`;
  });

  return message;
}
