import api from './api';
import type { ApiResponse } from '@/types';
import type { GamificationProfile, Badge, LeaderboardEntry, DailyChallenge } from '@/types/gamification';

export const gamificationService = {
  async getProfile(userId: string) {
    const res = await api.get<ApiResponse<GamificationProfile>>(`/gamification/profile/${userId}`);
    return res.data.data;
  },

  async getMyProfile() {
    const res = await api.get<ApiResponse<GamificationProfile>>('/gamification/profile/me');
    return res.data.data;
  },

  async awardXp(userId: string, amount: number, source: string) {
    const res = await api.post<ApiResponse<{ xp: number; level: number; newBadges: string[] }>>('/gamification/xp', { userId, amount, source });
    return res.data.data;
  },

  async awardCoins(userId: string, amount: number, source: string) {
    const res = await api.post<ApiResponse<{ coins: number; newBadges: string[] }>>('/gamification/coins', { userId, amount, source });
    return res.data.data;
  },

  async getAllBadges() {
    const res = await api.get<ApiResponse<Badge[]>>('/gamification/badges');
    return res.data.data;
  },

  async getUserBadges(userId: string) {
    const res = await api.get<ApiResponse<Badge[]>>(`/gamification/badges/${userId}`);
    return res.data.data;
  },

  async getMyBadges() {
    const res = await api.get<ApiResponse<Badge[]>>('/gamification/badges/me');
    return res.data.data;
  },

  async getLeaderboard(limit = 50) {
    const res = await api.get<ApiResponse<LeaderboardEntry[]>>('/gamification/leaderboard', { params: { limit } });
    return res.data.data;
  },

  async getClassLeaderboard(classId: string, limit = 50) {
    const res = await api.get<ApiResponse<LeaderboardEntry[]>>(`/gamification/leaderboard/class/${classId}`, { params: { limit } });
    return res.data.data;
  },

  async getDailyChallenges() {
    const res = await api.get<ApiResponse<DailyChallenge[]>>('/gamification/daily-challenges');
    return res.data.data;
  },

  async completeDailyChallenge(id: string) {
    const res = await api.post<ApiResponse<{ xp: number; coins: number; alreadyCompleted: boolean }>>(`/gamification/daily-challenges/${id}/complete`);
    return res.data.data;
  },

  async getStreak(userId: string) {
    const res = await api.get<ApiResponse<{ streak: number; lastActiveDate: string | null }>>(`/gamification/streak/${userId}`);
    return res.data.data;
  },

  async updateStreak() {
    const res = await api.get<ApiResponse<GamificationProfile>>('/gamification/streak/me');
    return res.data.data;
  },
};
