# Deploy WC26VN lên Vercel

Tài liệu này hướng dẫn deploy dự án **WC26VN** (World Cup 2026 wallpaper) lên [Vercel](https://vercel.com) dưới dạng static site + Serverless Functions.

## Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Edge / CDN                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Static assets (index.html, assets/, flags/,         │  │
│  │  scripts/, knockout/, worldcup-live-data.js)         │  │
│  │  → Cache 1 năm, immutable                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Serverless Functions (/api/*)                       │  │
│  │  • /api/espn-scoreboard   → proxy ESPN scoreboard    │  │
│  │  • /api/espn-summary     → proxy ESPN match summary │  │
│  │  • /api/livescore-stats  → aggregate LiveScore pages│  │
│  │  → CORS bypass, timeout 8s, edge cache 30s          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
              │                              │
              ▼                              ▼
   site.api.espn.com              www.livescore.com
```

## Cấu trúc sau khi tối ưu

```
.
├── index.html              # Trang chính (đã thêm meta SEO, preload)
├── preview.html            # Trang preview
├── preview.jpg / .png      # Ảnh preview
├── project.json            # Wallpaper Engine metadata
├── deploy-info.js          # Build/deploy info
├── worldcup-live-data.js   # Bundle dữ liệu World Cup
├── worldcup-player-stats.js
│
├── assets/                 # Hình ảnh (immutable cache 1 năm)
├── flags/                  # Cờ các đội (immutable cache 1 năm)
├── scripts/                # JS modules (immutable cache 1 năm)
├── knockout/               # Knockout stage
│
├── api/                    # 🆕 Vercel Serverless Functions
│   ├── espn-scoreboard.js
│   ├── espn-summary.js
│   └── livescore-stats.js
│
├── vercel.json             # 🆕 Vercel config
└── .vercelignore           # 🆕 Loại bỏ file dev khi deploy
```

## Cách deploy

### 1. Qua Vercel Dashboard (khuyến nghị)

1. Đẩy dự án lên GitHub/GitLab/Bitbucket.
2. Vào [vercel.com/new](https://vercel.com/new) → **Import Project**.
3. Chọn repo, để mặc định:
   - **Framework Preset**: `Other`
   - **Build Command**: _(để trống — static site)_
   - **Output Directory**: _(để trống — root)_
4. Nhấn **Deploy**. Done.

### 2. Qua Vercel CLI

```bash
# Cài CLI (lần đầu)
npm i -g vercel

# Login
vercel login

# Deploy preview
vercel

# Deploy production
vercel --prod
```

## Cấu hình tự động phát hiện

Khi `index.html` chạy trên Vercel (host `*.vercel.app` / `*.vercel.sh` / `*.now.sh` và `https:`), file này sẽ **tự động** gọi `/api/*` proxy thay vì gọi trực tiếp ESPN / LiveScore. Khi chạy ở local / Steam Workshop / Wallpaper Engine, code giữ hành vi cũ (gọi trực tiếp).

Bạn cũng có thể ép buộc dùng proxy qua query string:
- `?proxy=1` — luôn dùng proxy.
- `?api=https://your-proxy.example.com` — dùng custom proxy.
- `?local=1` — buộc dùng bundle local (dùng cho Wallpaper Engine).

## API Endpoints

### `GET /api/espn-scoreboard`

Proxy cho `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard`.

| Query   | Bắt buộc | Mặc định | Mô tả                       |
| ------- | -------- | -------- | --------------------------- |
| `dates` | không    | —        | `YYYYMMDD-YYYYMMDD`         |
| `limit` | không    | `200`    | Số trận tối đa              |
| `lang`  | không    | —        | Ngôn ngữ                    |
| `region`| không    | —        | Khu vực (vd: `vn`)          |
| `utcOffset`| không  | —      | Offset UTC (vd: `420` cho UTC+7) |

Response: JSON nguyên bản từ ESPN.

### `GET /api/espn-summary?event=<id>`

Proxy cho ESPN match summary.

| Query   | Bắt buộc | Mô tả                          |
| ------- | -------- | ------------------------------ |
| `event` | **có**   | ESPN event ID (chỉ chữ số)    |

Response: JSON nguyên bản từ ESPN.

### `GET /api/livescore-stats`

Tổng hợp 3 trang LiveScore player stats (goals/assists/shots) thành một JSON duy nhất. In-memory cache 90s.

Response:
```json
{
  "goals":  [ /* players */ ],
  "assists":[ /* players */ ],
  "shots":  [ /* players */ ]
}
```

## Tối ưu đã áp dụng

| Mục                              | Trước                          | Sau                                                 |
| -------------------------------- | ------------------------------ | --------------------------------------------------- |
| Routing                          | trực tiếp gọi ESPN/LiveScore  | qua Vercel Functions (bypass CORS)                  |
| Cache headers                    | không có                       | immutable 1 năm cho assets, SWR 30s cho API         |
| Security headers                 | không có                       | `X-Content-Type-Options`, `Referrer-Policy`, …      |
| SEO / social                     | chỉ `<title>`                 | thêm Open Graph, Twitter Card, description          |
| Preload assets                   | chỉ ảnh nền                   | thêm 2 script lớn + DNS prefetch ESPN               |
| Build artifacts                  | upload cả `node_modules`       | loại bỏ qua `.vercelignore`                         |
| Rewrites                         | không                          | `/ko` → group stage, `/preview` → preview page      |

## Bảo trì

- **CORS upstream thay đổi**: cập nhật headers trong từng file `api/*.js`.
- **ESPN đổi URL**: sửa hằng số `ESPN_BASE` trong `api/espn-scoreboard.js` / `api/espn-summary.js`.
- **Vercel Hobby plan** giới hạn 10s execution time cho functions — đã set `maxDuration: 10` và timeout fetch 8s.
- **Cache edge**: nếu cần flush ngay, dùng Vercel CLI `vercel cache purge` hoặc bump query string version trong code.

## URL sau khi deploy

Mặc định Vercel cấp subdomain dạng `<project-name>.vercel.app`. Bạn có thể gắn custom domain trong **Project Settings → Domains**.

## Giấy phép dữ liệu

Dữ liệu từ ESPN / LiveScore / FIFA chỉ dùng cho mục đích phi thương mại. Khi sử dụng production, hãy kiểm tra Terms of Service của từng nguồn và ghi credit rõ ràng.
