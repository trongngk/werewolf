import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Alert, Image, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar as NativeStatusBar,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import {
  assignedCount, beginNight, completeNightZero, createGame, getAssignmentRoles, getNightRoles, getPlayerRole, hangPlayer,
  canApprenticeSee, getPlayersForRole, getSeerResult, getSorceressResult, isGuardTargetAllowed, isRoleAlive, resolveNight, selectNightTarget,
  setNurturedChild, toggleLover, togglePlayerStatus, toggleRoleAssignment, toggleWitchSave,
} from './src/domain/game';
import { DEFAULT_ROLES, suggestRoleCounts } from './src/domain/roles';
import { Game, NightState, Player, Role, Team } from './src/domain/types';
import { clearGame, loadGame, saveGame } from './src/storage/gameStorage';

type Screen = 'home' | 'setup' | 'assign' | 'dashboard' | 'night';
const cloneDefaultRoles = () => DEFAULT_ROLES.map((role) => ({ ...role }));
const playerNames = (value: string) => value.split('\n').map((name) => name.trim()).filter(Boolean);
const isDeathMessage = (message: string) =>
  ['đã bị treo cổ', 'chết theo', 'Người chết trong đêm', 'bị Sói cắn', 'bình độc'].some((keyword) => message.includes(keyword));

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [game, setGame] = useState<Game | null>(null);
  const [ready, setReady] = useState(false);
  const [names, setNames] = useState('');
  const [setupRoles, setSetupRoles] = useState<Role[]>(cloneDefaultRoles);
  const [assignIndex, setAssignIndex] = useState(0);
  const [nightIndex, setNightIndex] = useState(0);

  useEffect(() => { loadGame().then(setGame).finally(() => setReady(true)); }, []);
  useEffect(() => { if (game) void saveGame(game); }, [game]);

  if (!ready) return <Page title="Quản trò Ma Sói"><Text style={styles.muted}>Đang tải dữ liệu...</Text></Page>;

  const startNewGame = () => {
    const enteredNames = playerNames(names);
    const totalRoles = setupRoles.reduce((sum, role) => sum + role.assignmentCount, 0);
    if (enteredNames.length < 3) return Alert.alert('Thiếu người chơi', 'Hãy nhập ít nhất 3 người chơi.');
    if (totalRoles !== enteredNames.length) return Alert.alert('Chưa đủ lá vai trò', `Có ${enteredNames.length} người chơi nhưng đã chọn ${totalRoles} lá.`);
    setGame(createGame(enteredNames, setupRoles));
    setAssignIndex(0);
    setScreen('assign');
  };

  const finishGame = () => Alert.alert('Kết thúc ván?', 'Dữ liệu ván hiện tại sẽ bị xóa khỏi thiết bị.', [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Xóa ván', style: 'destructive', onPress: () => void clearGame().then(() => { setGame(null); setScreen('home'); }) },
  ]);

  if (screen === 'home') return (
    <Page title="Quản trò Ma Sói" subtitle="Trợ lý offline cho quản trò">
      <Image source={require('./assets/werewolf-logo.png')} style={styles.logo} />
      {game && <Button label="Tiếp tục ván hiện tại" onPress={() => setScreen(game.status === 'assigning' ? 'assign' : 'dashboard')} />}
      <Button label="Tạo ván mới" kind={game ? 'secondary' : 'primary'} onPress={() => {
        if (!game) return setScreen('setup');
        Alert.alert('Tạo ván mới?', 'Ván hiện tại sẽ bị thay thế khi bắt đầu ván mới.', [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Tiếp tục', style: 'destructive', onPress: () => setScreen('setup') },
        ]);
      }} />
      <Text style={styles.hint}>Không cần mạng. Dữ liệu chỉ lưu trên thiết bị này.</Text>
    </Page>
  );

  if (screen === 'setup') {
    const enteredCount = playerNames(names).length;
    const totalRoles = setupRoles.reduce((sum, role) => sum + role.assignmentCount, 0);
    const matched = enteredCount >= 3 && enteredCount === totalRoles;
    return (
      <Page title="Thiết lập ván" subtitle="Mỗi dòng là một người chơi" back={() => setScreen('home')}>
        <Text style={styles.counterSummary}>Đã nhập: {enteredCount} người chơi</Text>
        <TextInput style={[styles.input, styles.namesInput]} multiline placeholder={'An\nBình\nChi'} value={names} onChangeText={setNames} />
        <SectionTitle text={`Vai trò: ${totalRoles}/${enteredCount} lá`} />
        <Text style={[styles.hint, matched && styles.successText]}>{matched ? 'Đã chọn đủ lá vai trò.' : 'Số lá vai trò phải bằng số người chơi.'}</Text>
        <Button label="🎲 Gợi ý vai theo số người chơi" kind="secondary" onPress={() => {
          if (enteredCount < 10) return Alert.alert('Chưa đủ người', 'Gợi ý vai áp dụng cho ván từ 10 người chơi trở lên.');
          const suggestion = suggestRoleCounts(enteredCount);
          setSetupRoles((roles) => roles.map((role) => ({ ...role, assignmentCount: suggestion[role.id] ?? 0 })));
        }} />
        <View style={styles.grid}>{setupRoles.map((role) => (
          <RoleCounter key={role.id} role={role} onChange={(change) => setSetupRoles((roles) =>
            roles.map((item) => item.id === role.id ? { ...item, assignmentCount: Math.max(0, item.assignmentCount + change) } : item))} />
        ))}</View>
        <CustomRoleButton onAdd={(role) => setSetupRoles((roles) => [...roles, role])} />
        <Button label="Bắt đầu gán vai" disabled={!matched} onPress={startNewGame} />
      </Page>
    );
  }

  if (!game) return <Page title="Không tìm thấy ván chơi"><Button label="Về trang chủ" onPress={() => setScreen('home')} /></Page>;

  if (screen === 'assign') {
    const roles = getAssignmentRoles(game);
    const role = roles[assignIndex];
    if (!role) {
      const completedGame = completeNightZero(game);
      return (
        <Page title="Hoàn tất Đêm 0" subtitle={`${assignedCount(game)}/${game.players.length} người đã được xác định trực tiếp`}>
          {!completedGame && <Text style={styles.warningText}>Số người chưa gán phải khớp với số lá Dân làng.</Text>}
          <Text style={styles.hint}>Các người chơi còn lại sẽ tự động được gán vai Dân làng. Đêm 1 sẽ bắt đầu ngay sau đó.</Text>
          <Button label="Kết thúc Đêm 0, bắt đầu Đêm 1" disabled={!completedGame} onPress={() => { if (completedGame) { setGame(beginNight(completedGame)); setNightIndex(0); setScreen('night'); } }} />
          <Button label="Quay lại bước trước" kind="secondary" onPress={() => setAssignIndex(Math.max(0, roles.length - 1))} />
        </Page>
      );
    }
    const selected = getPlayersForRole(game, role.id).length;
    return (
      <Page title={`${role.icon} Đêm 0: ${role.name}`} subtitle={`${selected}/${role.assignmentCount} người giữ vai`} back={() => assignIndex ? setAssignIndex(assignIndex - 1) : setScreen('setup')}>
        <Text style={styles.instruction}>Chức năng: {role.description}</Text>
        <View style={styles.grid}>{game.players.map((player) => (
          <PlayerChoice key={player.id} name={player.name} selected={player.roleId === role.id} disabled={Boolean(player.roleId && player.roleId !== role.id)}
            compact={isCompactGrid(game)} onPress={() => setGame(toggleRoleAssignment(game, player.id, role))} />
        ))}</View>
        {role.id === 'cupid' && selected === role.assignmentCount && <LoverPicker game={game} onChange={setGame} />}
        {role.id === 'young-mother' && selected === role.assignmentCount && <NurturedPicker game={game} onChange={setGame} />}
        <Button label="Tiếp theo" disabled={selected !== role.assignmentCount || (role.id === 'cupid' && game.lovers?.length !== 2) || (role.id === 'young-mother' && !game.nurturedChildId)} onPress={() => setAssignIndex(assignIndex + 1)} />
      </Page>
    );
  }

  if (screen === 'night') {
    const roles = getNightRoles(game);
    const role = roles[nightIndex];
    if (!role) return (
      <Page title={`Hoàn tất đêm ${game.currentRound}`} subtitle="App sẽ tự động cập nhật các trường hợp bị loại" log={game.history ?? []}>
        <Button label="Chuyển sang ban ngày" onPress={() => { setGame(resolveNight(game)); setNightIndex(0); setScreen('dashboard'); }} />
        <Button label="Quay lại lượt trước" kind="secondary" onPress={() => setNightIndex(Math.max(0, roles.length - 1))} />
      </Page>
    );
    return (
      <Page title={`${role.icon} Đêm ${game.currentRound}: ${role.name}`} subtitle={`${nightIndex + 1}/${roles.length}`} log={game.history ?? []} back={() => nightIndex ? setNightIndex(nightIndex - 1) : setScreen('dashboard')}>
        <Text style={styles.instruction}>{role.moderatorInstruction}</Text>
        <NightAction game={game} role={role} onChange={setGame} />
        <Button label="Xong, gọi vai tiếp theo" onPress={() => setNightIndex(nightIndex + 1)} />
      </Page>
    );
  }

  return (
    <Page title={`Ban ngày · Vòng ${game.currentRound}`} subtitle={`${game.players.filter((player) => player.status === 'alive').length}/${game.players.length} người còn sống`} log={game.history ?? []} back={() => setScreen('home')}>
      {game.resultMessage && <View style={styles.gameOver}><Text style={styles.gameOverTitle}>Trò chơi kết thúc</Text><Text style={styles.noticeText}>{game.resultMessage}</Text></View>}
      {!!game.dayMessages.length && <View style={styles.notice}><Text style={styles.noticeTitle}>Kết quả ban ngày</Text>{game.dayMessages.map((message) => <Text key={message} style={[styles.noticeText, isDeathMessage(message) && styles.deathText]}>• {message}</Text>)}</View>}
      {!!game.morningMessages.length && <View style={styles.notice}><Text style={styles.noticeTitle}>Kết quả đêm trước</Text>{game.morningMessages.map((message) => <Text key={message} style={[styles.noticeText, isDeathMessage(message) && styles.deathText]}>• {message}</Text>)}</View>}
      <Text style={styles.hint}>Chạm người còn sống để treo cổ. Chạm người đã chết để khôi phục nếu thao tác nhầm.</Text>
      <View style={styles.grid}>{game.players.map((player) => (
        <PlayerCard key={player.id} game={game} player={player} onChange={setGame} />
      ))}</View>
      <Button label={`Bắt đầu đêm ${game.currentRound}`} disabled={game.status === 'finished'} onPress={() => { setGame(beginNight(game)); setNightIndex(0); setScreen('night'); }} />
      <Button label="Kết thúc ván" kind="danger" onPress={finishGame} />
    </Page>
  );
}

function NightAction({ game, role, onChange }: { game: Game; role: Role; onChange: (game: Game) => void }) {
  const night = game.night ?? { witchSaved: false };
  if (['guard', 'hunter', 'witch', 'sorceress', 'spellcaster'].includes(role.id) && !isRoleAlive(game, role.id)) {
    return <Text style={styles.hint}>{role.name} đã chết. Lượt gọi này chỉ để che giấu thông tin — không chọn mục tiêu.</Text>;
  }
  if (role.id === 'guard') return <NightTarget title="Chọn người được bảo vệ" game={game} field="guardTargetId" selectedId={night.guardTargetId} onChange={onChange}
    disabled={(player) => !isGuardTargetAllowed(game, player.id)} disabledLabel="Đã bảo vệ đêm trước" />;
  if (role.id === 'werewolf') return <NightTarget title="Chọn người bị cắn" game={game} field="wolfTargetId" selectedId={night.wolfTargetId} onChange={onChange}
    disabled={(player) => getPlayerRole(game.roles, player)?.team === 'werewolf'} disabledLabel="Cùng phe Sói" />;
  if (role.id === 'hunter') return <NightTarget title="Chọn mục tiêu của Thợ săn" game={game} field="hunterTargetId" selectedId={night.hunterTargetId} onChange={onChange}
    disabled={(player) => player.roleId === 'hunter'} disabledLabel="Thợ săn" />;
  if (role.id === 'seer') {
    if (!isRoleAlive(game, 'seer')) return <Text style={styles.hint}>Tiên tri đã chết. Lượt gọi này chỉ để che giấu thông tin — không chọn mục tiêu. Tiên tri tập sự (nếu có) sẽ soi ở lượt của mình.</Text>;
    return (
      <>
        {night.seerTargetId && <Text style={styles.result}>Kết quả: {getSeerResult(game, night.seerTargetId)}</Text>}
        <NightTarget title="Chọn người được soi" game={game} field="seerTargetId" selectedId={night.seerTargetId} onChange={onChange}
          disabled={(player) => player.roleId === 'seer'} disabledLabel="Tiên tri" />
      </>
    );
  }
  if (role.id === 'apprentice-seer') {
    if (!isRoleAlive(game, 'apprentice-seer')) return <Text style={styles.hint}>Tiên tri tập sự đã chết. Lượt gọi này chỉ để che giấu thông tin.</Text>;
    if (!canApprenticeSee(game)) return <Text style={styles.hint}>Tiên tri còn sống nên Tiên tri tập sự chưa được soi. Lượt gọi này chỉ để che giấu thông tin.</Text>;
    return (
      <>
        {night.apprenticeSeerTargetId && <Text style={styles.result}>Kết quả: {getSeerResult(game, night.apprenticeSeerTargetId)}</Text>}
        <NightTarget title="Tiên tri tập sự chọn người được soi" game={game} field="apprenticeSeerTargetId" selectedId={night.apprenticeSeerTargetId} onChange={onChange}
          disabled={(player) => player.roleId === 'apprentice-seer'} disabledLabel="Tiên tri tập sự" />
      </>
    );
  }
  if (role.id === 'sorceress') return (
    <>
      {night.sorceressTargetId && <Text style={styles.result}>Kết quả: {getSorceressResult(game, night.sorceressTargetId)}</Text>}
      <NightTarget title="Chọn người cần kiểm tra" game={game} field="sorceressTargetId" selectedId={night.sorceressTargetId} onChange={onChange}
        disabled={(player) => player.roleId === 'sorceress'} disabledLabel="Pháp sư sói" />
    </>
  );
  if (role.id === 'spellcaster') return <NightTarget title="Chọn người bị phù phép im lặng" game={game} field="spellcasterTargetId" selectedId={night.spellcasterTargetId} onChange={onChange}
    disabled={(player) => player.roleId === 'spellcaster'} disabledLabel="Người phù phép" />;
  if (role.id === 'witch') return (
    <>
      <Text style={styles.counterSummary}>Người bị cắn: {night.wolfTargetId ? game.players.find((player) => player.id === night.wolfTargetId)?.name : 'Chưa có mục tiêu'}</Text>
      {night.wolfTargetId && night.wolfTargetId === night.guardTargetId && <Text style={styles.successText}>Mục tiêu đang được Bảo vệ che chắn.</Text>}
      <Button label={game.witchHealAvailable ? (night.witchSaved ? '✓ Đã dùng bình cứu' : 'Dùng bình cứu') : 'Bình cứu đã dùng'} disabled={!game.witchHealAvailable || !night.wolfTargetId}
        kind={night.witchSaved ? 'success' : 'secondary'} onPress={() => onChange(toggleWitchSave(game))} />
      <Text style={styles.counterSummary}>{game.witchPoisonAvailable ? 'Bình độc còn sử dụng được' : 'Bình độc đã dùng'}</Text>
      {game.witchPoisonAvailable && <NightTarget title="Chọn người uống bình độc (không bắt buộc)" game={game} field="witchPoisonTargetId" selectedId={night.witchPoisonTargetId} onChange={onChange} />}
    </>
  );
  return <Text style={styles.hint}>Lượt gọi này dùng để xác định vai hoặc che giấu thông tin. Thực hiện theo luật nhóm rồi tiếp tục.</Text>;
}

function NightTarget({ title, game, field, selectedId, onChange, disabled, disabledLabel }: {
  title: string; game: Game; field: Exclude<keyof NightState, 'witchSaved'>; selectedId?: string;
  onChange: (game: Game) => void; disabled?: (player: Player) => boolean; disabledLabel?: string;
}) {
  return (
    <>
      <SectionTitle text={title} />
      <View style={styles.grid}>{game.players.filter((player) => player.status === 'alive').map((player) => {
        const blocked = disabled?.(player) ?? false;
        return <PlayerChoice key={player.id} name={player.name} selected={selectedId === player.id} disabled={blocked}
          helper={blocked ? disabledLabel : undefined} compact={isCompactGrid(game)}
          onPress={() => onChange(selectNightTarget(game, field, selectedId === player.id ? undefined : player.id))} />;
      })}</View>
    </>
  );
}

function LoverPicker({ game, onChange }: { game: Game; onChange: (game: Game) => void }) {
  return <>
    <SectionTitle text="Cupid ghép đôi hai người" />
    <Text style={styles.hint}>Đây là hành động duy nhất thực hiện trong Đêm 0.</Text>
    <View style={styles.grid}>{game.players.map((player) => {
      const selected = game.lovers?.includes(player.id) ?? false;
      return <PlayerChoice key={player.id} name={player.name} selected={selected} disabled={!selected && game.lovers?.length === 2}
        compact={isCompactGrid(game)} onPress={() => onChange(toggleLover(game, player.id))} />;
    })}</View>
  </>;
}

function NurturedPicker({ game, onChange }: { game: Game; onChange: (game: Game) => void }) {
  const mother = game.players.find((player) => player.roleId === 'young-mother');
  return <>
    <SectionTitle text="Mẹ trẻ chọn người để nuôi nấng" />
    <Text style={styles.hint}>Nếu Mẹ trẻ chết, người này sẽ chết theo. Người này chết thì Mẹ trẻ không sao.</Text>
    <View style={styles.grid}>{game.players.map((player) => {
      const selected = game.nurturedChildId === player.id;
      const isMother = player.id === mother?.id;
      return <PlayerChoice key={player.id} name={player.name} selected={selected} disabled={isMother}
        helper={isMother ? 'Mẹ trẻ' : undefined} compact={isCompactGrid(game)} onPress={() => onChange(setNurturedChild(game, player.id))} />;
    })}</View>
  </>;
}

const isCompactGrid = (game: Game) => game.players.length > 12;

function PlayerCard({ game, player, onChange }: { game: Game; player: Player; onChange: (game: Game) => void }) {
  const role = getPlayerRole(game.roles, player);
  const update = () => {
    if (game.status === 'finished') return Alert.alert('Trò chơi đã kết thúc', game.resultMessage);
    Alert.alert(player.status === 'alive' ? 'Treo cổ người chơi?' : 'Khôi phục người chơi?', player.name, [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Xác nhận', style: player.status === 'alive' ? 'destructive' : 'default', onPress: () => onChange(player.status === 'alive' ? hangPlayer(game, player.id) : togglePlayerStatus(game, player.id)) },
    ]);
  };
  return (
    <Pressable style={[styles.squareCard, isCompactGrid(game) && styles.compactCard, player.status === 'dead' && styles.deadCard]} onPress={update}
      onLongPress={() => Alert.alert(`${role?.icon ?? '❔'} ${role?.name ?? 'Chưa gán vai'}`, role?.description ?? 'Người chơi này chưa có vai.')}>
      <Text style={styles.roleIcon}>{role?.icon ?? '❔'}</Text>
      <Text style={[styles.playerName, player.status === 'dead' && styles.deadText]} numberOfLines={2}>{player.name}</Text>
      <Text style={[styles.roleName, player.status === 'dead' && styles.deadText]} numberOfLines={2}>{role?.name ?? 'Chưa gán vai'}{game.lovers?.includes(player.id) ? ' · 💞' : ''}{game.nurturedChildId === player.id ? ' · 🍼' : ''}{game.silencedPlayerId === player.id && player.status === 'alive' ? ' · 🤐' : ''}</Text>
    </Pressable>
  );
}

function Page({ title, subtitle, back, log, children }: { title: string; subtitle?: string; back?: () => void; log?: string[]; children: React.ReactNode }) {
  const [logVisible, setLogVisible] = useState(false);
  return <SafeAreaView style={styles.safe}><StatusBar style="light" /><ScrollView contentContainerStyle={styles.page}>
    {back && <Pressable onPress={back}><Text style={styles.back}>‹ Quay lại</Text></Pressable>}
    <Text style={styles.title}>{title}</Text>{subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    <View style={styles.content}>{children}</View>
  </ScrollView>
  {log && <Pressable style={styles.logButton} onPress={() => setLogVisible(true)}><Text style={styles.logButtonText}>📜</Text></Pressable>}
  {log && <Modal visible={logVisible} animationType="slide" transparent onRequestClose={() => setLogVisible(false)}><View style={styles.modalBackdrop}><View style={styles.modal}>
    <Text style={styles.sectionTitle}>📜 Nhật ký ván chơi</Text>
    <ScrollView style={styles.logScroll}>
      {log.length
        ? log.map((entry, index) => <Text key={`${index}-${entry}`} style={[styles.noticeText, isDeathMessage(entry) && styles.deathText]}>• {entry}</Text>)
        : <Text style={styles.hint}>Chưa có sự kiện nào được ghi lại.</Text>}
    </ScrollView>
    <Button label="Đóng" kind="secondary" onPress={() => setLogVisible(false)} />
  </View></View></Modal>}
  </SafeAreaView>;
}

function Button({ label, onPress, kind = 'primary', disabled = false }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger' | 'success'; disabled?: boolean }) {
  return <Pressable style={[styles.button, styles[`${kind}Button`], disabled && styles.disabledButton]} disabled={disabled} onPress={onPress}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}

function SectionTitle({ text }: { text: string }) { return <Text style={styles.sectionTitle}>{text}</Text>; }

function RoleCounter({ role, onChange }: { role: Role; onChange: (change: number) => void }) {
  return <View style={styles.roleTile}><Text style={styles.roleIcon}>{role.icon}</Text><Text style={styles.tileTitle} numberOfLines={2}>{role.name}</Text>
    <View style={styles.tileCounter}><Pressable style={styles.counterButton} onPress={() => onChange(-1)}><Text style={styles.counterButtonText}>−</Text></Pressable>
      <Text style={styles.count}>{role.assignmentCount}</Text><Pressable style={styles.counterButton} onPress={() => onChange(1)}><Text style={styles.counterButtonText}>+</Text></Pressable></View>
  </View>;
}

function PlayerChoice({ name, selected, disabled, onPress, helper, compact }: { name: string; selected: boolean; disabled: boolean; onPress: () => void; helper?: string; compact?: boolean }) {
  return <Pressable style={[styles.choice, compact && styles.compactChoice, selected && styles.selectedChoice, disabled && styles.disabledChoice]} disabled={disabled} onPress={onPress}>
    <Text style={styles.playerName} numberOfLines={2}>{name}</Text><Text style={styles.roleName} numberOfLines={2}>{selected ? 'Đã chọn' : helper ?? (disabled ? 'Đã có vai' : 'Chọn')}</Text>
  </Pressable>;
}

function CustomRoleButton({ onAdd }: { onAdd: (role: Role) => void }) {
  const [visible, setVisible] = useState(false); const [name, setName] = useState(''); const [team, setTeam] = useState<Team>('other');
  const add = () => { if (!name.trim()) return; onAdd({ id: `custom-${Date.now()}`, name: name.trim(), icon: '⭐', team, assignmentCount: 0, wakesAtNight: true, description: 'Vai tùy chỉnh.', moderatorInstruction: 'Thực hiện theo luật nhóm.' }); setName(''); setVisible(false); };
  return <><Button label="+ Thêm vai tùy chỉnh" kind="secondary" onPress={() => setVisible(true)} /><Modal visible={visible} animationType="slide" transparent><View style={styles.modalBackdrop}><View style={styles.modal}>
    <Text style={styles.sectionTitle}>Vai tùy chỉnh</Text><TextInput style={styles.input} placeholder="Tên vai" value={name} onChangeText={setName} />
    <View style={styles.teamRow}>{(['villager', 'werewolf', 'neutral', 'other'] as Team[]).map((item) => <Pressable key={item} style={[styles.teamChip, team === item && styles.selectedChoice]} onPress={() => setTeam(item)}><Text>{item}</Text></Pressable>)}</View>
    <Button label="Thêm vai" onPress={add} /><Button label="Hủy" kind="secondary" onPress={() => setVisible(false)} />
  </View></View></Modal></>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#172033', paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 24 : 0 },
  page: { padding: 20, paddingBottom: 48 }, content: { gap: 12, marginTop: 18 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' }, subtitle: { color: '#b7c4db', fontSize: 16, marginTop: 6 },
  back: { color: '#f3bd54', fontSize: 16, marginBottom: 14 }, hint: { color: '#b7c4db', lineHeight: 20 },
  muted: { color: '#9aa7bd', fontSize: 13 }, counterSummary: { color: '#fff', fontSize: 16, fontWeight: '700' },
  instruction: { backgroundColor: '#25314a', borderRadius: 12, color: '#fff', fontSize: 16, lineHeight: 23, padding: 14 },
  input: { backgroundColor: '#fff', borderRadius: 10, color: '#172033', fontSize: 16, padding: 14 }, namesInput: { minHeight: 130, textAlignVertical: 'top' },
  logo: { alignSelf: 'center', borderRadius: 24, height: 170, marginBottom: 4, width: 170 },
  button: { alignItems: 'center', borderRadius: 10, marginTop: 4, padding: 15 }, primaryButton: { backgroundColor: '#c24343' },
  secondaryButton: { backgroundColor: '#394862' }, dangerButton: { backgroundColor: '#762f38' }, successButton: { backgroundColor: '#31714a' },
  disabledButton: { opacity: 0.38 }, buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { color: '#fff', fontSize: 19, fontWeight: '700', marginTop: 8 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleTile: { alignItems: 'center', aspectRatio: 1, backgroundColor: '#25314a', borderRadius: 12, justifyContent: 'space-between', padding: 10, width: '48%' },
  roleIcon: { fontSize: 30 }, tileTitle: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' }, tileCounter: { alignItems: 'center', flexDirection: 'row' },
  counterButton: { alignItems: 'center', backgroundColor: '#394862', borderRadius: 8, height: 34, justifyContent: 'center', width: 34 },
  counterButtonText: { color: '#fff', fontSize: 21 }, count: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', width: 32 },
  squareCard: { alignItems: 'center', aspectRatio: 1, backgroundColor: '#25314a', borderRadius: 12, justifyContent: 'center', padding: 10, width: '48%' },
  choice: { backgroundColor: '#25314a', borderRadius: 10, justifyContent: 'center', minHeight: 74, padding: 12, width: '48%' },
  compactChoice: { minHeight: 68, padding: 8, width: '30%' }, compactCard: { padding: 6, width: '30%' },
  selectedChoice: { backgroundColor: '#52749c' }, disabledChoice: { opacity: 0.4 }, deadCard: { backgroundColor: '#080c13', opacity: 0.62 },
  deadText: { color: '#7d8797', textDecorationLine: 'line-through' }, playerName: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  roleName: { color: '#b7c4db', fontSize: 13, marginTop: 4, textAlign: 'center' }, successText: { color: '#83d49d' }, warningText: { color: '#f3bd54' },
  result: { backgroundColor: '#324a68', borderRadius: 10, color: '#fff', fontSize: 18, fontWeight: '800', padding: 14, textAlign: 'center' },
  notice: { backgroundColor: '#32405b', borderRadius: 12, gap: 5, padding: 14 }, noticeTitle: { color: '#f3bd54', fontSize: 17, fontWeight: '800' },
  gameOver: { backgroundColor: '#762f38', borderRadius: 12, gap: 6, padding: 14 }, gameOverTitle: { color: '#fff', fontSize: 19, fontWeight: '800' },
  noticeText: { color: '#fff', lineHeight: 20 }, deathText: { color: '#ff9b9b', fontSize: 15, fontWeight: '800' },
  logButton: { backgroundColor: '#394862', borderRadius: 18, elevation: 4, paddingHorizontal: 11, paddingVertical: 7, position: 'absolute', right: 14, top: Platform.OS === 'android' ? (NativeStatusBar.currentHeight ?? 24) + 10 : 14 },
  logButtonText: { fontSize: 17 }, logScroll: { maxHeight: 420 },
  modalBackdrop: { backgroundColor: '#0009', flex: 1, justifyContent: 'flex-end' },
  modal: { backgroundColor: '#172033', borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 12, padding: 20, paddingBottom: 32 },
  teamRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, teamChip: { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8 },
});
