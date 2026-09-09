# What’Sub 視覺重製

2026-09-10，依使用者指定的 [What’Sub](https://whatsub.equal2.app/) 重新設計日常工具所。以公開頁面觀察到的黑白漫畫首屏、荧光綠點綴、懸浮膠囊導覽、白色功能卡片、問答展開列與綠色頁尾作為版型依據，保留日常工具所自己的名稱、文案與三個工具。

## 共用樣式

- 紙白 `#F7F6F2`、墨黑 `#0A0A0A`、荧光綠 `#39FF14`、細框 `#E5E3DC`、次要文字 `#575751`。
- 桌面三欄功能卡片；手機改單欄與可展開導覽，按鈕保留清楚的鍵盤焦點。
- 班級、點餐、閱讀與會員視窗統一顏色、邊框與陰影；寵物與書本圖以黑白呈現，避免舊有彩色風格混用。
- 頁面的三張工具預覽為靜態操作示意，不讀取、修改或假造使用者的實際紀錄。
- 會員、菜單價格、訂單、班級、字卡、備份與語音功能不因視覺更新而變更。

## 原創主圖

使用內建 GPT ImageGen 產生黑白漫畫主圖，並非搬用參考站的插圖或標誌。

- 網站資產：`public/design/daily-tools-comic.webp`，1536 × 1024。
- 完整提示詞：[daily-tools-comic-prompt.txt](daily-tools-comic-prompt.txt)。
- 圖片保留右側留白供真正的 HTML 標題與按鈕使用；手機將文案移至插圖上方。

## 修改位置

首頁：`components/suite-home.tsx`；導覽：`components/suite-nav.tsx`；全站樣式：`app/reference-theme.css`。英文 app 在相鄰 `../lexiharbor` 的共用主題、按鈕與閱讀畫面修改後重新匯出，使用 `scripts/sync-lexiharbor.mjs` 同步，來源 commit 記錄於 `docs/lexiharbor-source.json`。

正式網站仍為 Cloudflare Workers，GitHub main 自動發布。舊網站維持轉址，不再提供舊版工具介面。
