# JanSuno — AI Public Grievance Assistant

A responsive public-grievance portal prototype built with **HTML, CSS, JavaScript, Node.js, Express and MongoDB**. It gives citizens a straightforward way to submit a civic issue, receive a reference number, and check status updates.

> **Project note:** This is an academic prototype, not an official government service. The department suggestion is a transparent category-to-department rule, not a trained AI model. The UI's illustrative hero complaint is a design mock-up; dashboard figures and recent submissions come from the database.

## Features
- Citizen-side slide-out sidebar with separate pages for Home, Submit Complaint, Track Complaint, Recent Activity, How It Works, Help & Support, and an Admin Workspace link.
- Dedicated admin workspace at `http://localhost:3000/admin` with sidebar pages: Dashboard, Complaint register, Departments, and Reports & insights.
- Admin key prompt; complaint register supports search/filter and status updates with a timeline note.
- CSV export for complaint records and category/status breakdowns.

- Responsive, professional citizen-facing interface.
- Complaint form with required-field checks and email validation.
- Category-based department suggestion.
- Unique complaint reference IDs.
- MongoDB persistence through Mongoose.
- Status lookup with an update timeline.
- Recent-submission table that avoids displaying personal details.
- Dashboard counters from the database.
- Admin-only status update API protected by a server-side key.
- Escaped dynamic text rendering to reduce cross-site scripting risk.

## Requirements

- Node.js 18 or newer
- MongoDB Community Server running locally **or** a MongoDB Atlas connection string
- npm

## Run locally (Windows PowerShell)

1. Extract the ZIP and open the project folder in VS Code.
2. Install dependencies:

   ```powershell
   npm install
   ```

3. Create your environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Open `.env` and set `MONGODB_URI`. For a local MongoDB installation, the default is:

   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/public_grievance_assistant
   PORT=3000
   ADMIN_KEY=replace-with-a-long-private-random-string
   ```

   If using MongoDB Atlas, paste your Atlas connection string into `MONGODB_URI`, URL-encode any special characters in the database password, and make sure your IP/network access and database user are configured.

5. Start the server:

   ```powershell
   npm start
   ```

6. Open **http://localhost:3000** in your browser.

The database is created automatically by MongoDB when the first complaint is saved. Make sure the MongoDB service is running before starting the app.

## Citizen pages

The citizen portal is split into separate pages, all connected through the slide-out sidebar:

- `/` — Home
- `/submit` — Submit a complaint
- `/track` — Track a complaint
- `/activity` — Recent activity
- `/how-it-works` — How it works
- `/help` — Help & support
- `/admin` — Admin workspace

## Admin workspace

1. Start the server and open `http://localhost:3000/admin`.
2. Enter the exact `ADMIN_KEY` from your server-side `.env` file.
3. Use the sidebar to switch between Dashboard, Complaint register, Departments, and Reports & insights.
4. In Complaint register, choose **Update** to change a complaint status and record a note. The update is saved to MongoDB and appears in the citizen tracking timeline.
5. Reports & insights can export the currently loaded complaint list to CSV.

The admin key is sent to the backend in a request header; it is not stored in browser local storage. This is a learning/demo access gate, not a replacement for production authentication. Do not deploy publicly without real user accounts, rate limiting, HTTPS, audit logs, and role-based access controls.

## How MongoDB is used

- `server.js` connects to MongoDB using the `MONGODB_URI` environment variable and Mongoose.
- A `Complaint` schema defines the fields saved for each report: reference, citizen contact, category, suggested department, location, description, priority, current status, timestamps and update history.
- Submitting the citizen form calls `POST /api/complaints`, which validates the input and inserts a document into the `complaints` collection.
- The public dashboard reads aggregate counts from `GET /api/stats`; the recent list reads safe summary fields from `GET /api/complaints/recent`.
- Tracking calls `GET /api/complaints/:reference` to retrieve the status timeline for a single reference.
- The admin workspace calls protected `GET /api/admin/complaints` to list/search records and `PATCH /api/admin/complaints/:reference` to change status and append a timeline update.

MongoDB stores the data permanently across server restarts. The database and collection are created automatically when the first complaint is inserted.

## Admin status updates

The admin endpoint is protected by the `ADMIN_KEY` environment variable. Do not put this key in `public/app.js` or any browser code. For a quick test from PowerShell, replace the example reference and key with your own values:

```powershell
$body = @{ status = "In Progress"; note = "The issue has been assigned to the field team." } | ConvertTo-Json
Invoke-RestMethod -Method Patch `
  -Uri "http://localhost:3000/api/admin/complaints/PG-REPLACE-REFERENCE" `
  -Headers @{ "x-admin-key" = "YOUR_PRIVATE_ADMIN_KEY" } `
  -ContentType "application/json" `
  -Body $body
```

Supported statuses: `Submitted`, `Under Review`, `In Progress`, `Resolved`, `Closed`.

This prototype exposes an admin API but does not include a complete admin login/dashboard. For deployment, add authenticated admin accounts, role-based access, rate limiting, CSRF protections where applicable, audit logs, validation, backups, and a privacy policy.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check server/database status |
| GET | `/api/stats` | Dashboard totals |
| GET | `/api/complaints/recent` | Latest public-safe complaint summaries |
| POST | `/api/complaints` | Create a complaint |
| GET | `/api/complaints/:reference` | Look up a complaint |
| PATCH | `/api/admin/complaints/:reference` | Change status (admin key required) |

## Project structure

```text
AI_Public_Grievance_Assistant/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## How it works

1. The browser submits the form to Express using `fetch()`.
2. Express validates the data and selects the suggested department based on the chosen category.
3. Mongoose saves the complaint in MongoDB with a unique reference and initial timeline entry.
4. The browser displays the reference ID and refreshes the dashboard/recent list.
5. The tracking form requests the complaint by reference and renders its status history.
6. An authorized admin can change a complaint's status through the protected API; each change is added to the timeline.

## Good next steps

- Add secure admin login and a dedicated case-management screen.
- Add file/image uploads with file-type/size checks and secure storage.
- Add email/SMS notifications with consent.
- Add district/ward directories and configurable department rules.
- Add an actual NLP model for category suggestion only after collecting an appropriate, consented and representative dataset.
- Add tests, rate limits, audit logs and deployment configuration.

## Troubleshooting

- **`Could not open requirements.txt`**: This is a Node.js project; it uses `package.json`, not `requirements.txt`.
- **MongoDB connection error**: Confirm MongoDB is running, `MONGODB_URI` is correct, and the Atlas IP allowlist/user is configured.
- **`npm` not recognized**: Install Node.js LTS, then reopen the terminal.
- **Port already in use**: Change `PORT` in `.env` (for example, `PORT=3001`) and restart.

## Citizen navigation layout

The top navigation no longer shows How it works, Recent activity, or Help & support. Those pages remain accessible from the citizen sidebar. The homepage keeps its hero and the How it works section only; complaint submission, tracking, recent activity, and help are separate pages.

## Homepage navigation fix

The homepage now shows the hero followed by the How It Works section only. The top header omits How it works, Recent activity, and Help & support on all citizen pages. Homepage Submit and Track calls-to-action navigate to `/submit` and `/track` respectively.
