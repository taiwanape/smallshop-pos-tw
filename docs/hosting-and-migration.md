# 日常工具所：網站主機與資料搬移

2026-09-09 補充：下列 Sites 網址是目前已上線的入口。依 What’Sub 分層做法新增的 Cloudflare Workers 主機版本尚待帳號登入與發布，請見[架構與部署說明](whatsub-architecture.md)。未取得並驗證新網址前不改變對外入口；日後搬往 Cloudflare 時，Sites 與 GitHub Pages 都是可能的舊資料來源，應回到實際保存紀錄的那個網址匯出。

## 網站放在哪裡

- 對外入口：<https://smallshop-pos-tw.taiwanape1.chatgpt.site/>
- 程式碼：<https://github.com/taiwanape/smallshop-pos-tw>
- 原 GitHub Pages：<https://taiwanape.github.io/smallshop-pos-tw/>，保留免費展示及舊資料匯出。

目前使用既有帳號的 ChatGPT Sites，沿用既有網站，不建立重複主機。官方允許透過第三方金流銷售商品與服務。公開 Beta 期間用量計入帳號方案額度，額度可能改變；本次不購買主機方案、網域，也不開啟付費金流。

參考：[Sites 使用、公開分享與金流](https://help.openai.com/en/articles/20001339)、[Sites 條款](https://openai.com/policies/chatgpt-sites-terms/)、[GitHub Pages 限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)。查核日期：2026-09-08。

## 怎麼分享、更新與管理

分享對外入口即可。三個工具維持相同設計、原五結 21 品項及英文 106 段語音，不需要讓訪客登入 GitHub。

在 Codex／ChatGPT 的 Sites 清單開啟「日常工具所｜班級小夥伴・英文學習・小店快收」，可管理分享權限、已儲存版本與網域。既有網址就能使用，不必先買網域；將來若使用自有網域，需要先擁有網域並設定 DNS，換網域也要考慮資料搬移。

GitHub 的 main 更新後會自動執行測試、檢查型別，並產生新主機的 `daily-tools-site` 網站產物；原 Pages 仍自動部署。Sites 公開版本目前由此專案透過 Sites 發布流程更新，**不是 GitHub 一推送就自動更新 Sites**。每次更新須完成建置、推送相同來源至 Sites、保存版本及發布，最後核對公開 `release.json`。

開發命令：

```sh
pnpm test
pnpm typecheck
pnpm build:site   # 根網址，輸出 out；Sites 採用這份
pnpm build:pages  # /smallshop-pos-tw/ 子路徑，輸出 dist-pages
```

`.openai/hosting.json` 使用 `static.directory: out`、`not_found_handling: none`，找不到的腳本／音檔回傳 404，不以首頁 HTML 代替。英文 app 與工具入口保持同源；不要加上阻擋同源 iframe、語音、字型或 React Native Web 樣式的安全標頭。現有 `pnpm build` 保留原 Vinext 建置供後續後端開發；切換成伺服器發布時需相應調整 hosting 設定。

## 把舊紀錄帶過來

請在原本使用的裝置、瀏覽器及舊網址進行匯出。新舊網址屬於不同來源，資料不會自動共享；不要先清除舊站資料，也不要先在新站修改菜單或記單。

| 工具 | 舊網址匯出 | 新網址匯入與注意事項 |
| --- | --- | --- |
| 班級小夥伴 | 管理與備份 → 下載全部班級備份 | 已有備份？匯入班級，或管理與備份 → 匯入備份為新班級。會新增班級，保留原本資料；不要反覆匯入同一份造成重複。 |
| 英文學習室 | 設定 → 匯出閱讀與字卡；另匯出詞庫收藏 | 在相同位置分別貼上兩份 JSON 內容。閱讀會合併；詞庫收藏會取代新站現有收藏，取代前程式會保留本機備份。 |
| 小店快收 | 完整備份，下載 JSON | 匯入備份 → 確認匯入。全新帳本可還原菜單；已有使用紀錄時保留新站菜單。CSV 不含還原所需的完整資料。 |

匯入完成後核對班級／學生數、積分、文章／字卡、菜單／價格及訂單總數。未儲存草稿、購物車不在完整備份內。備份檔可能包含私人資料，留在自己的裝置，不要加入公開 GitHub repository。

## 收費仍需完成的部分

搬到允許商業用途的主機，不代表帳號、訂閱與雲端資料已完成。目前仍是本機資料的公開試用工具。

下一階段是帳號及資料隔離、雲端備份／復原、付款後開通權限、續訂與取消。若採第三方金流，卡片資料只由金流端收取，後端必須核實付款通知。正式點餐版本也需完成對帳、退款、裝置與故障復原驗收。

## 回復前一版

保留每次 GitHub 來源版本與 Sites 已保存版本。新版本有問題時，重新發布先前成功的 Sites 版本；不要用清除使用者資料來修復部署。程式版本回復不等於資料回復，需要另用各工具備份。
