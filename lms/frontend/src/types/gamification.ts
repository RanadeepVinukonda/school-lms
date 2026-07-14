export interface GamificationProfile {
  userId: string;
  xp: number;
  coins: number;
  level: number;
  streak: number;
  badges: string[];
  lessonsCompleted: number;
  perfectScores: number;
  highAccuracyCount: number;
  challengesCompleted: number;
  lastActiveDate: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned?: boolean;
  earnedAt?: string;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  xp: number;
  level: number;
  rank: number;
  avatar?: string;
}

export interface DailyChallenge {
  id: string;
  userId: string;
  date: string;
  title: string;
  description: string;
  xpReward: number;
  coinReward: number;
  type: string;
  target: number;
  progress: number;
  completed: boolean;
  createdAt?: string;
}
