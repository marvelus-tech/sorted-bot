import { Pet } from '../types';

export function calculateDailyConsumption(pet: Pet): number {
  // Base: 25g per kg body weight for dogs, 20g for cats
  const base = pet.type === 'dog' ? 25 : 20;
  let daily = pet.weight * base;

  // Age adjustment
  if (pet.age < 12) daily *= 1.5; // Puppy/kitten
  else if (pet.age > 84) daily *= 0.8; // Senior

  // Activity adjustment
  if (pet.activityLevel === 'low') daily *= 0.9;
  if (pet.activityLevel === 'high') daily *= 1.2;

  // Breed adjustments (simplified)
  if (pet.type === 'dog') {
    const largeBreeds = ['Great Dane', 'Mastiff', 'Saint Bernard', 'Newfoundland'];
    if (largeBreeds.includes(pet.breed)) daily *= 1.1;
  }

  return Math.round(daily);
}

export function calculateDaysRemaining(remainingWeight: number, dailyConsumption: number): number {
  if (dailyConsumption <= 0) return 0;
  return Math.floor(remainingWeight / dailyConsumption);
}

export function shouldReorder(daysRemaining: number, threshold: number = 7): boolean {
  return daysRemaining <= threshold;
}

export function getConsumptionSummary(pet: Pet, remainingWeight: number): string {
  const daily = calculateDailyConsumption(pet);
  const daysLeft = calculateDaysRemaining(remainingWeight, daily);
  const weekly = daily * 7;
  const monthly = daily * 30;

  return `📊 *Consumption Stats for ${pet.name}*\n\n` +
    `Daily: ${daily}g\n` +
    `Weekly: ${weekly}g\n` +
    `Monthly: ${monthly}g\n\n` +
    `Days remaining: ${daysLeft} days`;
}
