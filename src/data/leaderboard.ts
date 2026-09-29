export interface LeaderboardEntry { name: string; total: number }

export const leaderboard: LeaderboardEntry[] = [
  { name: 'Reggie Reimer', total: 56 },
  { name: 'Nate S', total: 42 },
  { name: 'Mark Ariagno', total: 40 },
  { name: 'Nate Troxell', total: 40 },
  { name: 'Mark Kaiser', total: 31 },
]

export const leaderboardNote = 'Fifth place tied at 31; alphabetical tie-break.'