import AsyncStorage from '@react-native-async-storage/async-storage';
import { createGame } from '../domain/game';
import { DEFAULT_ROLES } from '../domain/roles';
import { clearGame, loadGame, saveGame } from './gameStorage';

describe('game storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('saves, restores and clears the current game', async () => {
    const game = createGame(['An', 'Bình'], DEFAULT_ROLES);

    await saveGame(game);
    expect(await loadGame()).toEqual(game);

    await clearGame();
    expect(await loadGame()).toBeNull();
  });
});
