import { DEFAULT_ROLES, suggestRoleCounts } from './roles';
import { Game } from './types';
import {
  beginNight, canApprenticeSee, completeNightZero, createGame, evaluateWinner, getNightRoles, getPlayersForRole, getSeerResult, getSorceressResult, hangPlayer,
  isGuardTargetAllowed, isRoleAlive, resolveNight, selectNightTarget, setNurturedChild, toggleLover, togglePlayerStatus, toggleRoleAssignment, toggleWitchSave,
} from './game';

const rolesWith = (counts: Record<string, number>) =>
  DEFAULT_ROLES.map((role) => ({ ...role, assignmentCount: counts[role.id] ?? 0 }));

const gameWithAssignments = (assignments: Record<string, string>): Game => {
  const names = Object.keys(assignments);
  const game = createGame(names, rolesWith(Object.values(assignments).reduce<Record<string, number>>((counts, roleId) => {
    counts[roleId] = (counts[roleId] ?? 0) + 1;
    return counts;
  }, {})));
  return { ...game, players: game.players.map((player) => ({ ...player, roleId: assignments[player.name] })) };
};

describe('game domain', () => {
  test('assigns a role only up to its configured count', () => {
    const game = createGame(['An', 'Bình'], rolesWith({ seer: 1, villager: 1 }));
    const seer = game.roles.find((role) => role.id === 'seer')!;
    const assigned = toggleRoleAssignment(game, game.players[0].id, seer);
    const overLimit = toggleRoleAssignment(assigned, game.players[1].id, seer);
    expect(getPlayersForRole(overLimit, 'seer')).toHaveLength(1);
  });

  test('night one calls recurring roles only', () => {
    const game = createGame(['An', 'Bình'], rolesWith({ hunter: 1, 'alpha-wolf': 1 }));
    expect(getNightRoles(game).map((role) => role.id)).toEqual(['hunter']);
    expect(getNightRoles({ ...game, currentRound: 2 }).map((role) => role.id)).toEqual(['hunter']);
  });

  test('night zero assigns remaining players as villagers', () => {
    const game = gameWithAssignments({ An: 'seer', Bình: 'villager' });
    const withUnassignedVillager = { ...game, players: game.players.map((player) => player.name === 'Bình' ? { ...player, roleId: undefined } : player) };
    expect(completeNightZero(withUnassignedVillager)?.players[1].roleId).toBe('villager');
  });

  test('prevents guarding the same player on consecutive nights', () => {
    const game = createGame(['An'], rolesWith({ guard: 1 }));
    expect(isGuardTargetAllowed({ ...game, lastGuardTargetId: game.players[0].id }, game.players[0].id)).toBe(false);
  });

  test('guard prevents wolf bite and witch poison still kills', () => {
    let game = gameWithAssignments({ An: 'guard', Bình: 'villager', Chi: 'werewolf' });
    game = beginNight(game);
    game = selectNightTarget(game, 'guardTargetId', game.players[1].id);
    game = selectNightTarget(game, 'wolfTargetId', game.players[1].id);
    game = selectNightTarget(game, 'witchPoisonTargetId', game.players[2].id);
    game = resolveNight(game);
    expect(game.players.map((player) => player.status)).toEqual(['alive', 'alive', 'dead']);
    expect(game.witchPoisonAvailable).toBe(false);
  });

  test('witch saves bite and consumes heal potion', () => {
    let game = gameWithAssignments({ An: 'witch', Bình: 'villager', Chi: 'werewolf' });
    game = beginNight(game);
    game = selectNightTarget(game, 'wolfTargetId', game.players[1].id);
    game = toggleWitchSave(game);
    game = resolveNight(game);
    expect(game.players[1].status).toBe('alive');
    expect(game.witchHealAvailable).toBe(false);
  });

  test('hunter target dies with hunter and alpha wolf fools seer', () => {
    let game = gameWithAssignments({ An: 'hunter', Bình: 'villager', Chi: 'werewolf', Dũng: 'alpha-wolf' });
    game = beginNight(game);
    game = selectNightTarget(game, 'wolfTargetId', game.players[0].id);
    game = selectNightTarget(game, 'hunterTargetId', game.players[1].id);
    game = resolveNight(game);
    expect(game.players.slice(0, 2).map((player) => player.status)).toEqual(['dead', 'dead']);
    expect(getSeerResult(game, game.players[3].id)).toBe('Không phải Sói');
  });

  test('cupid links two players and lover follows a night death', () => {
    let game = gameWithAssignments({ An: 'cupid', Bình: 'villager', Chi: 'werewolf' });
    game = beginNight(game);
    game = toggleLover(game, game.players[0].id);
    game = toggleLover(game, game.players[1].id);
    game = selectNightTarget(game, 'wolfTargetId', game.players[1].id);
    game = resolveNight(game);
    expect(game.players.slice(0, 2).map((player) => player.status)).toEqual(['dead', 'dead']);
  });

  test('young mother cannot nurture herself but can nurture others', () => {
    const base = gameWithAssignments({ An: 'young-mother', Bình: 'villager' });
    expect(setNurturedChild(base, base.players[0].id).nurturedChildId).toBeUndefined();
    expect(setNurturedChild(base, base.players[1].id).nurturedChildId).toBe(base.players[1].id);
  });

  test('nurtured child dies with the young mother but not the other way around', () => {
    const base = gameWithAssignments({ An: 'young-mother', Bình: 'villager', Chi: 'werewolf' });
    const linked = { ...base, nurturedChildId: base.players[1].id };

    let motherDies = beginNight(linked);
    motherDies = selectNightTarget(motherDies, 'wolfTargetId', linked.players[0].id);
    motherDies = resolveNight(motherDies);
    expect(motherDies.players.slice(0, 2).map((player) => player.status)).toEqual(['dead', 'dead']);
    expect(motherDies.morningMessages).toContain('Bình chết theo Mẹ trẻ.');

    let childDies = beginNight(linked);
    childDies = selectNightTarget(childDies, 'wolfTargetId', linked.players[1].id);
    childDies = resolveNight(childDies);
    expect(childDies.players.slice(0, 2).map((player) => player.status)).toEqual(['alive', 'dead']);
  });

  test('apprentice seer is called every night, right after the seer', () => {
    const game = createGame(['An', 'Bình', 'Chi'], rolesWith({ seer: 1, 'apprentice-seer': 1, werewolf: 1 }));
    expect(getNightRoles(game).map((role) => role.id)).toEqual(['werewolf', 'seer', 'apprentice-seer']);
    expect(getNightRoles({ ...game, currentRound: 3 }).map((role) => role.id)).toEqual(['werewolf', 'seer', 'apprentice-seer']);
  });

  test('apprentice seer may only see once the seer is dead', () => {
    const base = gameWithAssignments({ An: 'seer', Bình: 'apprentice-seer', Chi: 'villager', Dũng: 'werewolf' });
    expect(canApprenticeSee(base)).toBe(false);
    let game = beginNight(base);
    game = selectNightTarget(game, 'wolfTargetId', base.players[0].id);
    game = resolveNight(game);
    expect(game.players[0].status).toBe('dead');
    expect(game.players[1].roleId).toBe('apprentice-seer');
    expect(isRoleAlive(game, 'seer')).toBe(false);
    expect(canApprenticeSee(game)).toBe(true);
    expect(game.morningMessages).toContain('Tiên tri đã chết. Từ đêm sau, Bình (Tiên tri tập sự) sẽ soi thay. Vẫn gọi Tiên tri mỗi đêm để che giấu thông tin.');
  });

  test('hanging the seer also notes the apprentice handover', () => {
    const base = gameWithAssignments({ An: 'seer', Bình: 'apprentice-seer', Chi: 'villager', Dũng: 'werewolf' });
    const resolved = hangPlayer(base, base.players[0].id);
    expect(canApprenticeSee(resolved)).toBe(true);
    expect(resolved.dayMessages).toContain('Tiên tri đã chết. Từ đêm sau, Bình (Tiên tri tập sự) sẽ soi thay. Vẫn gọi Tiên tri mỗi đêm để che giấu thông tin.');
  });

  test('dead apprentice cannot take over the sight', () => {
    const base = gameWithAssignments({ An: 'seer', Bình: 'apprentice-seer', Chi: 'villager', Dũng: 'werewolf' });
    const apprenticeDead = { ...base, players: base.players.map((player) => player.roleId === 'apprentice-seer' ? { ...player, status: 'dead' as const } : player) };
    const resolved = hangPlayer(apprenticeDead, base.players[0].id);
    expect(canApprenticeSee(resolved)).toBe(false);
    expect(resolved.dayMessages).toEqual(['An đã bị treo cổ.']);
  });

  test('sorceress finds the acting apprentice seer after the seer dies', () => {
    const base = gameWithAssignments({ An: 'seer', Bình: 'apprentice-seer', Chi: 'sorceress', Dũng: 'werewolf' });
    expect(getSorceressResult(base, base.players[1].id)).toBe('Không phải Tiên tri');
    const seerDead = { ...base, players: base.players.map((player) => player.roleId === 'seer' ? { ...player, status: 'dead' as const } : player) };
    expect(getSorceressResult(seerDead, seerDead.players[1].id)).toBe('Là Tiên tri');
  });

  test('apprentice seer and young mother are suggested only above 25 players', () => {
    const twentyFive = suggestRoleCounts(25);
    expect(twentyFive['apprentice-seer']).toBeUndefined();
    expect(twentyFive['young-mother']).toBeUndefined();
    const twentySix = suggestRoleCounts(26);
    expect(twentySix['apprentice-seer']).toBe(1);
    expect(twentySix['young-mother']).toBe(1);
  });

  test('cursed player becomes a wolf instead of dying from a successful bite', () => {
    let game = gameWithAssignments({ An: 'cursed', Bình: 'werewolf' });
    game = beginNight(game);
    game = selectNightTarget(game, 'wolfTargetId', game.players[0].id);
    game = resolveNight(game);
    expect(game.players[0]).toMatchObject({ roleId: 'werewolf', status: 'alive' });
    expect(game.morningMessages).toContain('An là Bị nguyền và đã trở thành Sói. Hãy thông báo riêng cho người chơi này.');
    expect(game.morningMessages).toContain('Không có ai chết trong đêm.');
  });

  test('morning report explicitly lists every dead player', () => {
    let game = gameWithAssignments({ An: 'villager', Bình: 'werewolf', Chi: 'villager' });
    game = beginNight(game);
    game = selectNightTarget(game, 'wolfTargetId', game.players[0].id);
    game = selectNightTarget(game, 'witchPoisonTargetId', game.players[2].id);
    game = resolveNight(game);
    expect(game.morningMessages).toContain('Người chết trong đêm: An, Chi.');
  });

  test('desperate player wins immediately when hanged', () => {
    const game = gameWithAssignments({ An: 'desperate', Bình: 'villager' });
    const finished = hangPlayer(game, game.players[0].id);
    expect(finished.status).toBe('finished');
    expect(finished.resultMessage).toContain('Kẻ chán đời thắng');
  });

  test('wolves win when their count reaches the remaining players', () => {
    const game = gameWithAssignments({ An: 'werewolf', Bình: 'villager' });
    expect(evaluateWinner(game).resultMessage).toContain('Phe Sói thắng');
  });

  test('villagers win when every wolf is dead', () => {
    const game = gameWithAssignments({ An: 'werewolf', Bình: 'villager' });
    const deadWolf = { ...game, players: game.players.map((player) => player.roleId === 'werewolf' ? { ...player, status: 'dead' as const } : player) };
    expect(evaluateWinner(deadWolf).resultMessage).toContain('Phe Dân thắng');
  });

  test('mixed-team lovers win as the final two survivors', () => {
    const game = gameWithAssignments({ An: 'werewolf', Bình: 'villager', Chi: 'villager' });
    const finalTwo = { ...game, lovers: game.players.slice(0, 2).map((player) => player.id), players: game.players.map((player) => player.name === 'Chi' ? { ...player, status: 'dead' as const } : player) };
    expect(evaluateWinner(finalTwo).resultMessage).toContain('Cặp đôi thắng');
  });

  test('hanged hunter kills last target and reports lover chain', () => {
    const game = gameWithAssignments({ An: 'hunter', Bình: 'villager', Chi: 'villager', Dũng: 'werewolf' });
    const configured = { ...game, lastHunterTargetId: game.players[1].id, lovers: [game.players[1].id, game.players[2].id] };
    const resolved = hangPlayer(configured, game.players[0].id);
    expect(resolved.players.slice(0, 3).map((player) => player.status)).toEqual(['dead', 'dead', 'dead']);
    expect(resolved.dayMessages).toEqual([
      'An đã bị treo cổ.',
      'Bình chết theo do kỹ năng Thợ săn.',
      'Chi chết theo người yêu.',
    ]);
  });

  test('prince survives hanging with a card reveal message', () => {
    const game = gameWithAssignments({ An: 'prince', Bình: 'werewolf', Chi: 'villager' });
    const resolved = hangPlayer(game, game.players[0].id);
    expect(resolved.players[0].status).toBe('alive');
    expect(resolved.dayMessages).toContain('An là Hoàng tử. Lá bài được lật lên và An không bị treo cổ.');
  });

  test('sorceress identifies whether a player is the seer', () => {
    const game = gameWithAssignments({ An: 'sorceress', Bình: 'seer', Chi: 'villager' });
    expect(getSorceressResult(game, game.players[1].id)).toBe('Là Tiên tri');
    expect(getSorceressResult(game, game.players[2].id)).toBe('Không phải Tiên tri');
  });

  test('spellcaster silences a player for the next day', () => {
    let game = gameWithAssignments({ An: 'spellcaster', Bình: 'villager', Chi: 'werewolf' });
    game = beginNight(game);
    game = selectNightTarget(game, 'spellcasterTargetId', game.players[1].id);
    game = resolveNight(game);
    expect(game.silencedPlayerId).toBe(game.players[1].id);
    expect(game.morningMessages).toContain('Bình bị phù phép và phải im lặng suốt ngày hôm nay.');
    const nextNight = resolveNight(beginNight(game));
    expect(nextNight.silencedPlayerId).toBeUndefined();
  });

  test('spellcaster is called last, after the seer', () => {
    const game = createGame(['An', 'Bình', 'Chi', 'Dũng'], rolesWith({ seer: 1, sorceress: 1, spellcaster: 1, werewolf: 1 }));
    expect(getNightRoles(game).map((role) => role.id)).toEqual(['werewolf', 'seer', 'sorceress', 'spellcaster']);
  });

  test('manual status toggle preserves role', () => {
    const game = gameWithAssignments({ An: 'hunter' });
    expect(togglePlayerStatus(game, game.players[0].id).players[0]).toMatchObject({ status: 'dead', roleId: 'hunter' });
  });

  test('history accumulates night and day events with round labels', () => {
    let game = gameWithAssignments({ An: 'villager', Bình: 'werewolf', Chi: 'villager', Dũng: 'villager' });
    game = beginNight(game);
    game = selectNightTarget(game, 'wolfTargetId', game.players[0].id);
    game = resolveNight(game);
    expect(game.history).toContain('Đêm 1: An bị Sói cắn.');
    game = hangPlayer(game, game.players[1].id);
    expect(game.history).toContain('Ngày 2: Bình đã bị treo cổ.');
    expect(game.history).toContain('Tất cả Sói đã bị loại. Phe Dân thắng. Trò chơi kết thúc.');
  });

  test('role suggestion unlocks roles by player count tiers', () => {
    const basic = suggestRoleCounts(12);
    expect(Object.keys(basic).filter((id) => basic[id] > 0).sort()).toEqual(
      ['alpha-wolf', 'cupid', 'guard', 'hunter', 'seer', 'villager', 'werewolf', 'witch']);
    const mid = suggestRoleCounts(16);
    expect(mid.prince).toBe(1);
    expect(mid.cursed).toBe(1);
    expect(mid.desperate).toBeUndefined();
    const full = suggestRoleCounts(20);
    expect(full).toMatchObject({ desperate: 1, sorceress: 1, spellcaster: 1 });
  });

  test('role suggestion totals match the player count with a quarter biting wolves', () => {
    for (let players = 10; players <= 40; players += 1) {
      const counts = suggestRoleCounts(players);
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      const bitingWolves = counts.werewolf + counts['alpha-wolf'];
      expect(total).toBe(players);
      expect(counts.werewolf).toBeGreaterThanOrEqual(1);
      expect(counts.villager).toBeGreaterThanOrEqual(3);
      expect(bitingWolves).toBe(Math.max(2, Math.floor(players / 4)));
    }
  });
});
