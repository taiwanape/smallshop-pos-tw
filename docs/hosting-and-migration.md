# 日常工具所：網站主機與資料搬移

2026-09-09：對外入口已改用 Cloudflare Workers，程式碼繼續放在 GitHub，`main` 更新後自動測試、建置及發布。Sites 與 GitHub Pages 保留舊資料匯出入口；主機搬移不會自動搬移使用者瀏覽器內的資料。

## 網站放在哪裡

- 對外入口：<https://daily-tools.taiwanape.workers.dev/>
- 程式碼：<https://github.com/taiwanape/smallshop-pos-tw>
- 原 Sites：<https://smallshop-pos-tw.taiwanape1.chatgpt.site/>，保留舊資料匯出。
- 原 GitHub Pages：<https://taiwanape.github.io/smallshop-pos-tw/>，保留免費展示及舊資料匯出。

使用目前 Cloudflare 帳號的 Workers 免費方案與現成的 `workers.dev` HTTPS 網址，這次沒有購買付費主機方案或自有網域。免費方案有用量限制，實際額度與用量可在 Dashboard 查閱。

主機配置與參照來源見[架構與部署說明](whatsub-architecture.md)。平台規則見 [Workers 定價](https://developers.cloudflare.com/workers/platform/pricing/)、[GitHub Pages 限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)。

## 怎麼分享、更新與管理

直接分享 <https://daily-tools.taiwanape.workers.dev/> 即可。三個工具維持相同設計、原五結 21 品項及英文 106 段語音，訪客不需要登入 GitHub、Cloudflare 或 ChatGPT。

主機管理：登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)，在 Workers & Pages 開啟 `daily-tools`，查看建置／發布結果、版本、用量與網域。網站已有可分享的 HTTPS 網址，不必先買網域；將來如改用自有網域，需設定網域與 DNS，並再次處理不同來源的資料搬移。

更新流程：將程式修改推送到 GitHub `main`，Cloudflare 的 Git 整合自動執行 `pnpm test && pnpm typecheck && pnpm build:cloudflare`，成功後執行 `pnpm deploy:cloudflare`。檢查 Cloudflare 的建置與發布結果，再核對公開 `release.json` 的 commit、版本及網址；只看到 GitHub CI 成功，不等於 Cloudflare 已完成發布。

GitHub Actions 會另外執行測試、型別檢查、Sites／Cloudflare 建置及 Wrangler dry-run，保留建置產物；原 GitHub Pages 仍自動部署。原 Sites 保留匯出用途，其更新仍走 Sites 的保存版本／發布流程，GitHub 推送不會自動更新 Sites。

開發命令：

```sh
pnpm test
pnpm typecheck
pnpm build:cloudflare  # 根網址，輸出 dist-cloudflare；Cloudflare 採用這份
pnpm check:cloudflare  # 本機部署檢查，不發布
pnpm build:site   # 原 Sites 根網址，輸出 out
pnpm build:pages  # /smallshop-pos-tw/ 子路徑，輸出 dist-pages
```

Cloudflare 建置變數 `PUBLIC_SITE_URL` 設為 `https://daily-tools.taiwanape.workers.dev/`，供分享連結、首頁 `og:url` 及 `release.json` 使用。本機 CLI 建置也要明確設定環境變數；程式不會自行讀取 `.env` 中的這個值。

Cloudflare 使用 `wrangler.jsonc`：網站資源來自 `dist-cloudflare`，`/api` 與 `/api/*` 先由 Worker 處理。找不到的腳本／音檔回傳 404，不以首頁 HTML 代替。英文 app 與工具入口保持同源，回應標頭保留 iframe、語音、字型及 React Native Web 樣式相容性。原 Sites 的 `.openai/hosting.json` 仍使用 `out`；`pnpm build` 保留原 Vinext 建置，不是 Cloudflare 發布命令。

發布後，從相同 commit 建置本機產物，執行 `node scripts/verify-cloudflare.mjs https://daily-tools.taiwanape.workers.dev/`，核對線上版本、網址、API 與資源。

## 把舊紀錄帶過來

先用原本的裝置與瀏覽器，開啟實際存有紀錄的[原 Sites](https://smallshop-pos-tw.taiwanape1.chatgpt.site/)或[原 GitHub Pages](https://taiwanape.github.io/smallshop-pos-tw/)匯出，再到 [Cloudflare 新站](https://daily-tools.taiwanape.workers.dev/)手動匯入。三個網址屬於不同來源，資料不會自動共享；不要先清除舊站資料，也不要先在新站修改菜單或記單。舊站保留可操作的匯出入口，不強制跳轉以免使用者取不到資料。

| 工具       | 舊網址匯出                            | 新網址匯入與注意事項                                                                                        |
| ---------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 班級小夥伴 | 管理與備份 → 下載全部班級備份         | 已有備份？匯入班級，或管理與備份 → 匯入備份為新班級。會新增班級，保留原本資料；不要反覆匯入同一份造成重複。 |
| 英文學習室 | 設定 → 匯出閱讀與字卡；另匯出詞庫收藏 | 在相同位置分別貼上兩份 JSON 內容。閱讀會合併；詞庫收藏會取代新站現有收藏，取代前程式會保留本機備份。        |
| 小店快收   | 完整備份，下載 JSON                   | 匯入備份 → 確認匯入。全新帳本可還原菜單；已有使用紀錄時保留新站菜單。CSV 不含還原所需的完整資料。           |

匯入完成後核對班級／學生數、積分、文章／字卡、菜單／價格及訂單總數。未儲存草稿、購物車不在完整備份內。備份檔可能包含私人資料，留在自己的裝置，不要加入公開 GitHub repository。

## 收費仍需完成的部分

Cloudflare 主機已就位，目前仍是本機資料的公開試用工具。會員、跨裝置雲端同步、訂閱及收款尚未實作；`/api/health` 也明示 `storage: browser-local`、`accounts: false`、`billing: false`。

下一階段是帳號及資料隔離、雲端備份／復原、付款後開通權限、續訂與取消。若採第三方金流，卡片資料只由金流端收取，後端必須核實付款通知。正式點餐版本也需完成對帳、退款、裝置與故障復原驗收。

## 回復前一版

保留每次 GitHub 來源版本與 Cloudflare 發布版本。新版本有問題時，回復先前成功的 Cloudflare 部署，並在 GitHub `main` 修正或還原相應變更，避免下次自動發布再次帶入問題。不要用清除使用者資料修復部署；程式版本回復不等於資料回復，需要另用各工具備份。原 Sites 的保存版本與 GitHub Pages 仍各自獨立管理。
