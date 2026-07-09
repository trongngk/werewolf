import { Game, NightState, Player, Role } from './types';

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const emptyNight = (): NightState => ({ witchSaved: false });

export const createGame = (names: string[], roles: Role[]): Game => ({
  id: makeId(),
  createdAt: new Date().toISOString(),
  status: 'assigning',
  currentRound: 1,
  players: names.map((name) => name.trim()).filter(Boolean).map((name) => ({
    id: makeId(), name, status: 'alive',
  })),
  roles,
  witchHealAvailable: true,
  witchPoisonAvailable: true,
  morningMessages: [],
  dayMessages: [],
  history: [],
});

const appendHistory = (game: Game, entries: string[]): string[] =>
  [...(game.history ?? []), ...entries];

export const getAssignmentRoles = (game: Game) =>
  game.roles.filter((role) => role.assignmentCount > 0 && role.wakesAtNight)
    .sort((a, b) => (a.nightOrder ?? 999) - (b.nightOrder ?? 999));

export const getNightRoles = (game: Game) =>
  game.roles.filter((role) => role.assignmentCount > 0 && role.wakesAtNight)
    .filter((role) => !role.firstNightOnly)
    .sort((a, b) => (a.nightOrder ?? 999) - (b.nightOrder ?? 999));

export const getPlayersForRole = (game: Game, roleId: string) =>
  game.players.filter((player) => player.roleId === roleId);

export const getPlayerRole = (roles: Role[], player: Player) =>
  roles.find((role) => role.id === player.roleId);

export const toggleRoleAssignment = (game: Game, playerId: string, role: Role): Game => {
  const selected = getPlayersForRole(game, role.id);
  const target = game.players.find((player) => player.id === playerId);
  if (!target) return game;
  const removing = target.roleId === role.id;
  if (!removing && (target.roleId || selected.length >= role.assignmentCount)) return game;
  return {
    ...game,
    players: game.players.map((player) =>
      player.id === playerId ? { ...player, roleId: removing ? undefined : role.id } : player),
  };
};

export const togglePlayerStatus = (game: Game, playerId: string): Game => {
  const target = game.players.find((player) => player.id === playerId);
  if (!target) return game;
  if (target.status === 'dead') {
    return { ...game, players: game.players.map((player) => player.id === playerId ? { ...player, status: 'alive' } : player) };
  }
  return applyDeaths(game, new Set([playerId])).game;
};

export const hangPlayer = (game: Game, playerId: string): Game => {
  const player = game.players.find((item) => item.id === playerId);
  if (!player || player.status === 'dead') return game;
  if (player.roleId === 'prince') {
    const message = `${player.name} là Hoàng tử. Lá bài được lật lên và ${player.name} không bị treo cổ.`;
    return { ...game, dayMessages: [message], history: appendHistory(game, [`Ngày ${game.currentRound}: ${message}`]) };
  }
  const deaths = new Set([playerId]);
  const messages = [`${player.name} đã bị treo cổ.`];
  addLoverDeaths(game, deaths, messages);
  if (player.roleId === 'hunter' && game.lastHunterTargetId && game.lastHunterTargetId !== playerId) {
    deaths.add(game.lastHunterTargetId);
    messages.push(`${playerName(game, game.lastHunterTargetId)} chết theo do kỹ năng Thợ săn.`);
    addLoverDeaths(game, deaths, messages);
  }
  const updated = applyDeaths(game, deaths).game;
  const loggedMessages = messages.map((message) => `Ngày ${game.currentRound}: ${message}`);
  if (player.roleId === 'desperate') {
    const resultMessage = `${player.name} là Kẻ chán đời và đã bị treo cổ. Kẻ chán đời thắng. Trò chơi kết thúc.`;
    return {
      ...updated,
      status: 'finished',
      dayMessages: messages,
      resultMessage,
      history: appendHistory(game, [...loggedMessages, resultMessage]),
    };
  }
  return evaluateWinner({ ...updated, dayMessages: messages, history: appendHistory(game, loggedMessages) });
};

export const assignedCount = (game: Game) => game.players.filter((player) => player.roleId).length;

export const completeNightZero = (game: Game): Game | null => {
  const villagerCount = game.roles.find((role) => role.id === 'villager')?.assignmentCount ?? 0;
  const unassigned = game.players.filter((player) => !player.roleId);
  if (unassigned.length !== villagerCount) return null;
  return {
    ...game,
    status: 'playing',
    players: game.players.map((player) => player.roleId ? player : { ...player, roleId: 'villager' }),
  };
};

export const beginNight = (game: Game): Game => ({ ...game, night: emptyNight(), morningMessages: [], dayMessages: [] });

export const selectNightTarget = (
  game: Game,
  field: Exclude<keyof NightState, 'witchSaved'>,
  playerId?: string,
): Game => ({ ...game, night: { ...(game.night ?? emptyNight()), [field]: playerId } });

export const toggleLover = (game: Game, playerId: string): Game => {
  const selected = game.lovers?.includes(playerId) ?? false;
  if (!selected && (game.lovers?.length ?? 0) >= 2) return game;
  return {
    ...game,
    lovers: selected ? game.lovers?.filter((id) => id !== playerId) : [...(game.lovers ?? []), playerId],
  };
};

export const toggleWitchSave = (game: Game): Game => {
  if (!game.witchHealAvailable || !game.night?.wolfTargetId) return game;
  return { ...game, night: { ...game.night, witchSaved: !game.night.witchSaved } };
};

export const isGuardTargetAllowed = (game: Game, playerId: string) =>
  playerId !== game.lastGuardTargetId;

export const getSorceressResult = (game: Game, playerId: string) => {
  const player = game.players.find((item) => item.id === playerId);
  return player?.roleId === 'seer' ? 'Là Tiên tri' : 'Không phải Tiên tri';
};

export const getSeerResult = (game: Game, playerId: string) => {
  const player = game.players.find((item) => item.id === playerId);
  if (!player?.roleId || player.roleId === 'alpha-wolf') return 'Không phải Sói';
  return getPlayerRole(game.roles, player)?.team === 'werewolf' ? 'Là Sói' : 'Không phải Sói';
};

export const resolveNight = (game: Game): Game => {
  const night = game.night ?? emptyNight();
  const lovers = game.lovers;
  const resolutionGame = { ...game, lovers };
  const deaths = new Set<string>();
  const messages: string[] = [];
  const wolfWasBlocked = Boolean(night.wolfTargetId && night.guardTargetId === night.wolfTargetId);
  const wolfTarget = game.players.find((player) => player.id === night.wolfTargetId);
  const cursedTransforms = Boolean(wolfTarget?.roleId === 'cursed' && !wolfWasBlocked && !night.witchSaved);

  if (night.wolfTargetId && !wolfWasBlocked && !night.witchSaved && !cursedTransforms) deaths.add(night.wolfTargetId);
  if (night.witchPoisonTargetId) deaths.add(night.witchPoisonTargetId);
  addLoverDeaths(resolutionGame, deaths, messages);

  const hunter = game.players.find((player) => player.roleId === 'hunter');
  if (hunter && deaths.has(hunter.id) && night.hunterTargetId && night.hunterTargetId !== hunter.id) {
    deaths.add(night.hunterTargetId);
    messages.push(`Thợ săn kéo theo ${playerName(game, night.hunterTargetId)}.`);
  }
  addLoverDeaths(resolutionGame, deaths, messages);

  if (!night.wolfTargetId) messages.push('Phe Sói chưa chọn mục tiêu.');
  else if (wolfWasBlocked) messages.push(`Bảo vệ đã cứu ${playerName(game, night.wolfTargetId)} khỏi Sói.`);
  else if (night.witchSaved) messages.push(`Phù thủy đã cứu ${playerName(game, night.wolfTargetId)}.`);
  else if (cursedTransforms) messages.push(`${playerName(game, night.wolfTargetId)} là Bị nguyền và đã trở thành Sói. Hãy thông báo riêng cho người chơi này.`);
  else messages.push(`${playerName(game, night.wolfTargetId)} bị Sói cắn.`);

  if (night.witchPoisonTargetId) messages.push(`Phù thủy dùng bình độc với ${playerName(game, night.witchPoisonTargetId)}.`);
  if (night.spellcasterTargetId) messages.push(`${playerName(game, night.spellcasterTargetId)} bị phù phép và phải im lặng suốt ngày hôm nay.`);
  messages.push(deaths.size
    ? `Người chết trong đêm: ${[...deaths].map((id) => playerName(game, id)).join(', ')}.`
    : 'Không có ai chết trong đêm.');

  const resolved = {
    ...game,
    currentRound: game.currentRound + 1,
    lovers,
    lastGuardTargetId: night.guardTargetId ?? game.lastGuardTargetId,
    lastHunterTargetId: night.hunterTargetId ?? game.lastHunterTargetId,
    silencedPlayerId: night.spellcasterTargetId,
    witchHealAvailable: game.witchHealAvailable && !night.witchSaved,
    witchPoisonAvailable: game.witchPoisonAvailable && !night.witchPoisonTargetId,
    morningMessages: messages,
    history: appendHistory(game, messages.map((message) => `Đêm ${game.currentRound}: ${message}`)),
    night: undefined,
    players: game.players.map((player) => {
      if (deaths.has(player.id)) return { ...player, status: 'dead' as const };
      if (cursedTransforms && player.id === night.wolfTargetId) return { ...player, roleId: 'werewolf' };
      return player;
    }),
  };
  return evaluateWinner(resolved);
};

const playerName = (game: Game, playerId: string) =>
  game.players.find((player) => player.id === playerId)?.name ?? 'người chơi';

const addLoverDeaths = (game: Game, deaths: Set<string>, messages: string[]) => {
  if (!game.lovers?.some((id) => deaths.has(id))) return;
  game.lovers.forEach((id) => {
    if (!deaths.has(id)) messages.push(`${playerName(game, id)} chết theo người yêu.`);
    deaths.add(id);
  });
};

const applyDeaths = (game: Game, deaths: Set<string>) => {
  const messages: string[] = [];
  addLoverDeaths(game, deaths, messages);
  return {
    messages,
    game: { ...game, players: game.players.map((player) => deaths.has(player.id) ? { ...player, status: 'dead' as const } : player) },
  };
};

export const evaluateWinner = (game: Game): Game => {
  if (game.status === 'finished') return game;
  const alive = game.players.filter((player) => player.status === 'alive');
  const wolves = alive.filter((player) => getPlayerRole(game.roles, player)?.team === 'werewolf');
  const others = alive.length - wolves.length;
  const aliveLovers = game.lovers?.filter((id) => alive.some((player) => player.id === id)) ?? [];
  const loverTeams = aliveLovers.map((id) => {
    const player = alive.find((item) => item.id === id)!;
    return getPlayerRole(game.roles, player)?.team;
  });

  const finish = (resultMessage: string): Game =>
    ({ ...game, status: 'finished', resultMessage, history: appendHistory(game, [resultMessage]) });

  if (alive.length === 2 && aliveLovers.length === 2 && loverTeams[0] !== loverTeams[1]) {
    return finish('Cặp đôi khác phe là hai người sống cuối cùng. Cặp đôi thắng. Trò chơi kết thúc.');
  }
  if (!wolves.length) return finish('Tất cả Sói đã bị loại. Phe Dân thắng. Trò chơi kết thúc.');
  if (wolves.length >= others) return finish('Số Sói đã bằng hoặc vượt số người còn lại. Phe Sói thắng. Trò chơi kết thúc.');
  return game;
};
