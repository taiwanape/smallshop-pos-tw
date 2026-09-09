# 日常工具所｜DAILY TOOLS

[開啟公開網站](https://smallshop-pos-tw.taiwanape1.chatgpt.site/) · 不用 GitHub 或 ChatGPT 帳號，手機與電腦都能使用。

2026-09-08 三套工具整合在同一個網站。對外主機使用 ChatGPT Sites，程式碼保留在 GitHub；[原 GitHub Pages](https://taiwanape.github.io/smallshop-pos-tw/) 保留免費展示與舊資料匯出。首頁的「新的分享網址與資料搬移」可查看操作步驟；完整說明見[主機與資料搬移](docs/hosting-and-migration.md)。

- [班級小夥伴](https://smallshop-pos-tw.taiwanape1.chatgpt.site/#/classroom)：名單、分組、點名、積分、兌換食物、餵養成長、排行榜、撤銷與 JSON／CSV 備份。依據使用者提供的 0908.mp4 實作。
- [英文學習室](https://smallshop-pos-tw.taiwanape1.chatgpt.site/#/learn)：完整 LexiHarbor 閱讀、字卡、複習、字典及 106 段精選 AI 語音。
- [小店快收](https://smallshop-pos-tw.taiwanape1.chatgpt.site/#/pos)：點餐、內用／外帶、現金找零、取餐號、收據列印、日報、菜單編輯、訂單作廢與備份。舊的 `#/demo` 網址仍能使用。

## 設計與原菜單

參照使用者提供的三張介面設計：奶油底色、黃／粉／綠色塊、黑框與膠囊導覽，點餐頁採藍灰與橘色操作按鈕。GPT ImageGen 產生八隻寵物、麵線與書本角色；[插圖與完整提示詞](docs/design-v2-prompts.md)。英文介面的顏色、卡片與書本角色也一併更新。

點餐預設採用[原五結點餐工具](https://taiwanape.github.io/Pos/)的 21 個品項與原價，四種煎類皆可加蛋 +10。只自動升級從未修改的舊示範菜單；自訂菜單保留。需要手動套用時，開啟「菜單」→「套用五結菜單」→「套用至草稿」→「儲存菜單」。歷史訂單名稱、價格、號碼不會重寫。

## 手機操作與介面一致性

工具導覽使用相同的圖示與按鈕語言。手機點餐加入餐點後會顯示份數、總額與「查看訂單」，可直接前往購物車；購物車出現在畫面時，捷徑自動收起。數量加減按鈕放大為 44 × 44 px。班級的浮動操作只在學生頁且操作面板不在畫面時出現。

英文閱讀、字典、複習與設定共用按鈕樣式，滑鼠移入及按下時保留文字對比。手機閱讀角色移到標題旁，縮短介紹區。三張閱讀卡片維持同一角色與插圖風格。

## 資料保存

資料存在目前瀏覽器，不會跨裝置同步；分享網址不會分享班級、字卡或訂單。請定期匯出備份。切換上方工具導覽會保留未結帳購物車、付款輸入與文章草稿；重新整理或關閉分頁不保證保留未儲存內容。

原始五結網站的 `wujie_*` 資料未被修改。已在 GitHub 網址儲存的紀錄仍留在舊站；Sites 與 GitHub 是不同來源，需要各工具的匯出／匯入功能搬移資料。英文包含閱讀與詞庫收藏兩份備份；POS 請使用完整 JSON 備份，於新站開始記單前搬移。

目前為公開試用，沒有雲端帳號、支付串接或收費機制。

## 開發與發布

2026-09-09 依 What’Sub 的公開架構證據，新增可獨立部署至使用者 Cloudflare 帳號的 Workers 版本：網站與 API 同網域、GitHub 連動建置、相容原三工具。對方的 Cloudflare DNS／代理可確認，但原站主機及資料庫品牌未公開。[查核與部署說明](docs/whatsub-architecture.md)。新主機尚待 Cloudflare 帳號登入與發布，現有 Sites 網址維持使用；會員、雲端資料與收款仍未啟用。

需要 Node.js 22.13 以上及 pnpm。

```sh
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build:site
pnpm build:pages
pnpm build:cloudflare
pnpm check:cloudflare
```

`pnpm build:pages` 產生 `dist-pages`，包含所有工具、插圖、英文內容及語音。發布程式只重寫英文 app 的本機 `/lexiharbor` 路徑至 `/smallshop-pos-tw/lexiharbor`，保留來源及授權連結；檢查入口資源與語音數量，建立 `.nojekyll` 和 `release.json`。推送 `main` 後，GitHub Actions 自動測試並部署 Pages。

`pnpm build:site` 產生根路徑版本 `out`，包含相同工具、插圖與 106 段語音。CI 會檢查並保留 `daily-tools-site` 產物；Sites 發布仍需透過 Sites 的保存版本／發布流程，不會因 GitHub 推送就自動更新。`release.json` 記錄來源版本、網址及路徑。

原 `pnpm dev` / `pnpm build` 的 Vinext 路由保留供後端開發。現行 Sites 使用靜態根路徑版本，三個工具都沿用 `#/classroom`、`#/learn`、`#/pos`。

英文 app 原始碼位於相鄰 `../lexiharbor`。在該專案執行 `node scripts/build-web.mjs` 後回來執行 `node scripts/sync-lexiharbor.mjs`，可同步完整靜態輸出及 [來源版本](docs/lexiharbor-source.json)。

29 項自動測試涵蓋班級積分交易、餵養與撤銷、POS 併發結帳及備份、原菜單核對、舊資料升級、GitHub 子路徑與新主機根路徑、API 分流及部署網址驗證。測試使用 fake-indexeddb；不等於實體收銀設備驗收。

## 相關文件

- [影片分析與最初整合紀錄](docs/VIDEO_0908_AND_SUITE.md)
- [第二版商業與產品企劃](docs/replan-v2.md)
- [可修改的 Excel 企劃表](docs/business-plan-v2.xlsx)
- [產品路線圖](docs/product-roadmap.md)

目前未提供開源授權；所有權與後續授權由 repository 擁有者決定。
