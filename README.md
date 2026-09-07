# 小店快收 POS

為台灣小吃店、攤商與 1–3 人餐飲店設計的單頁點餐工具。這個 repository 是獨立重寫的商業 MVP，不會讀取、修改或依賴既有的「五結大腸麵線 POS」網站或其訂單資料。

## MVP 功能

- 大按鈕菜單、分類切換與加料快捷鍵
- 內用／外帶、數量調整、收現與找零
- 完成訂單後產生取餐號
- 瀏覽器列印收據
- 今日營收、客單價、熱銷品項與歷史訂單
- 菜單價格與販售狀態管理
- CSV 匯出
- 本機資料持久化（localStorage）

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

目前版本是可操作的商業驗證 MVP。資料只保存在使用者當下的瀏覽器，不適合直接用於多門市、多人共用或需要法規留存的正式營運。

正式 SaaS 版本應加入帳號與門市隔離、加密雲端備份、離線佇列與同步、權限、稽核紀錄、資料匯入／匯出，以及透過合格服務商整合電子發票與支付。

## 專案文件

- [商業企劃](docs/business-plan.md)
- [產品路線圖](docs/product-roadmap.md)

## 技術

React 19、TypeScript、Vinext/Vite、Tailwind CSS、Shadcn primitives。

## 授權

目前未提供開源授權。所有權與後續授權方式由 repository 擁有者決定。
