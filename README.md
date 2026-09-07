# 小店快收 POS

為單櫃台小吃店設計的點餐產品展示。2026-09-07重新規劃為同生活圈、同店型的導入服務與產品驗證。這個獨立專案不讀取或修改既有「五結大腸麵線 POS」網站或資料。

## MVP 功能

- 大按鈕菜單、分類切換與加料快捷鍵
- 內用／外帶、數量調整、收現與找零
- 完成訂單後產生取餐號
- 瀏覽器列印收據
- 今日營收、客單價、熱銷品項與歷史訂單
- 菜單價格與販售狀態管理
- CSV 匯出
- IndexedDB交易、跨分頁防覆蓋、結帳重試保護
- 完整JSON備份與非破壞性匯入、作廢留痕
- 整數金額驗證、第1版展示資料遷移（保留原始資料）

## 本機執行

公開展示：<https://taiwanape.github.io/smallshop-pos-tw/>

需要 Node.js 22.13 以上與 pnpm。

```bash
pnpm install
pnpm dev
```

正式建置：

```bash
pnpm build
```

## 資料與產品界線

目前是產品展示，請勿輸入真實營業資料。尚未完成雲端備份、離線重啟、現金日結、完整退款與設備驗收。IndexedDB仍是瀏覽器本機資料，不是雲端帳本。

GitHub Pages限制以其運行商業SaaS或主要促進商業交易的網站，因此此網址僅供展示。正式營業另行部署至允許商用的服務，詳見[官方限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)。

正式 SaaS 版本應加入帳號與門市隔離、加密雲端備份、離線佇列與同步、權限、稽核紀錄、資料匯入／匯出，以及透過合格服務商整合電子發票與支付。

## 專案文件

- [下載第二版 Excel 企劃表](https://github.com/taiwanape/smallshop-pos-tw/raw/refs/heads/main/docs/business-plan-v2.xlsx)：含可修改的三情境、24 個月試算、90 天行動、實際收款／續繳紀錄與競品來源。
- [第二版商業與產品企劃](docs/replan-v2.md)
- [第一版企劃（歷史）](docs/business-plan.md)
- [產品路線圖](docs/product-roadmap.md)

## 技術

React 19、TypeScript、Vinext/Vite、Tailwind CSS、Shadcn primitives。

驗證：`pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm build:pages`。Node交易測試使用fake-indexeddb，不能代替實體設備、離線或商用驗收。

## 授權

目前未提供開源授權。所有權與後續授權方式由 repository 擁有者決定。
