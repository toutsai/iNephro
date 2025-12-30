# Excel → JSON 轉換指南

## 📋 功能說明

這個工具可以將衛福部「食品營養成分資料庫」Excel 檔案轉換為 JSON 格式，供 iNephro 營養查詢功能使用。

## 🚀 使用步驟

### 步驟 1：準備 Excel 檔案

將衛福部的 Excel 檔案放到專案的 `public/` 資料夾：

```bash
# 範例檔案路徑
iNephro/
  └── public/
      └── nutrition.xlsx  ← 放這裡
```

或者你也可以放在任何地方，稍後指定路徑即可。

### 步驟 2：執行轉換

**方式 1：使用預設路徑**（Excel 在 `public/nutrition.xlsx`）

```bash
npm run convert-nutrition
```

**方式 2：指定 Excel 檔案路徑**

```bash
npm run convert-nutrition -- /path/to/your/excel.xlsx
```

Windows 範例：
```bash
npm run convert-nutrition -- "C:\Users\suiam\Downloads\食品營養成分資料庫2024UPDATE2.xlsx"
```

Linux/Mac 範例：
```bash
npm run convert-nutrition -- /home/user/Downloads/nutrition.xlsx
```

### 步驟 3：查看結果

轉換完成後會自動生成 `public/nutrition-data.json`，並顯示統計資訊：

```
========================================
📊 轉換統計
========================================

總食物數量: 2134
🚫 楊桃（禁食）: 3
⚡ 高鉀高磷: 156
🔶 高鉀食物: 423
🔶 高磷食物: 287
🔶 高鈉食物: 198
✅ 安全食物: 1067

📦 檔案大小: 1234.56 KB

✨ 轉換完成！
```

## 📝 Excel 欄位對應

腳本會自動尋找以下欄位名稱（不區分大小寫）：

| 營養素 | Excel 可能欄位名稱 |
|--------|-------------------|
| 食物名稱 | `樣品名稱`, `食品名稱` |
| 分類 | `食品分類`, `俗名` |
| 熱量 | `熱量(kcal)`, `熱量` |
| 水分 | `水分(g)`, `水分` |
| 蛋白質 | `粗蛋白(g)`, `蛋白質` |
| 脂肪 | `粗脂肪(g)`, `脂肪` |
| 碳水化合物 | `碳水化合物(g)`, `總碳水化合物` |
| **鈉** | `鈉(mg)`, `鈉` |
| **鉀** | `鉀(mg)`, `鉀` |
| **磷** | `磷(mg)`, `磷` |
| **鈣** | `鈣(mg)`, `鈣` |
| **鎂** | `鎂(mg)`, `鎂` |

### 如果欄位名稱不同

如果你的 Excel 欄位名稱與上述不同，請編輯 `scripts/convert-excel-to-json.js`，找到這段程式碼：

```javascript
const food = {
  id: row['整合編碼'] || row['樣品編號'] || ...,
  name: row['樣品名稱'] || row['食品名稱'] || '',  // ← 修改這裡
  category: row['食品分類'] || row['俗名'] || '其他',
  // ... 其他欄位
};
```

將 `row['樣品名稱']` 改成你的 Excel 實際欄位名稱。

## ⚙️ 腎友警告自動判斷

轉換時會自動標記：

- 🚫 **楊桃**：含神經毒素，腎友禁食
- ⚡ **高鉀高磷**：鉀 > 300mg 且 磷 > 250mg
- 🔶 **高鉀**：鉀 > 300mg/100g
- 🔶 **高磷**：磷 > 250mg/100g
- 🔶 **高鈉**：鈉 > 100mg/100g

### 修改警告閾值

如果想調整判斷標準，編輯 `scripts/convert-excel-to-json.js`：

```javascript
function determineKidneyWarning(food) {
  const potassium = parseFloat(food.potassium) || 0;
  const phosphorus = parseFloat(food.phosphorus) || 0;
  const sodium = parseFloat(food.sodium) || 0;

  // 高鉀 (可修改 300)
  if (potassium >= 300) {
    return 'potassium';
  }

  // 高磷 (可修改 250)
  if (phosphorus >= 250) {
    return 'phosphorus';
  }

  // 高鈉 (可修改 100)
  if (sodium >= 100) {
    return 'sodium';
  }

  return null;
}
```

## 🔍 檢查生成的 JSON

轉換完成後，檢查 `public/nutrition-data.json`：

```json
{
  "version": "2024",
  "source": "衛生福利部食品藥物管理署 - 食品營養成分資料庫",
  "totalFoods": 2134,
  "foods": [
    {
      "id": "A010101",
      "name": "白米",
      "category": "穀物類",
      "sodium": 2,
      "potassium": 77,
      "phosphorus": 95,
      "calcium": 4,
      "magnesium": 14,
      "kidneyWarning": null
    },
    {
      "id": "B010101",
      "name": "香蕉",
      "category": "水果類",
      "sodium": 1,
      "potassium": 368,
      "phosphorus": 20,
      "calcium": 5,
      "magnesium": 27,
      "kidneyWarning": "potassium"  ← 自動標記高鉀
    }
  ]
}
```

## ❗ 常見問題

### Q1: 轉換時出現錯誤怎麼辦？

**A:** 檢查以下幾點：

1. Excel 檔案路徑是否正確
2. Excel 檔案是否已開啟（請關閉）
3. 是否有安裝 xlsx 套件（`npm install`）
4. Excel 欄位名稱是否與腳本匹配

### Q2: 轉換後食物數量很少？

**A:** 可能原因：

1. Excel 第一個工作表是否為資料表（不是說明頁）
2. 第一列是否為欄位標題
3. 是否有很多空白列

檢查腳本輸出的「跳過 XX 筆無效資料」訊息。

### Q3: 如何只轉換特定分類的食物？

**A:** 編輯 `scripts/convert-excel-to-json.js`，在轉換前加入篩選：

```javascript
const foods = [];

rawData.forEach((row, index) => {
  // 只轉換水果類和蔬菜類
  const category = row['食品分類'] || '';
  if (!category.includes('水果') && !category.includes('蔬菜')) {
    return; // 跳過
  }

  // ... 原本的轉換邏輯
});
```

### Q4: 檔案太大怎麼辦？

**A:** 2000+ 食物的 JSON 約 1-2 MB，對網頁來說可接受。

如果真的太大，可以：
1. 只轉換常見食物（前 500 項）
2. 移除不需要的欄位（如：脂肪、蛋白質等）

## 📦 更新到網站

轉換完成後，JSON 已自動儲存在 `public/nutrition-data.json`。

接下來：

1. **提交到 Git**
   ```bash
   git add public/nutrition-data.json
   git commit -m "更新完整營養資料庫（2100+ 食物）"
   git push
   ```

2. **部署到 Vercel**
   - Vercel 會自動部署
   - 或手動在 Vercel Dashboard 觸發部署

3. **測試功能**
   - 打開網站左側邊欄「🥗 營養查詢」
   - 輸入任何食物名稱測試

## 🎯 下一步

轉換完成後，你可以：

- ✅ 查詢 2100+ 種食物營養成分
- ✅ 自動顯示腎友警告
- ✅ 極速查詢（< 50ms）
- ✅ 100% 準確（直接查表）

如果需要進一步優化或客製化，請參考 `scripts/convert-excel-to-json.js` 原始碼！
