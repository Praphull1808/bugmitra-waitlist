export interface WaitlistUser {
  id: string;
  full_name: string;
  email: string;
  skill_level: 'Beginner' | 'Student' | 'Freelancer' | 'Developer';
  coding_problem: 'HTML' | 'CSS' | 'JavaScript' | 'Python' | 'React' | 'Other';
  referral_code: string;
  referred_by: string | null;
  referral_count: number;
  position: number;
  joined_at: string;
}

export interface WaitlistStats {
  totalUsers: number;
  todaySignups: number;
  referralLeaderboard: {
    full_name: string;
    referral_count: number;
    position: number;
  }[];
}

export interface SignupRequest {
  full_name: string;
  email: string;
  skill_level: 'Beginner' | 'Student' | 'Freelancer' | 'Developer';
  coding_problem: 'HTML' | 'CSS' | 'JavaScript' | 'Python' | 'React' | 'Other';
  referred_by?: string | null;
}

export interface SignupResponse {
  success: boolean;
  message: string;
  user?: WaitlistUser;
  isNew?: boolean;
}
