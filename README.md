# 日常工具所｜DAILY TOOLS

[開啟公開網站](https://taiwanape.github.io/smallshop-pos-tw/) · 不用 GitHub 或 ChatGPT 帳號，手機與電腦都能使用。

2026-09-08 已將三套工具整合到 GitHub Pages，使用同一個導覽與新的視覺設計。

- [班級小夥伴](https://taiwanape.github.io/smallshop-pos-tw/#/classroom)：名單、分組、點名、積分、兌換食物、餵養成長、排行榜、撤銷與 JSON／CSV 備份。依據使用者提供的 0908.mp4 實作。
- [英文學習室](https://taiwanape.github.io/smallshop-pos-tw/#/learn)：完整 LexiHarbor 閱讀、字卡、複習、字典及 106 段精選 AI 語音。
- [小店快收](https://taiwanape.github.io/smallshop-pos-tw/#/pos)：點餐、內用／外帶、現金找零、取餐號、收據列印、日報、菜單編輯、訂單作廢與備份。舊的 `#/demo` 網址仍能使用。

## 設計與原菜單

參照使用者提供的三張介面設計：奶油底色、黃／粉／綠色塊、黑框與膠囊導覽，點餐頁採藍灰與橘色操作按鈕。GPT ImageGen 產生八隻寵物、麵線與書本角色；[插圖與完整提示詞](docs/design-v2-prompts.md)。英文介面的顏色、卡片與書本角色也一併更新。

點餐預設採用[原五結點餐工具](https://taiwanape.github.io/Pos/)的 21 個品項與原價，四種煎類皆可加蛋 +10。只自動升級從未修改的舊示範菜單；自訂菜單保留。需要手動套用時，開啟「菜單」→「套用五結菜單」→「套用至草稿」→「儲存菜單」。歷史訂單名稱、價格、號碼不會重寫。

## 資料保存

資料存在目前瀏覽器，不會跨裝置同步；分享網址不會分享班級、字卡或訂單。請定期匯出備份。切換上方工具導覽會保留未結帳購物車、付款輸入與文章草稿；重新整理或關閉分頁不保證保留未儲存內容。

原始五結網站的 `wujie_*` 資料未被修改。已在小店快收 GitHub 網址儲存的帳本會繼續使用；先前私人 Sites 網站與 GitHub 是不同來源，需要各工具的匯出／匯入功能搬移資料。

目前為公開試用，沒有雲端帳號、支付串接或收費機制。

## 開發與發布

需要 Node.js 22.13 以上及 pnpm。

```sh
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm build:pages
```

`pnpm build:pages` 產生 `dist-pages`，包含所有工具、插圖、英文內容及語音。發布程式只重寫英文 app 的本機 `/lexiharbor` 路徑至 `/smallshop-pos-tw/lexiharbor`，保留來源及授權連結；檢查入口資源與語音數量，建立 `.nojekyll` 和 `release.json`。推送 `main` 後，GitHub Actions 自動測試並部署 Pages。

原 Sites 的 `pnpm dev` / `pnpm build` 路由也保留，相同元件使用 `/classroom`、`/learn`、`/pos`。

英文 app 原始碼位於相鄰 `../lexiharbor`。在該專案執行 `node scripts/build-web.mjs` 後回來執行 `node scripts/sync-lexiharbor.mjs`，可同步完整靜態輸出及 [來源版本](docs/lexiharbor-source.json)。

25 項自動測試涵蓋班級積分交易、餵養與撤銷、POS 併發結帳及備份、原菜單核對、舊資料升級，以及 GitHub 子路徑處理。測試使用 fake-indexeddb；不等於實體收銀設備驗收。

## 相關文件

- [影片分析與最初整合紀錄](docs/VIDEO_0908_AND_SUITE.md)
- [第二版商業與產品企劃](docs/replan-v2.md)
- [可修改的 Excel 企劃表](docs/business-plan-v2.xlsx)
- [產品路線圖](docs/product-roadmap.md)

目前未提供開源授權；所有權與後續授權由 repository 擁有者決定。
