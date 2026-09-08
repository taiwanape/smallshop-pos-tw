# 英文閱讀卡片插圖統一

三張原創短文卡片統一為同一個紫色書本角色，搭配工作信封／週末閱讀／旅行地圖與行李箱。全部採粗黑線、奶油黃背景、4:3 構圖與相同圖框；使用 contain 完整顯示角色。

使用內建 GPT image_gen 生成並修正背景。正式原始檔儲存在相鄰 LexiHarbor 專案：

- `../lexiharbor/assets/design/reading-work.png`
- `../lexiharbor/assets/design/reading-weekend.png`
- `../lexiharbor/assets/design/reading-travel.png`

發布檔由 Expo 產生帶內容雜湊的檔名，同步到 `public/lexiharbor/assets/assets/design/`，建置時一併發布到 GitHub Pages。

[三張插圖與完整生成、編輯提示詞](https://github.com/taiwanape/lexiharbor/blob/main/docs/reading-artwork.md)
