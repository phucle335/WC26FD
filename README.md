# WC26VN — Wallpaper World Cup 2026 (UTC+7)

Wallpaper Engine hiển thị dữ liệu trực tiếp World Cup 2026 theo giờ Việt Nam (UTC+7): bảng xếp hạng, 5 trận tiếp theo, cờ đội và cập nhật tỷ số.

![Workshop](https://img.shields.io/badge/Steam-Workshop-1b2838?style=flat-square&logo=steam)
![Version](https://img.shields.io/badge/version-19-1b2838?style=flat-square)
![Stage](https://img.shields.io/badge/stage-Knockout-ffd166?style=flat-square)
![Timezone](https://img.shields.io/badge/timezone-UTC%2B7-6ae9ff?style=flat-square)

## Mục lục

- [Giới thiệu](#giới-thiệu)
- [Tính năng](#tính-năng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Cài đặt & Triển khai](#cài-đặt--triển-khai)
- [Cách hoạt động](#cách-hoạt-động)
- [Scripts tiện ích](#scripts-tiện-ích)
- [Bảo trì & Tự phục hồi](#bảo-trì--tự-phục-hồi)
- [Build & Version](#build--version)
- [Đóng góp](#đóng-góp)
- [Giấy phép & Credits](#giấy-phép--credits)

## Giới thiệu

**WC26VN** là một wallpaper động cho [Wallpaper Engine](https://www.wallpaperengine.io/) theo dõi World Cup 2026. Toàn bộ thời gian được quy đổi sang múi giờ Việt Nam (UTC+7) để người xem tại Việt Nam nắm được lịch thi đấu và kết quả theo giờ địa phương.

- **Workshop ID:** `3745494067`
- **Loại:** Web Wallpaper (`index.html`)
- **Phiên bản:** `19`
- **Build gần nhất:** `knockout-v85`
- **Cập nhật:** `2026-06-28`
- **Ngôn ngữ:** Tiếng Việt

## Tính năng

- Bảng xếp hạng các bảng đấu (group stage).
- Hiển thị 5 trận sắp diễn ra kèm đếm ngược.
- Tự động chuyển sang giai đoạn **Knockout** khi vòng bảng kết thúc.
- Cờ các đội tuyển (`assets/` + `flags/`).
- Cập nhật tỷ số trực tiếp từ nguồn ESPN.
- Tự phục hồi dữ liệu khi nguồn bị lỗi (`wc26-self-heal.js`).
- Tối ưu hiển thị cho nhiều tỉ lệ màn hình (kể cả màn hình dọc).

## Cấu trúc dự án

```
.
├── index.html                 # Wallpaper chính
├── project.json               # Metadata Wallpaper Engine
├── preview.jpg                # Ảnh xem trước
├── preview.png                # Ảnh xem trước (phụ)
├── preview.html               # Trang test preview
├── deploy-info.js             # Thông tin build/deploy
├── worldcup-live-data.js      # Dữ liệu trực tiếp (bundle)
├── worldcup-player-stats.js   # Thống kê cầu thủ
│
├── assets/                    # Hình ảnh nền & icon
│   ├── bg-poster.jpg
│   ├── world-cup-trophy.png
│   ├── world-cup-trophy-keyed.png
│   ├── icon-goal.png
│   └── icon-assist.png
│
├── flags/                     # Cờ các đội tuyển
│
├── knockout/                  # Dữ liệu giai đoạn knockout
│
├── scripts/                   # Scripts Node.js hỗ trợ build & validate
│   ├── bracketGenerator.js
│   ├── fifa2026Bracket.js
│   ├── knockout-*.js
│   ├── standings-rank.js
│   ├── validate-bracket.js
│   ├── verify-knockout.js
│   ├── wc26-logic.js
│   └── wc26-self-heal.js
│
├── test-results/              # Kết quả test tự động
├── fix_espn.js                # Patch tạm cho nguồn ESPN
├── fix_espn2.js
├── fix_ivory.js
├── fix_quotes.js
└── node_modules/              # Phụ thuộc dev (test/build)
```

## Cài đặt & Triển khai

### Cài vào Steam Workshop

1. Mở Steam Workshop tại: `steam://url/CommunityFilePage/3745494067`.
2. Nhấn **Subscribe**.
3. Trong Wallpaper Engine, chọn wallpaper **WC26VN** từ danh sách.

### Chạy cục bộ để dev

Yêu cầu: Node.js >= 18.

```bash
# Cài dependency (nếu dùng scripts/)
npm install

# Chạy dev server (xem trước wallpaper)
node scripts/dev-server.js
```

Mở `preview.html` hoặc `http://localhost:<port>` để kiểm tra.

## Cách hoạt động

1. **`worldcup-live-data.js`** chứa dữ liệu fixture/standings được build sẵn.
2. Khi wallpaper chạy, `index.html` tải dữ liệu và chuyển múi giờ sang UTC+7.
3. Khi đến giai đoạn knockout, module trong `scripts/knockout-*` được nhúng và cập nhật cấu trúc vòng đấu.
4. `wc26-self-heal.js` theo dõi lỗi runtime (thiếu flag, JSON hỏng…) và tự vá.
5. `deploy-info.js` ghi lại `updatedAt` và `build` để dễ rollback.

## Scripts tiện ích

Tất cả nằm trong `scripts/`.

| Script | Mô tả |
| --- | --- |
| `dev-server.js` | Chạy server dev để xem trước wallpaper trên trình duyệt. |
| `bracketGenerator.js` | Sinh khung bracket knockout. |
| `fifa2026Bracket.js` | Bracket chính thức của FIFA 2026. |
| `knockout-bracket-layout.js` | Layout hiển thị bracket. |
| `knockout-adapter.js` | Adapter dữ liệu giữa các nguồn. |
| `knockout-fixtures.js` | Danh sách trận knockout. |
| `knockout-annex-c.js` | Phụ lục C của dữ liệu knockout. |
| `standings-rank.js` | Tính thứ hạng bảng đấu. |
| `thirdPlaceCalculator.js` | Tính suất đội hạng ba. |
| `validate-bracket.js` | Kiểm tra cấu trúc bracket. |
| `verify-knockout.js` | Xác minh toàn bộ dữ liệu knockout. |
| `wc26-logic.js` | Logic lõi của wallpaper. |
| `wc26-self-heal.js` | Tự phục hồi khi gặp lỗi runtime. |

## Bảo trì & Tự phục hồi

- Nếu dữ liệu ESPN thay đổi schema, dùng `fix_espn.js` / `fix_espn2.js` để patch nhanh.
- `fix_ivory.js` xử lý riêng trường hợp đội Bờ Biển Ngà (Ivory Coast).
- `fix_quotes.js` chuẩn hoá dấu nháy trong JSON đã embed.
- Sau khi vá, chạy `node scripts/verify-knockout.js` để xác minh dữ liệu.

## Build & Version

- **Version trong `project.json`** tăng khi thay đổi giao diện chính.
- **`build`** trong `deploy-info.js` đánh theo từng đợt deploy (ví dụ `knockout-v85`).
- Bump version khi publish bản mới lên Workshop:

```bash
# 1. Cập nhật project.json -> version
# 2. Cập nhật deploy-info.js -> updatedAt & build
# 3. Upload qua Steam Workshop
```

## Đóng góp

1. Fork / tạo branch mới.
2. Chạy `node scripts/verify-knockout.js` và `node scripts/validate-bracket.js` trước khi commit.
3. Mô tả rõ thay đổi trong message (data / layout / fix / feat).

## Giấy phép & Credits

- Dữ liệu giải đấu thuộc **FIFA / ESPN** — chỉ sử dụng cho mục đích phi thương mại.
- Wallpaper phát hành trên Steam Workshop theo điều khoản của Wallpaper Engine.
- Tài sản hình ảnh trong `assets/` thuộc về chủ sở hữu tương ứng.

---

Wallpaper Engine Workshop URL: `steam://url/CommunityFilePage/3745494067`