# Prompt phát triển app quản trò Ma Sói

## 1. Mục tiêu

Xây dựng một app hỗ trợ quản trò điều hành trò chơi Ma Sói trực tiếp.

App không thay thế bộ bài vật lý và không tự chia vai. Người chơi vẫn nhận thẻ bài bên ngoài. Trong đêm đầu tiên, quản trò dùng app để gán tên người chơi với vai trò khi lần lượt gọi từng vai thức dậy.

App cần giúp quản trò:

- Ghi lại tên và vai trò của người chơi.
- Theo dõi trạng thái sống, chết và các trạng thái đặc biệt.
- Gọi các vai theo đúng thứ tự trong từng đêm.
- Nhìn nhanh chức năng và thông tin cần xử lý của từng vai.
- Điều hành ván chơi mà không cần mạng.

## 2. Nguyên tắc sản phẩm

- Offline-first: app hoạt động đầy đủ khi không có Internet.
- Không dùng server và không yêu cầu đăng nhập.
- Dữ liệu chỉ được lưu trên thiết bị của người dùng.
- Giao diện ưu tiên thao tác nhanh, ít bấm và dễ đọc trong lúc quản trò đang dẫn game.
- Không hiển thị thông tin bí mật theo cách dễ bị người chơi xung quanh nhìn thấy ngoài ý muốn.

## 3. Phạm vi MVP

### Tạo ván chơi

- Nhập số lượng người chơi.
- Nhập tên hoặc biệt danh từng người.
- Chọn danh sách vai có trong ván.
- Bắt đầu ván mới.


### Gán vai trong Đêm 0

- Thứ tự gọi được quy định sẵn theo luật
- App lần lượt hiển thị vai cần gọi.
- Quản trò chọn một hoặc nhiều người chơi tương ứng với vai đó.
- Trong Đêm 0 chỉ hiển thị chức năng của vai, chưa thực hiện hành động ban đêm.
- Riêng Cupid ghép đôi hai người chơi ngay trong Đêm 0.
- Những người không được gán trực tiếp sẽ tự động nhận vai Dân làng theo số lá đã chọn.
- Có thể bỏ qua, quay lại và sửa gán vai.
- Sau khi hoàn tất, app lưu danh sách người chơi và vai trò trên thiết bị.

### Điều hành ván chơi

- Hiển thị danh sách người chơi với trạng thái sống hoặc chết.
- Đánh dấu người chơi bị loại.
- Khi treo cổ một người chơi, hiển thị kết quả cho quản trò, bao gồm các trường hợp chết theo do cặp đôi hoặc kỹ năng Thợ săn.
- Hiển thị checklist theo thứ tự gọi trong đêm.
- Hiển thị ghi chú ngắn về hành động cần xử lý của vai đang được gọi.

### Điều kiện kết thúc ván

- Nếu Kẻ chán đời bị treo cổ: Kẻ chán đời thắng.
- Nếu tất cả Sói bị loại: phe Dân thắng.
- Nếu số Sói còn sống bằng hoặc vượt số người còn lại: phe Sói thắng. Kẻ chán đời chưa chết và Bị nguyền chưa chuyển hóa vẫn được tính là người không thuộc phe Sói.
- Nếu cặp đôi thuộc hai phe khác nhau và là hai người sống cuối cùng: cặp đôi thắng.
- Kiểm tra điều kiện kết thúc sau khi hoàn tất một đêm và sau mỗi lượt treo cổ ban ngày.

### Lưu local

- Tự động lưu tiến trình hiện tại vào local storage hoặc cơ chế lưu trữ local tương đương.
- Có thể tiếp tục ván đang chơi sau khi đóng và mở lại app.
- Có nút kết thúc ván và xóa dữ liệu ván hiện tại, kèm bước xác nhận.

## 4. Luồng sử dụng chính

1. Mở app.
2. Chọn `Tạo ván mới` hoặc `Tiếp tục ván hiện tại`.
3. Nhập danh sách người chơi.
4. Chọn các vai trò xuất hiện trong ván.
5. Bắt đầu Đêm 0.
6. App gọi từng vai theo thứ tự; quản trò chọn người chơi mang vai đó. Riêng Cupid chọn thêm hai người yêu nhau.
7. Chuyển sang màn hình điều hành chính.
8. Từ Đêm 1, app đưa quản trò qua checklist hành động theo luật. Luôn gọi đủ các vai được quy định phải gọi kể cả khi vai đó đã bị loại, để người chơi không suy đoán được trạng thái vai trò.
9. Ban ngày, quản trò đánh dấu người bị loại và ghi chú nếu cần.
10. Khi ván kết thúc, quản trò xác nhận xóa hoặc lưu lại lịch sử ván.

## 5. Các màn hình cơ bản

### Màn hình trang chủ

- `Tạo ván mới`
- `Tiếp tục ván hiện tại`
- `Cài đặt`

### Màn hình thiết lập ván

- Danh sách người chơi
- Danh sách vai trò
- Thứ tự gọi được quy định sẵn theo luật
- Nút `Bắt đầu`

### Màn hình gán vai

- Tên vai hiện tại
- Mô tả ngắn
- Danh sách người chơi để chọn
- `Quay lại`, `Bỏ qua`, `Tiếp tục`

### Màn hình điều hành chính

- Danh sách người chơi
- Trạng thái sống hoặc chết (icon bị bôi đen khi chết)
- Vai trò (sử dụng icon tương ứng với các vai trò)
- Bấm giữ vào người dùng để hiển trị chức năng của vai trò đó
- Bấm vào vai trò để chọn treo cổ người chơi
- `Bắt đầu đêm`
- `Kết thúc ván`

### Màn hình điều hành ban đêm

- Vai đang được gọi
- Mô tả hành động cần thực hiện
- Người chơi liên quan
- Ghi chú kết quả
- Một lượt gọi có thể chỉ nhằm che giấu thông tin, không đồng nghĩa với việc vai đó còn sống hoặc có hành động cần xử lý.
- `Trước`, `Xong`, `Tiếp theo`

## 6. Khung dữ liệu đề xuất

```ts
type PlayerStatus = "alive" | "dead";

type Player = {
  id: string;
  name: string;
  roleId?: string;
  status: PlayerStatus;
  notes: string;
};

type Role = {
  id: string;
  name: string;
  team: "villager" | "werewolf" | "neutral" | "other";
  nightOrder?: number;
  wakesAtNight: boolean;
  description: string;
  moderatorInstruction: string;
};

type Game = {
  id: string;
  createdAt: string;
  status: "setup" | "playing" | "finished";
  currentRound: number;
  players: Player[];
  roles: Role[];
  gameNotes: string;
};
```

## 7. Danh sách vai trò ban đầu

`TODO`: Điền bộ vai mặc định và luật riêng của nhóm chơi.

- Phe Sói: Sói, Sói đầu đàn, Bị nguyền
- Dân làng: Dân làng, Phù thủy, Thợ Săn, Bảo vệ, Cupid, Tiên tri
- Phe thứ 3: Kẻ chán đời
- Thợ săn: gọi mỗi đêm kể cả khi đã chết, để người chơi không biết vai trò này đã bị loại hay chưa.
- Sói đầu đàn: chỉ gọi trong đêm đầu để quản trò xác định người chơi giữ vai. Khi bị Tiên tri soi, Sói đầu đàn không bị phát hiện là Sói.
- Thứ tự: Kẻ chán đời (đêm đầu) -> Cupid (đêm đầu) -> Bảo vệ -> Sói -> Sói đầu đàn (đêm đầu) -> Bị nguyền (đêm đầu) -> Phù thủy -> Thợ săn -> Tiên tri
- Hãy đề xuất chỉnh sửa nếu thứ tự không hợp lý
## 8. Các quyết định cần bổ sung

- `TODO`: App sẽ là web app cài được trên điện thoại (PWA), app mobile hay desktop app? -> Mobile app
- `TODO`: Có cần lưu lịch sử nhiều ván hay chỉ lưu ván hiện tại? -> Chỉ ván hiện tại
- `TODO`: Có cần nhập và chỉnh sửa vai trò tùy biến không? -> Có, có thể thêm mới vai trò cùng chức năng
- `TODO`: Có cần khóa app bằng PIN để tránh lộ vai không? -> Không
- `TODO`: Có cần chế độ che nhanh thông tin bí mật khi đưa điện thoại cho người khác không? -> Không
- `TODO`: Có cần xử lý kỹ năng phức tạp tự động hay chỉ hiển thị checklist và ghi chú? -> Chỉ hiện thị checklist
- `TODO`: Bộ luật Ma Sói cụ thể nào được dùng làm mặc định? -> Tôi sẽ định nghĩa vai trò cùng chức năng

## 9. Prompt dùng để triển khai code

Hãy xây dựng app quản trò Ma Sói theo đặc tả trong file này.

Yêu cầu kỹ thuật:

- Ưu tiên một MVP đơn giản, chạy offline và dễ dùng trên điện thoại.
- Không tạo backend, không dùng API mạng và không yêu cầu đăng nhập.
- Lưu dữ liệu trực tiếp trên thiết bị người dùng.
- Tổ chức code rõ ràng để sau này dễ bổ sung vai trò, luật chơi và trạng thái đặc biệt.
- Giao diện tiếng Việt, nút bấm đủ lớn để thao tác nhanh.
- Bảo vệ các thao tác mất dữ liệu bằng hộp thoại xác nhận.
- Viết test cho logic lưu và khôi phục ván chơi, gán vai và thay đổi trạng thái người chơi.

Trước khi code, hãy:

1. Đề xuất stack phù hợp với mục tiêu offline-first.
2. Chỉ ra các giả định đang dùng cho những mục còn đánh dấu `TODO`.
3. Chia công việc thành MVP và phần mở rộng.
4. Sau khi được xác nhận stack, tạo khung project và triển khai MVP theo từng bước nhỏ.
