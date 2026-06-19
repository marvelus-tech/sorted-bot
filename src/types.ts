export interface Pet {
  id: string;
  userId: string;
  name: string;
  type: string; // 'dog' | 'cat' — using string for Prisma compatibility
  breed: string;
  age: number; // months
  weight: number; // kg
  activityLevel: string; // 'low' | 'moderate' | 'high'
  preferredBrands: string[];
  dietaryRestrictions: string[];
}

export interface InventoryItem {
  id: string;
  petId: string;
  productName: string;
  brand: string;
  variant: string;
  totalWeight: number; // grams
  remainingWeight: number; // grams
  dailyConsumption: number; // grams/day
  reorderThreshold: number; // days
  lastUpdated: Date;
}

export interface PriceCheck {
  vendor: 'amazon' | 'chewy' | 'petco' | 'walmart';
  productName: string;
  price: number;
  url: string;
  inStock: boolean;
  shipping: number;
  totalPrice: number;
  estimatedDelivery: string;
}

export interface OrderItem {
  productName: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  petId: string;
  status: 'pending_approval' | 'approved' | 'placed' | 'delivered' | 'cancelled';
  items: OrderItem[];
  vendor: string;
  totalAmount: number;
  affiliateUrl?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  createdAt: Date;
}

export interface OnboardingState {
  step: 'name' | 'pet_name' | 'pet_type' | 'breed' | 'age' | 'weight' | 'activity' | 'brands' | 'complete';
  data: Partial<{
    name: string;
    petName: string;
    petType: 'dog' | 'cat';
    breed: string;
    age: number;
    weight: number;
    activityLevel: 'low' | 'moderate' | 'high';
    preferredBrands: string[];
  }>;
}
