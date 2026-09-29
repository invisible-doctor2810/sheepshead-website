npm install && npm run dev
Edit content in src/data/*. 3D: src/scenes/World.tsx. Theme: src/styles/theme.css + SUITS colors in src/data/club.ts.

## Score ledger and Google Sheets

The ledger appends submissions to the spreadsheet linked for the club. The sheet owner must deploy the receiver:

1. Open the target spreadsheet and choose **Extensions > Apps Script**.
2. Replace the starter script with the complete current contents of `apps-script/Code.gs` and save. If a web app deployment already exists, choose **Deploy > Manage deployments > Edit**, select **New version**, and deploy the update. The latest script includes a JSONP status endpoint; the site waits for this confirmation after a write.
3. For a new deployment, choose **Deploy > New deployment > Web app**. Set **Execute as** to your account and **Who has access** to **Anyone**, then deploy and approve Google's authorization prompt.
4. Copy the deployed Web app URL ending in `/exec`. In the project root, copy `.env.example` to `.env.local` and set `VITE_SCORE_SHEETS_ENDPOINT` to that URL.
5. Restart Vite or rebuild/redeploy the website so the endpoint is included in the client bundle.

The script locates the sheet tab by its exact header row, generates the timestamp, validates values, and migrates the existing submission log into a daily matrix on the first write. The matrix uses one row per name (case-insensitive matching) and one column per day; a repeat submission for the same name/day replaces that score, while different names remain separate rows. All daily score columns are formatted as numeric cells. The web app endpoint is publicly callable so visitors can submit; keep validation in `apps-script/Code.gs` and redeploy after changing it. Do not put Google account credentials or API keys in the client app.
