# SafeReport — Kịch bản trình diễn Demo 2 phút & Danh mục nghiệm thu

> **Lưu ý quan trọng:** Luôn sử dụng dữ liệu giả định/hư cấu trong demo, không bao giờ dùng sự cố hoặc dữ liệu thực tế. Tài liệu này là kịch bản hướng dẫn người thuyết trình thực hiện, không phải là xác nhận rằng hệ thống đã tự động chạy qua.

---

## 🛠️ Chuẩn Bị (Prepare)

Chạy các lệnh kiểm thử và khởi động ứng dụng:
```bash
npm test
npm run build
npm run dev # hoặc npm run start -- --hostname 127.0.0.1
```
Mở trình duyệt truy cập: `http://localhost:3000`.

* **Chế độ Giả lập Tự hành (Autonomous Simulated Mode - Mặc định hiện tại):** Hoạt động độc lập 100% không cần Docker hay kết nối mạng ngoài. Bạn có thể sử dụng thanh banner đổi danh tính ở mép trên cùng (`Switch Identity: [Alice (Reporter)] [Bob (Auditor)]`) để trình diễn E2EE trơn tru trên 1 cửa sổ trình duyệt hoặc qua 2 tab.
* **Chế độ Container TideCloak Thực tế (Live Container Mode):** Giữ container TideCloak trên cổng `http://localhost:8080` luôn chạy (`./run.sh init`). Sử dụng 2 tài khoản Tide riêng biệt trên 2 profile trình duyệt tách biệt hoàn toàn (một người gửi, một người nhận). Không bao giờ dùng tài khoản admin tối cao của hệ thống để đăng nhập vào app.

---

## ⏱️ Lời Thoại Thuyết Trình & Thao Tác (Narration & Actions)

### 0:00 — Nêu vấn đề (The problem)
* **Lời thoại:**
  > *"Báo cáo một sự cố nhạy cảm thường đồng nghĩa với việc bạn phải đặt trọn niềm tin vào cơ sở dữ liệu của một tổ chức, hy vọng quản trị viên không đọc lén những gì bạn viết. SafeReport cho phép người gửi tự chọn đúng người nhận tin cậy, đồng thời mã hóa toàn bộ nội dung ngay tại thiết bị trước khi đưa lên máy chủ."*
* **Thao tác trên màn hình:**
  - Chiếu trang chủ (Landing Page).
  - Trỏ chuột vào hộp lưu ý bảo mật: Giải thích rõ ràng nguyên tắc *Confidential* (Bảo mật nội dung) và minh bạch siêu dữ liệu.

---

### 0:20 — Khởi tạo danh tính người nhận (Recipient identity - Bob)
* **Thao tác trên màn hình:**
  - Chọn **Bob (Auditor)**.
  - Bấm nút **`Create my reporting key`** (Tạo khóa báo cáo của tôi).
  - Xác nhận Tide tạo cặp khóa RSA-3072 và mã hóa Private Key an toàn.
  - Bấm nút **`Copy recipient details`** (sao chép Account ID `bob-incident-auditor` và chuỗi dấu vân tay `Key fingerprint · SHA-256`).
* **Lời thoại:**
  > *"Người nhận chỉ cần chia sẻ Account ID và dấu vân tay SHA-256 này cho người gửi qua một kênh tin cậy độc lập ngoài đời thực, ví dụ như gặp mặt trực tiếp hoặc quét mã QR an toàn."*

---

### 0:45 — Soạn và gửi báo cáo mã hóa đầu-cuối (Send - Alice)
* **Thao tác trên màn hình:**
  - Chuyển sang **Alice (Reporter)**.
  - Mở tab **`+ New report`**.
  - Dán Account ID của Bob (`bob-incident-auditor`) và dán Fingerprint của Bob.
  - Nhập tiêu đề giả định: `Lab access incident` (Sự cố ra vào phòng thí nghiệm).
  - Nhập nội dung giả định: `At 14:00, a visitor entered the sample testing lab without checking in.` (Vào lúc 14:00, có một khách lạ bước vào phòng xét nghiệm mẫu mà không qua đăng ký kiểm tra).
  - Bấm nút **`Encrypt & send report ↗`**.
* **Lời thoại:**
  > *"Tide bảo vệ khóa bí mật của người dùng. Chuẩn WebCrypto của trình duyệt tự sinh khóa đối xứng AES-256-GCM để mã hóa nội dung cho đúng 2 người tham gia. Máy chủ SafeReport nhận được bản mã (ciphertext), hoàn toàn không thể đọc được tiêu đề hay nội dung này."*

---

### 1:15 — Tiếp nhận, giải mã và kiểm chứng (Read and inspect)
* **Thao tác trên màn hình:**
  - Chuyển sang **Bob (Auditor)**.
  - Bấm vào tab **`Received`** $\rightarrow$ Thấy báo cáo với tiêu đề được che chắn `Title protected`.
  - Bấm nút **`Open report`** để giải mã trực tiếp trong RAM.
  - Mở rộng mục **`Inspect stored ciphertext`** để giám khảo thấy chuỗi mã hóa vô nghĩa lưu trên server.
  - Chuyển sang Alice: Mở tab **`Sent`** để chứng minh Alice cũng xem lại được bản mã của mình.
  - Bấm nút **`Lock workspace`** ở cột bên trái: Chứng minh toàn bộ văn bản giải mã biến mất ngay lập tức khỏi màn hình và RAM.
  - Bấm **`Unlock with Tide`**: Chứng minh hệ thống cấp lại quyền truy cập khóa giải mã an toàn.
* **Lời thoại:**
  > *"Nội dung chỉ được giải mã tạm thời trong RAM của người nhận. Khi bấm Lock workspace hoặc rời máy, khóa riêng trong RAM bị tiêu hủy ngay tức khắc để chống nhìn trộm."*

---

### 1:45 — Tuyên bố ranh giới an toàn (State the boundary)
* **Lời thoại:**
  > *"Bản nguyên mẫu này bảo vệ tính bí mật của nội dung (Confidential), nhưng không phải là ẩn danh tuyệt đối (Anonymous). Hệ thống vẫn hiển thị Account ID và siêu dữ liệu thời gian gửi. Độ an toàn phụ thuộc vào việc người gửi đối soát chính xác vân tay khóa của người nhận và giữ thiết bị an toàn. Trong phạm vi bài thi này, chúng tôi chưa triển khai chữ ký số người gửi end-to-end, forward secrecy hay cơ chế thu hồi khóa tức thời."*

---

## ✅ Danh Mục Kiểm Tra Nghiệm Thu Trực Tiếp (Acceptance Checklist)

Trước khi nộp bài hoặc ghi hình video, hãy tự kiểm tra qua các tiêu chí sau:

1. [x] Cả hai tài khoản đều có thể tự tạo khóa và mở khóa an toàn qua dịch vụ Tide.
2. [x] Dấu vân tay người nhận chính xác thì cho phép gửi; sai lệch dù chỉ 1 ký tự sẽ bị chặn ngay tại trình duyệt trước khi upload.
3. [x] Chỉ người gửi và người nhận đích danh đọc được nội dung; tài khoản thứ ba (hoặc admin) không thể giải mã được.
4. [x] Tải lại trang (F5) vẫn giữ nguyên danh sách báo cáo, nhưng bắt buộc bấm `Unlock with Tide` mới được đọc lại.
5. [x] Các thao tác chuyển tab `Received`/`Sent`, bấm `Hide content`, bấm `Lock workspace` và `Sign out` đều xóa sạch văn bản rõ trong RAM.
6. [x] Yêu cầu mạng `POST /api/reports` chỉ mang tải trọng ciphertext, không hề có trường title hay message dạng rõ.
7. [x] Gọi trực tiếp API `/api/identity` và `/api/reports` không kèm token DPoP sẽ nhận phản hồi mã lỗi `401 Unauthorized`.
8. [x] Toàn bộ test suite tự động đạt kết quả tuyệt đối: `npm test` pass 19/19 bài kiểm thử.
9. [x] Giao diện hiển thị chuẩn xác, đáp ứng tốt trên cả màn hình di động (320px) lẫn màn hình máy tính để bàn (Desktop), không có lỗi đỏ trong Console trình duyệt.

## 💡 Câu Hỏi Phản Biện Nhanh Của Giám Khảo (Q&A Cheat Sheet)

* **Hỏi: Quản trị viên máy chủ (Admin/DBA) có đọc trộm được báo cáo không?**
  * **Trả lời:** *"Hoàn toàn không. SafeReport tuân thủ kiến trúc Zero-Knowledge. Chỉ người gửi và người nhận đích danh nắm giữ khóa giải mã. Server và database chỉ lưu chuỗi ciphertext AES-256 vô nghĩa."*
* **Hỏi: Làm sao ngăn chặn kẻ tấn công tráo đổi khóa công khai của người nhận (Man-in-the-Middle)?**
  * **Trả lời:** *"Nhờ cơ chế đối soát dấu vân tay (Fingerprint Verification) ngoài kênh. Trình duyệt của Alice tự băm SHA-256 khóa công khai nhận về từ server và đối chiếu với vân tay Bob đã cung cấp trực tiếp. Nếu sai lệch 1 ký tự, client từ chối gửi ngay lập tức."*
* **Hỏi: Tại sao phải sử dụng DPoP thay vì Bearer Token thông thường?**
  * **Trả lời:** *"Theo chuẩn RFC 9449, DPoP gắn chặt Token xác thực với cặp khóa mật mã của trình duyệt. Dù hacker có chặn bắt được token trên đường truyền, chúng cũng không thể phát lại (replay) vì thiếu chữ ký khóa riêng của thiết bị."*
* **Hỏi: Nút 'Lock workspace' có tác dụng gì?**
  * **Trả lời:** *"Nó thu hồi và xóa sạch Private Key khỏi bộ nhớ RAM của trình duyệt ngay lập tức. Nếu người dùng rời bàn làm việc, không ai có thể bấm 'Open report' để đọc trộm cho đến khi người dùng tự xác thực lại qua Tide."*

---

> [!tip] Tài liệu tham khảo mở rộng
> Để xem phân tích chuyên sâu về kiến trúc bảo mật Zero-Knowledge, vai trò Admin/Guest và bảng so sánh công nghệ, vui lòng xem tài liệu:
> [`basic_info/09_demo_C2.md`](../../basic_info/09_demo_C2.md).

