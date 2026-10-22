# 地球電台 Earth Radio

可旋轉、縮放的互動地球，整合網路電台、飛機、貨船、當地時間與天氣、地震與熱帶氣旋、動態風場、公開攝影機及新聞直播。

## 啟動

1. 安裝 Node.js 22 或更新版本。
2. Windows 使用者可雙擊「啟動地球電台.cmd」，並保持命令視窗開啟。
3. 瀏覽 http://127.0.0.1:4186 。

也可在專案目錄執行 `node server.cjs`。專案已包含貨船服務的套件整合檔，直接啟動不需要安裝 node_modules。若所在目錄有中文或 OneDrive 路徑而無法啟動，請使用 Windows 啟動器。

## API 設定

貨船需要 AISStream API 金鑰；附近攝影機需要 Windy Webcams API 金鑰。啟動後可透過網頁設定，服務會儲存在後端執行目錄的 ais-config.json 與 windy-config.json。這些檔案已列入 .gitignore，請勿加入 Git 或公開分享。

Windows 啟動器將後端程式複製到使用者 Documents 下的本機執行目錄，設定檔保留在該處。網站只供本機使用，後端監聽 127.0.0.1。

## 資料與限制

資料來源包括 Radio Browser、Open-Meteo、Photon、adsb.fi、AISStream、Windy、USGS、NASA EONET 與 JTWC；第三方服務可能延遲、限流或停止提供資料。飛機動畫含位置推估，攝影機可能只提供縮時影像。颱風暴風範圍依可取得的官方風圈資料呈現，缺少資料時不自行虛構。地震、颱風與天氣畫面不作為即時警報或安全決策依據。

## 程式結構

- index.html、style.css、app.js：地球與介面
- flights.js：飛機圖層
- server.cjs：本機 HTTP 服務
- vessels.cjs、vessels-bundled.cjs：貨船服務原始碼與整合檔
- webcams.cjs：公開攝影機服務
- storm-radii.cjs：颱風風圈資料

修改前端後重新整理頁面；修改後端後重新啟動。ws 套件使用 MIT 授權，整合檔內保留其授權資訊。尚未為本專案另行指定開源授權。
