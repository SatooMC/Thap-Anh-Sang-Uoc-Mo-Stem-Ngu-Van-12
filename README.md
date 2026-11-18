# HẢI ĐĂNG ƯỚC MƠ — PHIÊN BẢN NÂNG CẤP ĐỒ HỌA & TÁCH MODULE
**Dự án STEM Ngữ Văn 12 • Tác giả: Quang Anh vip 10**

## 1. Cấu trúc thư mục đã tách riêng (Modular Architecture)
Mã nguồn được tách thành các file HTML, CSS và JavaScript độc lập để dễ dàng phân tích, học tập và chỉnh sửa:

```text
hai_dang_uoc_mo_project/
├── index.html          # Khung giao diện HTML5 chính (Header, Compass 360°, Drawer 7 tầng)
├── css/
│   └── styles.css      # Toàn bộ định dạng Glassmorphism, hiệu ứng dạ quang & Responsive
├── js/
│   ├── data.js         # Dữ liệu học thuật 7 Tầng Nghị Luận Xã Hội (LIGHTHOUSE_TIERS)
│   ├── audio.js        # Bộ tổng hợp âm thanh sóng biển, gió & sấm bằng Web Audio API
│   ├── shaders.js      # GLSL Shaders bầu trời Mặt Trời / Dải Ngân Hà & công thức biển dạ quang
│   ├── models.js       # Các hàm dựng mô hình 3D: Mặt Trời, Hải Đăng, Chim Hải Âu, Hạt Dạ Quang
│   └── main.js         # Khởi tạo Scene, ánh sáng, tương tác xoay 0°–360°, Raycasting & Animation
└── README.md           # Hướng dẫn sử dụng và cấu trúc mã nguồn
```

## 2. Các nâng cấp ngoại hình nổi bật
- **Góc 0° (Ban Ngày — Mặt Sáng)**:
  - Bầu trời xanh trong với **Mặt Trời 3D rực rỡ** có lõi sáng, quầng hào quang (`corona`) đa lớp và tia nắng xoay nhẹ, phản chiếu vệt nắng vàng lấp lánh trên mặt biển.
  - **Đàn chim hải âu 3D chi tiết**: Thân trắng thuôn khí động học, đầu có gờ mày và mắt xanh lá, mỏ vàng cam khoằm, chân cam có màng bơi thu gọn dưới bụng, đuôi xòe quạt và **cánh khớp nối 2 đoạn** (khớp vai + khớp khuỷu) phối màu trắng – xám – chóp đen vỗ cánh mềm mại.
- **Góc 180° (Ban Đêm — Mặt Tối & Biển Dạ Quang)**:
  - **Bầu trời đêm đầy sao & Dải Ngân Hà (Milky Way)** vắt chéo qua bầu trời kèm hàng nghìn ngôi sao 3D nhấp nháy.
  - **Biển xanh dạ quang (Bioluminescent Ocean)**: Sóng biển ban đêm phát sáng màu xanh lam dạ quang (`#00F0FF`) dọc theo đỉnh sóng, các vòng bọt sóng vỗ quanh chân đảo đá và hàng nghìn hạt sinh vật phù du phát sáng lấp lánh trên mặt nước.
  - **Ngọn hải đăng phát sáng rực rỡ**: Hệ thống cửa sổ vòm chia ô (`mullioned windows`) trên các tầng tháp và cửa chính phát sáng vàng cam ấm áp (`emissive` + `bloom halo` + `PointLight`), kết hợp phòng đèn Fresnel xanh ngọc xoay 360° quét hai luồng sáng xuyên màn đêm.

## 3. Cách chạy trên máy tính (VS Code)
1. Giải nén file `hai_dang_uoc_mo_project_modular.zip`.
2. Mở thư mục trong **VS Code** và nhấn **Go Live** (tiện ích *Live Server*) hoặc mở trực tiếp file `index.html` trên trình duyệt Chrome / Edge / Safari.
