import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_ROLES } from '../domain/roles';
import { Game } from '../domain/types';

const ACTIVE_GAME_KEY = '@werewolf-moderator/active-game';

export const loadGame = async (): Promise<Game | null> => {
  const value = await AsyncStorage.getItem(ACTIVE_GAME_KEY);
  if (!value) return null;
  const game = JSON.parse(value) as Game;
  return {
    ...game,
    roles: game.roles.map((role) => {
      const defaultRole = DEFAULT_ROLES.find((item) => item.id === role.id);
      if (!defaultRole) return { ...role, icon: role.icon ?? '⭐' };
      return {
        ...role,
        icon: role.icon ?? defaultRole.icon,
        team: defaultRole.team,
        wakesAtNight: defaultRole.wakesAtNight,
        firstNightOnly: defaultRole.firstNightOnly,
        nightOrder: defaultRole.nightOrder,
      };
    }),
    witchHealAvailable: game.witchHealAvailable ?? true,
    witchPoisonAvailable: game.witchPoisonAvailable ?? true,
    morningMessages: game.morningMessages ?? [],
    dayMessages: game.dayMessages ?? [],
  };
};

export const saveGame = (game: Game) => AsyncStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify(game));

export const clearGame = () => AsyncStorage.removeItem(ACTIVE_GAME_KEY);
