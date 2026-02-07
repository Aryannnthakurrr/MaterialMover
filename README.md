# MaterialMover

A construction materials marketplace with semantic search powered by AI.

## Architecture

- **Backend** (Node.js/Express) - REST API, authentication, MongoDB
- **Frontend** (HTML/CSS/JS) - Static files served by backend
- **Search** (Python/FastAPI) - Semantic search using sentence transformers

## Prerequisites

- **Node.js** v18+ ([download](https://nodejs.org/))
- **Python** 3.11+ ([download](https://python.org/))
- **MongoDB** connection string (Atlas or local)

## Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/your-username/MaterialMover.git
cd MaterialMover
```

Create `.env` in the root folder (copy from `.env.example`):
```env
MONGODB_URI=mongodb+srv://your-connection-string
MONGODB_DATABASE=product
MONGODB_COLLECTION=products
JWT_SECRET=your-secret-key
PORT=3000
FRIEND_API_URL=http://localhost:8000
friendServer_Url=http://localhost:8000
```

### 2. Install Dependencies

**Backend:**
```bash
cd services/backend
npm install
cd ../..
```

**Search (Python):**
```bash
cd services/search
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate

pip install -r requirements.txt
cd ../..
```

### 3. Run

**Windows:** `.\start-services.ps1`

**Linux/Mac:** `./start-services.sh`

### 4. Open

- **App:** http://localhost:3000
- **Search API:** http://localhost:8000/docs

> ⚠️ First startup takes ~60s for ML model download

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products/search` | POST | Search products |
| `/api/auth/login` | POST | Login |
| `/api/auth/signup` | POST | Register |
