# MaterialMover

A construction materials marketplace with AI-powered semantic search and conversational product advisor.

## Project Structure

```
MaterialMover/
├── .env                          # Environment configuration
├── package.json                  # Root dependencies
├── start-services.ps1            # Windows service launcher
├── start-services.sh             # Linux/Mac service launcher
│
└── services/
    ├── backend/                  # Node.js/Express API (Port 3000)
    │   ├── api/
    │   │   └── index.js          # Express server entry point
    │   ├── server/
    │   │   ├── db.js             # MongoDB connection
    │   │   ├── middleware/
    │   │   │   └── auth.js       # JWT auth + role-based access
    │   │   ├── models/
    │   │   │   ├── User.js       # User schema (email, password, role)
    │   │   │   └── Products.js   # Product schema with embeddings
    │   │   ├── routes/
    │   │   │   ├── auth.js       # /api/auth/* (login, signup, google)
    │   │   │   ├── products.js   # /api/products/* (CRUD, search)
    │   │   │   └── upload.js     # /api/upload (Cloudinary)
    │   │   └── services/
    │   │       └── mapboxService.js  # Geocoding integration
    │   └── scripts/
    │       └── geocode-existing-products.js
    │
    ├── frontend/                 # React/Vite SPA (Port 5173)
    │   ├── index.html
    │   ├── vite.config.js        # Proxy: /api→3000, /chat→8000
    │   └── src/
    │       ├── App.jsx           # Router configuration
    │       ├── main.jsx          # React entry point
    │       ├── components/
    │       │   ├── Chatbot.jsx   # AI advisor chatbot widget
    │       │   ├── Earth3D.jsx   # Three.js 3D Earth animation
    │       │   ├── Header.jsx    # Navigation bar
    │       │   ├── Footer.jsx    # Site footer
    │       │   ├── MapView.jsx   # Mapbox GL map component
    │       │   ├── ReactiveStars.jsx  # Star background animation
    │       │   ├── Toast.jsx     # Notification system
    │       │   └── WasteScene.jsx     # Floating materials animation
    │       ├── pages/
    │       │   ├── Home.jsx      # Landing page with search
    │       │   ├── Listings.jsx  # Product search results
    │       │   ├── Login.jsx     # Authentication
    │       │   ├── Signup.jsx    # Registration with role select
    │       │   ├── Seller.jsx    # Seller dashboard
    │       │   └── Admin.jsx     # Admin dashboard
    │       ├── styles/
    │       │   ├── style.css     # Main styles
    │       │   ├── chatbot.css   # Chatbot widget styles
    │       │   ├── earth-scroll.css  # Scroll animations
    │       │   ├── seller.css    # Seller dashboard
    │       │   ├── footer.css    # Footer styles
    │       │   └── toast.css     # Toast notifications
    │       └── utils/
    │           └── auth.js       # Token/role helpers
    │
    └── search/                   # Python/FastAPI (Port 8000)
        ├── requirements.txt
        └── app/
            ├── main.py           # FastAPI app with lifespan
            ├── core/
            │   ├── config.py     # Settings from .env
            │   └── database.py   # MongoDB async client
            ├── models/
            │   └── schemas.py    # Pydantic request/response models
            ├── routers/
            │   └── chat.py       # /chat/* endpoints
            └── services/
                ├── hybrid_search.py   # BM25 + Semantic search
                ├── gemini_chat.py     # Conversational AI advisor
                ├── search_engine.py   # Vector search operations
                ├── embedding_service.py  # Sentence Transformers
                ├── bm25_service.py    # Keyword ranking
                └── webhook_handler.py # Product index updates
```

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend API | Node.js 18+, Express 4.x | REST API, Auth, CRUD |
| Frontend | React 19, Vite 7.x, React Router 7 | Single Page Application |
| Search Service | Python 3.11+, FastAPI, Uvicorn | AI Search, Chatbot |
| Database | MongoDB Atlas | Document storage |
| Embeddings | Sentence Transformers (all-MiniLM-L6-v2) | 384-dim vectors |
| Keyword Search | BM25 (rank-bm25) | TF-IDF ranking |
| Chat AI | Google Gemini API | Conversational advisor |
| Maps | Mapbox GL JS | Location features |
| Images | Cloudinary | Upload/storage |
| Auth | JWT, Google OAuth | Authentication |

## API Reference

### Backend Endpoints (Port 3000)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/signup` | POST | - | Register user |
| `/api/auth/login` | POST | - | Login, returns JWT |
| `/api/auth/google` | POST | - | Google OAuth |
| `/api/products` | GET | - | List all products |
| `/api/products/search` | POST | - | Search products |
| `/api/products` | POST | Seller/Admin | Create product |
| `/api/products/my` | GET | Seller/Admin | Get own products |
| `/api/products/:id` | PUT | Seller/Admin | Update product |
| `/api/products/:id` | DELETE | Seller/Admin | Delete product |
| `/api/upload` | POST | Seller/Admin | Upload image |

### Search Service Endpoints (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/health` | GET | Health check with stats |
| `/search` | GET/POST | Hybrid semantic + BM25 search |
| `/recommend` | GET | Top 10 product IDs for query |
| `/rebuild-cache` | POST | Rebuild search indices |
| `/chat/start` | POST | Start chat session |
| `/chat/message` | POST | Send message to advisor |
| `/chat/history/{id}` | GET | Get conversation history |
| `/chat/{id}` | DELETE | Delete chat session |
| `/webhook/product-added` | POST | Index new product |
| `/webhook/product-updated` | POST | Update product index |

## Environment Variables

```env
# MongoDB
MONGODB_URI=mongodb+srv://...
MONGODB_DATABASE=product
MONGODB_COLLECTION=products

# Auth
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Server
PORT=3000

# Search Service Integration
SEARCH_WEBHOOK_URL=http://localhost:8000
FRIEND_API_URL=http://localhost:8000
friendServer_Url=http://localhost:8000

# AI
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-3-flash-preview

# Maps
MAPBOX_ACCESS_TOKEN=your-mapbox-token

# Images
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## Installation

```bash
# Clone
git clone https://github.com/Aryannnthakurrr/MaterialMover.git
cd MaterialMover

# Backend dependencies
npm install

# Frontend dependencies
cd services/frontend && npm install && cd ../..

# Python environment
cd services/search
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cd ../..

# Configure .env (copy from .env.example)
```

## Running

**Terminal 1 - Backend:**
```bash
node services/backend/api/index.js
```

**Terminal 2 - Frontend:**
```bash
cd services/frontend && npm run dev
```

**Terminal 3 - Search:**
```bash
cd services/search
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

## Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| Search API Docs | http://localhost:8000/docs |

## Search Architecture

Hybrid search combining semantic understanding with keyword precision:

- **Semantic (70%)**: Sentence Transformers → 384-dim embeddings → cosine similarity
- **BM25 (30%)**: Tokenization → TF-IDF → BM25 ranking
- **Fusion**: Weighted score combination, re-ranked results

## Auth Flow

1. User registers/logs in via `/api/auth/*`
2. Server returns JWT with `{userId, email, role}`
3. Frontend stores in localStorage
4. Requests include `Authorization: Bearer <token>`
5. Middleware validates and attaches `req.user`

**Roles:** `buyer`, `seller`, `admin`

## Database Models

**User**
```javascript
{ email, password (bcrypt), role }
```

**Product**
```javascript
{ title, description, price, quantity, category,
  image, address, phone_no, seller (ref), embedding[] }
```

## Webhooks

Backend notifies search service on product changes:
- `POST /webhook/product-added` - New product indexed
- `POST /webhook/product-updated` - Product re-indexed

## Documentation

See [DOCUMENTATION.md](./DOCUMENTATION.md) for:
- Business model and revenue streams
- Sustainability impact (SDG 12)
- Technical deep-dive on hybrid search
- AI chatbot architecture
- Future roadmap
