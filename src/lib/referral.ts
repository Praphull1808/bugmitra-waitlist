/**
 * src/lib/referral.ts
 *
 * This file contains helpers for generating referral codes and tracking referral rewards.
 */

/**
 * Generate a unique 7-character uppercase alphanumeric referral code.
 * E.g., "MITR123" or similar.
 */
export function generateReferralCode(name: string): string {
  // Clean name: extract initials or first few letters, uppercase them
  const prefix = name
    .trim()
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase();
  
  const paddedPrefix = (prefix.padEnd(3, 'B')).substring(0, 3);
  
  // Add 4 random alphanumeric characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  for (let i = 0; i < 4; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `${paddedPrefix}${randomStr}`;
}

export interface ReferralReward {
  tier: string;
  badge: string;
  countNeeded: number;
  unlocked: boolean;
  perks: string;
}

/**
 * Get the reward details for a user based on their referral count.
 */
export function getReferralRewards(count: number): ReferralReward[] {
  return [
    {
      tier: 'Early Access',
      badge: '🚀 Beta Member',
      countNeeded: 3,
      unlocked: count >= 3,
      perks: 'Get access to BugMitra 1 week before the public launch.'
    },
    {
      tier: 'Lifetime Pro',
      badge: '✨ Pro Badge',
      countNeeded: 10,
      unlocked: count >= 10,
      perks: 'Lifetime free access to topic-wise premium rooms and AI assistance.'
    },
    {
      tier: 'Exclusive Founder',
      badge: '👑 Founder Badge',
      countNeeded: 25,
      unlocked: count >= 25,
      perks: 'Get featured on the contributor board and private direct messaging with community creators.'
    }
  ];
}

/**
 * Get current badge for a user based on their referral count.
 */
export function getUserBadge(count: number): { badge: string; color: string } | null {
  if (count >= 25) {
    return { badge: 'Exclusive Founder', color: 'bg-amber-500/10 text-amber-400 border border-amber-500/30' };
  }
  if (count >= 10) {
    return { badge: 'Lifetime Pro', color: 'bg-purple-500/10 text-purple-400 border border-purple-500/30' };
  }
  if (count >= 3) {
    return { badge: 'Early Access Alpha', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/30' };
  }
  return null;
}
