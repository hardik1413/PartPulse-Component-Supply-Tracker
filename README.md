# PartPulse — AI Component Supply Tracker

An MVP web application for robotics teams, electronics students, and hardware engineers to search electronic components across supplier websites, compare prices and stock availability in real time, and track supply changes over time.

Built with real TinyFish Search & Fetch API integration, deterministic MPN matching, price comparability analysis, automated shortage alerts, and SQLite historical snapshots.

---

## Architecture & Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React icons, Recharts
- **Backend**: Node.js 20+, Express, TypeScript, Zod validation, native `fetch`
- **Database**: SQLite with Prisma ORM (automatic schema sync and relations)
- **API Integration**: TinyFish Search (`api.search.tinyfish.ai`), TinyFish Fetch (`api.fetch.tinyfish.ai`), TinyFish Agent fallback
- **Testing**: Vitest (31 comprehensive unit and integration tests)

---

## Prerequisites

- **Node.js**: `v20.0.0` or higher (`v20.18.0` LTS recommended)
- **npm**: `v10.0.0` or higher
- **TinyFish API Key**: Obtain a free API key from [https://agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys)

---

## Getting Started

### 1. Configure Backend Environment

Copy `.env.example` in `server/` to `server/.env`:

```bash
cd server
cp .env.example .env
```

Open `server/.env` and paste your TinyFish API key:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL="file:./dev.db"

# Enter your actual TinyFish API key from https://agent.tinyfish.ai/api-keys
TINYFISH_API_KEY="your_tinyfish_api_key_here"

TINYFISH_SEARCH_ENDPOINT="https://api.search.tinyfish.ai"
TINYFISH_FETCH_ENDPOINT="https://api.fetch.tinyfish.ai"
TINYFISH_AGENT_ENDPOINT="https://agent.tinyfish.ai/v1/automation/run"
TINYFISH_TIMEOUT_MS=45000
```

### 2. Install Dependencies & Initialize Database

From the project root:

```bash
# Install backend dependencies
cd server
npm install

# Initialize SQLite database and generate Prisma Client
npx prisma db push

# Install frontend dependencies
cd ../client
npm install
```

### 3. Run the Application

In two terminal windows (or tabs):

**Terminal 1 — Backend API Server (Port 3001):**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend UI (Port 5173):**
```bash
cd client
npm run dev
```

Open your browser at:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## Main Features & Pages

### 1. Engineering Dashboard
- Live metrics pulled directly from SQLite: total tracked components, supplier listings found, price changes recorded, and active shortage alerts.
- Quick watchlist table with lowest price, active stock status, and manual refresh button.
- Real-time supply alerts feed with badges for price spikes and stock depletions.
- Helpful empty states when starting from an empty database.

### 2. Component Search (`/search`)
- Search by MPN (e.g., `ESP32-WROOM-32D`, `BNO055`, `STM32F401RET6`, `LM2596S-5.0`, `DRV8825`).
- Optional manufacturer filter and technical requirement input.
- Real-time execution pipeline:
  1. Validates input schema via Zod.
  2. Constructs targeted queries to TinyFish Search API (`GET https://api.search.tinyfish.ai`).
  3. Selects relevant distributor product URLs.
  4. Fetches clean markdown content via TinyFish Fetch API (`POST https://api.fetch.tinyfish.ai`).
  5. Extracts price, currency, stock quantity, lead time, and technical specs.
  6. Categorizes listings into direct matches and "Potential Substitutes".
- "Save to Watchlist & Track" action persists component, distributor listings, and creates initial snapshots in SQLite.

### 3. Supplier Comparison Matrix (`/comparison`)
- Side-by-side comparison across all distributors for a component.
- Highlights lowest price with visual badge.
- Safely validates price comparability: warns users if currencies differ or packaging quantities are incompatible.
- Direct links to original supplier pages.

### 4. Tracked Watchlist (`/tracked`)
- Displays all components saved in SQLite.
- Run fresh checks manually (`Refresh Now`) to query TinyFish and record new snapshots.
- Remove components from watchlist with automatic cascade.

### 5. Price & Stock History (`/history`)
- Interactive Recharts trajectory curve showing unit price changes over time.
- Current lowest price vs. previous lowest price with exact percentage change (+12% increase, -5% decrease).
- Flags stock transitions: `IN_STOCK` ↔ `OUT_OF_STOCK` and `LIMITED_STOCK`.
- Full chronological log of all historical snapshots captured.

### 6. Bill of Materials (`/bom`)
- Create project assemblies (e.g. "Robotics Mainboard v1").
- Add tracked components with required quantities.
- Automatically selects the best in-stock listing per item and calculates estimated total build cost.
- Flags unpriced or unavailable parts needing engineering attention.

### 7. Shortage & Price Alerts (`/alerts`)
- Automated detection when:
  - Tracked component goes out of stock at any distributor (`OUT_OF_STOCK`).
  - Known price increases by +10% or more (`PRICE_INCREASE`).
  - Stock recovers (`IN_STOCK`).
- Mark as read / Mark all as read with unread badge counter in sidebar and navigation header.

---

## Running the Automated Test Suite

PartPulse includes 31 unit and integration tests covering:
- MPN normalization (uppercase, stripping delimiters, reel/packaging suffix handling)
- Price comparison and currency compatibility validation
- Percentage price change calculation safety (currency change guards)
- Stock transition detection (shortages, recoveries, spikes)
- TinyFish content parser, missing field representation (`null` instead of invented data)
- TinyFish error code mapping (400, 401, 402, 429, 504)
- API route input validation schemas (Zod)

To run the test suite:

```bash
cd server
npm test
```

Expected result:
```
✓ ../tests/priceComparison.test.ts (7 tests)
✓ ../tests/alertDetector.test.ts (5 tests)
✓ ../tests/apiValidation.test.ts (4 tests)
✓ ../tests/mpnNormalizer.test.ts (7 tests)
✓ ../tests/tinyfishParserAndErrors.test.ts (8 tests)

Test Files  5 passed (5)
     Tests  31 passed (31)
```

---

## Production Build

To test production compilation for both backend and frontend:

```bash
# Build backend to dist/
cd server
npm run build

# Build frontend to dist/
cd ../client
npm run build
```

---

## Troubleshooting & FAQ

### `401 Unauthorized: API_KEY_MISSING`
- Cause: The backend `.env` file does not have `TINYFISH_API_KEY` set.
- Fix: Add your valid API key in `server/.env`:
  `TINYFISH_API_KEY="your_api_key_here"` and restart `npm run dev`.

### `402 Payment Required: INSUFFICIENT_CREDITS`
- Cause: TinyFish daily free allowance has been reached for the day.
- Fix: Wait for the daily allowance reset at midnight UTC or top up wallet balance at [https://agent.tinyfish.ai/wallet](https://agent.tinyfish.ai/wallet).

### Database not found or Prisma error
- Fix: Run `npx prisma db push` inside the `server/` directory to re-sync SQLite `dev.db`.
