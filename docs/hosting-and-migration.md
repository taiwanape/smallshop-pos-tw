# 日常工具所：單一正式網站

正式網址：https://daily-tools.taiwanape.workers.dev/

程式碼保留在 GitHub；main 更新後，Cloudflare 自動測試、建置、套用會員資料庫 migration 並發布。網站包含班級小夥伴、LexiHarbor 英文學習室及原五結 21 品項點餐。

原 Sites 與 GitHub Pages 只提供自動轉址，不再提供舊版工具或搬站說明。原瀏覽器紀錄及 Git 歷史不會刪除；不同網址來源的本機資料也不會被自動匯入。

工具資料保存在目前瀏覽器，同瀏覽器共用，請定期備份。Google 會員使用 Cloudflare D1，登入不會切換或同步工具資料。

- 管理主機：Cloudflare Dashboard → Workers & Pages → daily-tools。
- build:cloudflare → dist-cloudflare，正式網站。
- build:pages → dist-pages，只轉址，由 GitHub Actions 發布。
- build:site → out，只轉址，由 Sites 保存並發布。
- .openai/hosting.json 只描述舊 Sites 的靜態轉址產物，沒有會員資料庫綁定。

完整資料見 [部署架構](whatsub-architecture.md) 與 [Google 會員](member-auth.md)。
