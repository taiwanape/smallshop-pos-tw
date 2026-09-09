# 日常工具所｜DAILY TOOLS

[開啟公開網站](https://daily-tools.taiwanape.workers.dev/) · 不用 GitHub、Cloudflare 或 ChatGPT 帳號，手機與電腦都能使用。

三套工具整合在同一個 Cloudflare Workers 網站，程式碼保留在 GitHub，main 更新後自動測試、建置及發布。原 Sites 與 GitHub Pages 只提供轉址，不再提供另一份工具介面。

- [班級小夥伴](https://daily-tools.taiwanape.workers.dev/#/classroom)：名單、分組、點名、積分、兌換食物、餵養成長、排行榜、撤銷與 JSON／CSV 備份。依據使用者提供的 0908.mp4 實作。
- [英文學習室](https://daily-tools.taiwanape.workers.dev/#/learn)：完整 LexiHarbor 閱讀、字卡、複習、字典及 106 段精選 AI 語音。
- [小店快收](https://daily-tools.taiwanape.workers.dev/#/pos)：點餐、內用／外帶、現金找零、取餐號、收據列印、日報、菜單編輯、訂單作廢與備份。舊的 `#/demo` 網址仍能使用。

## 設計與原菜單

參照使用者提供的三張介面設計：奶油底色、黃／粉／綠色塊、黑框與膠囊導覽，點餐頁採藍灰與橘色操作按鈕。GPT ImageGen 產生八隻寵物、麵線與書本角色；[插圖與完整提示詞](docs/design-v2-prompts.md)。英文介面的顏色、卡片與書本角色也一併更新。

點餐預設採用[原五結點餐工具](https://taiwanape.github.io/Pos/)的 21 個品項與原價，四種煎類皆可加蛋 +10。只自動升級從未修改的舊示範菜單；自訂菜單保留。需要手動套用時，開啟「菜單」→「套用五結菜單」→「套用至草稿」→「儲存菜單」。歷史訂單名稱、價格、號碼不會重寫。

## 手機操作與介面一致性

工具導覽使用相同的圖示與按鈕語言。手機點餐加入餐點後會顯示份數、總額與「查看訂單」，可直接前往購物車；購物車出現在畫面時，捷徑自動收起。數量加減按鈕放大為 44 × 44 px。班級的浮動操作只在學生頁且操作面板不在畫面時出現。

英文閱讀、字典、複習與設定共用按鈕樣式，滑鼠移入及按下時保留文字對比。手機閱讀角色移到標題旁，縮短介紹區。三張閱讀卡片維持同一角色與插圖風格。

## 資料保存

資料存在目前瀏覽器，不會跨裝置同步；分享網址不會分享班級、字卡或訂單。請定期匯出備份。切換上方工具導覽會保留未結帳購物車、付款輸入與文章草稿；重新整理或關閉分頁不保證保留未儲存內容。

工具資料按瀏覽器保存，使用同一瀏覽器的人會共用。Google 會員登入、登出或切換帳號，都不會切換、清除或同步工具資料；共用裝置請使用各自的瀏覽器設定檔。既有本機資料和 Git 歷史不會因撤下舊網站而刪除。

Google 登入首次建立會員，再次登入辨識同一會員。會員姓名、電子郵件與 Google 識別碼保存在 Cloudflare D1；工具資料仍在本機。目前沒有支付串接、訂閱或跨裝置同步。詳見 [會員設定](docs/member-auth.md) 與 [隱私說明](https://daily-tools.taiwanape.workers.dev/privacy.html)。

## 開發與發布

本專案參照 What’Sub 公開可確認的前端／API 分層方式，選用自己的 Cloudflare Workers 主機。對方使用 Cloudflare DNS／代理可確認，但原站主機及資料庫品牌未公開，不能據此認定對方使用 Workers。[查核與部署說明](docs/whatsub-architecture.md)。會員 API 使用 Google Identity Services 與 Cloudflare D1，工具雲端同步及收款另待開發。

需要 Node.js 22.13 以上及 pnpm。

```sh
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build:cloudflare
pnpm check:cloudflare
pnpm build:site
pnpm build:pages
```

主要發布流程是 **GitHub `main` → Cloudflare 執行測試、型別檢查及 `pnpm build:cloudflare` → `pnpm deploy:cloudflare`**。根路徑網站產物為 `dist-cloudflare`，包含三個工具、插圖與 106 段語音。Cloudflare 建置變數 `PUBLIC_SITE_URL` 使用 `https://daily-tools.taiwanape.workers.dev/`；GitHub Actions 另外檢查建置與 Wrangler dry-run，但不負責 Cloudflare 正式發布。

`release.json` 記錄來源 commit、版本、分享網址及路徑。從相同來源版本建置後，可執行 `node scripts/verify-cloudflare.mjs https://daily-tools.taiwanape.workers.dev/` 核對線上版本與資源。Cloudflare 管理入口為 [Dashboard](https://dash.cloudflare.com/) → Workers & Pages → `daily-tools`。

`pnpm build:pages` 產生 dist-pages，只有導向正式網站的頁面；main 更新後由 GitHub Actions 自動發布轉址。

`pnpm build:site` 產生 out，只有導向正式網站的頁面。原 Sites 透過 Sites 保存／發布流程更新，不再包含工具程式或資料庫。

原 `pnpm dev` / `pnpm build` 的 Vinext 路由保留供後端開發，不是 Cloudflare 的正式建置命令。Cloudflare 的工具沿用 `#/classroom`、`#/learn`、`#/pos`，並保留 `/classroom`、`/learn`、`/pos`、`/demo` 舊路徑轉接。

英文 app 原始碼位於相鄰 `../lexiharbor`。在該專案執行 `node scripts/build-web.mjs` 後回來執行 `node scripts/sync-lexiharbor.mjs`，可同步完整靜態輸出及 [來源版本](docs/lexiharbor-source.json)。

自動測試涵蓋班級交易、POS 併發结帳、原菜單與備份、路徑及 API 分流，以及真實 JWT 簽章、會員建立、登入重放防護、CSRF、session 輪替及登出。資料庫測試使用記憶體 SQLite，工具測試使用 fake-indexeddb。

## 相關文件

- [影片分析與最初整合紀錄](docs/VIDEO_0908_AND_SUITE.md)
- [第二版商業與產品企劃](docs/replan-v2.md)
- [可修改的 Excel 企劃表](docs/business-plan-v2.xlsx)
- [產品路線圖](docs/product-roadmap.md)

目前未提供開源授權；所有權與後續授權由 repository 擁有者決定。
