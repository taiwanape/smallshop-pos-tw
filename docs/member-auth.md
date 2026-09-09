# Google 會員

正式入口：https://daily-tools.taiwanape.workers.dev/

首頁及三個工具右上方的「登入／註冊」開啟共用會員視窗。使用 Google 官方按鈕選擇帳號，首次登入建立會員；會員視窗提供姓名、電子郵件、加入日期及登出。訪客仍可使用工具。

## 資料範圍

- 會員資料：Cloudflare D1 `daily-tools-members`，binding `MEMBERS_DB`。
- 工具資料：仍使用原本的 IndexedDB／localStorage；同瀏覽器共用，不依會員切換，也不自動同步。UI 及 privacy.html 都明示此行為。
- 不保存 Google 密碼、access token 或 refresh token，不請求 Gmail／Drive 權限。

## 部署設定

Google Cloud 專案：`daily-tools-508103`。Google Auth Platform 使用 External audience 和 Web application client；JavaScript origin 為 `https://daily-tools.taiwanape.workers.dev`，沒有尾斜線、path 或 hash。popup callback 不使用 client secret 或 redirect URI。

Wrangler 的 `GOOGLE_CLIENT_ID` 為 Google 產生的公開 Web client ID，`APP_ORIGIN` 為上述精確 origin。沒有 client ID／D1 時登入 API 回傳 503，不模擬成功。正式發布後以 `/api/health` 的 `accounts: true` 和真實 Google 登入確認啟用。

`pnpm deploy:cloudflare` 先套用 `worker/migrations` 到正式 D1，再發布 Worker。GitHub → Cloudflare 的 build token 需要 D1 與 Worker 部署權限。前端建置不需要任何 Google secret。

## API 與保護

| API | 行為 |
| --- | --- |
| POST /api/auth/config | 同源 JSON 請求，取得公開 client ID 與 5 分鐘的一次性 nonce |
| POST /api/auth/google | Google RS256 簽章、固定 issuer、audience、iat／exp、nonce、verified email；以 Google sub 作會員唯一鍵 |
| GET /api/auth/session | 讀取目前會員與登出 CSRF token；匿名回傳 user: null |
| POST /api/auth/logout | 驗 Origin／CSRF 並撤銷目前 session |

登入 nonce 與 session 使用隨機 256-bit 值，D1 只保存 SHA-256 hash。Cookie 為 __Host- 前綴、Secure、HttpOnly、SameSite=Lax、Path=/，session 最長 7 天。登入以 DELETE RETURNING 原子消耗 nonce，會員 upsert 與 session 寫入由 D1 batch 執行。所有 API 回應 no-store。

匿名登入端點使用 Cloudflare Rate Limiting binding，最多每來源網路每分鐘 60 次，超過回傳 429 與 Retry-After。這是各 Cloudflare 節點的濫用防護，並非全球精準配額；限制較寬以容納共用校園網路。

官方參考：[GIS 設定](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)、[ID token 驗證](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)、[D1](https://developers.cloudflare.com/d1/worker-api/d1-database/)、[Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)。
