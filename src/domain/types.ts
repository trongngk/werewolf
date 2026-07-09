export type PlayerStatus = 'alive' | 'dead';
export type Team = 'villager' | 'werewolf' | 'neutral' | 'other';

export type Player = {
  id: string;
  name: string;
  roleId?: string;
  status: PlayerStatus;
};

export type Role = {
  id: string;
  name: string;
  icon: string;
  team: Team;
  assignmentCount: number;
  nightOrder?: number;
  wakesAtNight: boolean;
  firstNightOnly?: boolean;
  description: string;
  moderatorInstruction: string;
};

export type NightState = {
  guardTargetId?: string;
  wolfTargetId?: string;
  witchSaved: boolean;
  witchPoisonTargetId?: string;
  hunterTargetId?: string;
  seerTargetId?: string;
  apprenticeSeerTargetId?: string;
  sorceressTargetId?: string;
  spellcasterTargetId?: string;
};

export type Game = {
  id: string;
  createdAt: string;
  status: 'assigning' | 'playing' | 'finished';
  currentRound: number;
  players: Player[];
  roles: Role[];
  lovers?: string[];
  nurturedChildId?: string;
  princeRevealed?: boolean;
  lastGuardTargetId?: string;
  lastHunterTargetId?: string;
  silencedPlayerId?: string;
  witchHealAvailable: boolean;
  witchPoisonAvailable: boolean;
  night?: NightState;
  morningMessages: string[];
  dayMessages: string[];
  history?: string[];
  resultMessage?: string;
};
