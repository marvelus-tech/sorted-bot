export function formatDays(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)}kg`;
  }
  return `${grams}g`;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function calculateDaysRemaining(remainingWeight: number, dailyConsumption: number): number {
  if (dailyConsumption <= 0) return 0;
  return Math.floor(remainingWeight / dailyConsumption);
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

export const COMMON_BRANDS = [
  'Blue Buffalo', 'Royal Canin', 'Hill\'s Science Diet', 'Purina Pro Plan',
  'Wellness', 'Merrick', 'Orijen', 'Acana', 'Taste of the Wild',
  'Canidae', 'Nutro', 'Iams', 'Eukanuba', 'Pedigree', 'Friskies',
  'Fancy Feast', 'Whiskas', 'Meow Mix', 'Sheba', 'Tiki Cat'
];

export const DOG_BREEDS = [
  'Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'Bulldog',
  'Beagle', 'Poodle', 'Rottweiler', 'Yorkshire Terrier', 'Boxer',
  'Dachshund', 'Siberian Husky', 'Australian Shepherd', 'Great Dane',
  'Doberman', 'Shih Tzu', 'Chihuahua', 'Pug', 'Border Collie',
  'Cocker Spaniel', 'Other'
];

export const CAT_BREEDS = [
  'Domestic Shorthair', 'Domestic Longhair', 'Persian', 'Maine Coon',
  'Siamese', 'Ragdoll', 'Bengal', 'Sphynx', 'British Shorthair',
  'Scottish Fold', 'Russian Blue', 'Abyssinian', 'Birman',
  'Oriental', 'Norwegian Forest Cat', 'Other'
];
