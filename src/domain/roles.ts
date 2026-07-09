import { Role } from './types';

const role = (
  id: string,
  name: string,
  icon: string,
  team: Role['team'],
  description: string,
  moderatorInstruction: string,
  options: Partial<Role> = {},
): Role => ({
  id,
  name,
  icon,
  team,
  description,
  moderatorInstruction,
  assignmentCount: 0,
  wakesAtNight: false,
  ...options,
});

// Gợi ý số lượng vai theo số người chơi:
// 10-14: bộ vai cơ bản · 15-19: thêm Hoàng tử, Bị nguyền · 20-25: tất cả các vai
// · 26+: thêm Tiên tri tập sự, Mẹ trẻ.
// Số Sói cắn được (gồm Sói đầu đàn) ≈ 1/4 số người chơi; Pháp sư sói tính riêng ngoài quota.
export const suggestRoleCounts = (playerCount: number): Record<string, number> => {
  const bitingWolves = Math.max(2, Math.floor(playerCount / 4));
  const counts: Record<string, number> = { cupid: 1, guard: 1, witch: 1, hunter: 1, seer: 1, 'alpha-wolf': 1 };
  if (playerCount >= 15) { counts.prince = 1; counts.cursed = 1; }
  if (playerCount >= 20) { counts.desperate = 1; counts.sorceress = 1; counts.spellcaster = 1; }
  if (playerCount > 25) { counts['apprentice-seer'] = 1; counts['young-mother'] = 1; }
  counts.werewolf = bitingWolves - 1;
  counts.villager = playerCount - Object.values(counts).reduce((sum, count) => sum + count, 0);
  return counts;
};

export const DEFAULT_ROLES: Role[] = [
  role('villager', 'Dân làng', '🏠', 'villager', 'Không có kỹ năng đặc biệt.', 'Không cần gọi trong đêm.'),
  role('desperate', 'Kẻ chán đời', '🎭', 'neutral', 'Thắng nếu bị dân làng treo cổ.', 'Gọi để xác định vai trong đêm đầu.', {
    wakesAtNight: true, firstNightOnly: true, nightOrder: 10,
  }),
  role('prince', 'Hoàng tử', '👑', 'villager', 'Khi bị treo cổ, lật lá bài lên và tiếp tục sống.', 'Gọi để xác định vai trong đêm đầu.', {
    wakesAtNight: true, firstNightOnly: true, nightOrder: 15,
  }),
  role('cupid', 'Cupid', '💘', 'villager', 'Ghép đôi hai người chơi trong Đêm 0.', 'Xác định người giữ vai Cupid, sau đó chọn hai người yêu nhau.', {
    wakesAtNight: true, firstNightOnly: true, nightOrder: 20,
  }),
  role('young-mother', 'Mẹ trẻ', '🍼', 'villager', 'Chọn một người để nuôi nấng trong Đêm 0. Nếu Mẹ trẻ chết, người được nuôi nấng cũng chết theo. Người được nuôi nấng chết thì Mẹ trẻ không sao.', 'Xác định người giữ vai Mẹ trẻ, sau đó chọn một người được nuôi nấng.', {
    wakesAtNight: true, firstNightOnly: true, nightOrder: 25,
  }),
  role('guard', 'Bảo vệ', '🛡️', 'villager', 'Bảo vệ một người chơi mỗi đêm. Không bảo vệ cùng một người hai đêm liên tiếp.', 'Chọn người được bảo vệ.', {
    wakesAtNight: true, nightOrder: 30,
  }),
  role('werewolf', 'Sói', '🐺', 'werewolf', 'Cùng phe Sói chọn một mục tiêu mỗi đêm.', 'Chọn người bị Sói cắn.', {
    wakesAtNight: true, nightOrder: 40,
  }),
  role('alpha-wolf', 'Sói đầu đàn', '🌑', 'werewolf', 'Không bị Tiên tri phát hiện là Sói khi bị soi.', 'Chỉ gọi để xác định vai trong đêm đầu.', {
    wakesAtNight: true, firstNightOnly: true, nightOrder: 50,
  }),
  role('cursed', 'Bị nguyền', '⛓️', 'other', 'Trở thành Sói nếu bị Sói cắn thành công. Quản trò cần thông báo riêng cho người chơi.', 'Gọi để xác định vai trong đêm đầu.', {
    wakesAtNight: true, firstNightOnly: true, nightOrder: 60,
  }),
  role('witch', 'Phù thủy', '🧪', 'villager', 'Có một bình cứu và một bình độc, mỗi bình chỉ dùng một lần.', 'Xem người bị cắn, sau đó có thể dùng bình cứu và bình độc.', {
    wakesAtNight: true, nightOrder: 70,
  }),
  role('hunter', 'Thợ săn', '🏹', 'villager', 'Nếu chết trong đêm, người đã chọn cũng bị loại.', 'Luôn gọi mỗi đêm và chọn mục tiêu để che giấu trạng thái Thợ săn.', {
    wakesAtNight: true, nightOrder: 80,
  }),
  role('seer', 'Tiên tri', '🔮', 'villager', 'Soi một người mỗi đêm. Sói đầu đàn không bị phát hiện là Sói.', 'Chọn một người để soi. Vẫn gọi mỗi đêm kể cả khi Tiên tri đã chết để che giấu thông tin.', {
    wakesAtNight: true, nightOrder: 90,
  }),
  role('apprentice-seer', 'Tiên tri tập sự', '📖', 'villager', 'Soi thay Tiên tri sau khi Tiên tri chết.', 'Luôn gọi mỗi đêm để che giấu thông tin. Chỉ cho soi khi Tiên tri đã chết.', {
    wakesAtNight: true, nightOrder: 95,
  }),
  role('sorceress', 'Pháp sư sói', '🧿', 'werewolf', 'Phe Sói. Mỗi đêm soi một người để tìm ra Tiên tri.', 'Chọn một người để kiểm tra có phải Tiên tri không.', {
    wakesAtNight: true, nightOrder: 100,
  }),
  role('spellcaster', 'Người phù phép', '🪄', 'villager', 'Mỗi đêm chỉ một người, người đó phải im lặng suốt ngày hôm sau.', 'Chọn người bị phù phép phải im lặng ngày hôm sau.', {
    wakesAtNight: true, nightOrder: 110,
  }),
];
