# MaterialMover

**Bridging Construction Surplus to Deficit — Reducing Waste Through Intelligent Matching**

---

## The Problem: Construction Waste Crisis

The construction industry generates over 600 million tonnes of waste globally each year. Unlike household recyclables, construction materials face unique barriers to reuse:

- **Fragmented markets** — Surplus materials from one site have no easy way to reach sites with shortages
- **Information asymmetry** — Buyers don't know what's available; sellers don't know who needs it
- **Terminology chaos** — The same material has dozens of names across regions and trades
- **Time pressure** — Materials deteriorate or get dumped because finding buyers is too slow

The result: perfectly usable materials end up in landfills while new resources are extracted to meet demand elsewhere.

---

## Our Solution: Smart Material Matching

MaterialMover creates a circular economy for construction materials by intelligently connecting parties with excess inventory to those with material deficits.

```
┌─────────────────┐                    ┌─────────────────┐
│   SELLERS       │    AI-POWERED      │   BUYERS        │
│  (Surplus)      │◄──────────────────►│  (Deficit)      │
│                 │     MATCHING       │                 │
│ • Demolition    │                    │ • New builds    │
│ • Overruns      │                    │ • Renovations   │
│ • Factory waste │                    │ • DIY projects  │
└─────────────────┘                    └─────────────────┘
```

### Impact on Responsible Consumption & Production (SDG 12)

| Metric | Impact |
|--------|--------|
| Waste Diverted | Materials matched to new projects instead of landfills |
| Resources Saved | Reduced extraction of virgin raw materials |
| Carbon Reduction | Lower emissions from manufacturing new materials |
| Cost Savings | 30-70% savings for buyers compared to new materials |
| Revenue Recovery | Sellers monetize materials that would otherwise incur disposal costs |

---

## Technical Challenge: The Language of Construction

Construction materials present a linguistic challenge that defeats traditional search systems:

| Identical Products | How Users Actually Search |
|--------------------|---------------------------|
| Portland cement, OPC, Grey cement, 53-grade, Ordinary Portland cement | "cement", "grey powder", "binding material" |
| TMT bars, Reinforcement steel, Rebar, Sariya | "iron rods", "building bars", "steel for RCC" |
| AAC blocks, Aerated concrete, Siporex, Foam blocks | "lightweight blocks", "white bricks" |

Traditional keyword-based search fails in this domain:
- Query: "lightweight wall material" returns nothing because no product contains that exact phrase
- Query: "cheap tiles for bathroom" returns nothing due to keyword mismatch

### Our Solution: Hybrid Semantic + BM25 Search

We combine two complementary search technologies to overcome these limitations:

```
                         User Query
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
   ┌─────────────────┐                   ┌─────────────────┐
   │ SEMANTIC SEARCH │                   │ BM25 KEYWORD    │
   │                 │                   │ SEARCH          │
   │ Neural embeddings                   │ Term frequency  │
   │ (all-MiniLM-L6-v2)                  │ inverse document│
   │ 384-dimensional                     │ frequency       │
   │ vectors                             │ ranking         │
   └────────┬────────┘                   └────────┬────────┘
            │                                     │
            └──────────────┬──────────────────────┘
                           ▼
                 ┌───────────────────┐
                 │  WEIGHTED FUSION  │
                 │  70% semantic     │
                 │  30% BM25         │
                 └─────────┬─────────┘
                           ▼
                    Ranked Results
```

**Semantic Search Component:**
Uses Sentence Transformers to convert text into 384-dimensional vector representations. This enables the system to understand that "roofing for shed" is semantically similar to "corrugated metal sheets" even though they share no common keywords.

**BM25 Keyword Component:**
Provides precision matching for technical specifications. When a user searches for "TMT bars 12mm", the system prioritizes exact terminology matches, preventing semantic drift.

**Why Hybrid Architecture:**

| Search Scenario | Semantic Only | BM25 Only | Hybrid Approach |
|-----------------|---------------|-----------|-----------------|
| "wall material that's light" | Finds AAC, foam blocks | No results | Optimal coverage |
| "OPC 53 grade cement" | May over-generalize | Exact match | Precise results |
| "something like glass but cheaper" | Finds polycarbonate | No results | Best interpretation |

---

## AI-Powered Material Advisor

A core limitation of search interfaces is that users must articulate their needs in searchable terms. For construction materials, many buyers—particularly homeowners and hobbyists—know their problem but not the technical product name.

### Context-Building Conversation Flow

The chatbot engages users in dialogue to understand their requirements before executing a search:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONVERSATION FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User: "I need something for my terrace that won't heat up"    │
│                          │                                      │
│                          ▼                                      │
│  Bot: "Are you looking for flooring tiles, roofing, or a       │
│        shade/covering? Also, what's your approximate budget?"  │
│                          │                                      │
│                          ▼                                      │
│  User: "Flooring, around 50 per sq ft"                         │
│                          │                                      │
│                          ▼                                      │
│  Bot: [Synthesizes context into optimized query]               │
│       Generated query: "heat-resistant terrace flooring"       │
│                          │                                      │
│                          ▼                                      │
│  Bot: "Based on your requirements, here are matching options:" │
│       ┌─────────────────────────────────────────────────┐       │
│       │  Kota Stone Tiles - Rs 45/sqft                 │       │
│       │  White Ceramic Anti-Skid Tiles - Rs 52/sqft    │       │
│       │  Terracotta Clay Tiles - Rs 38/sqft            │       │
│       └─────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Comparison: Direct Search vs Chatbot-Assisted

| Direct Search | Context-Building Chatbot |
|---------------|--------------------------|
| User must know technical terminology | User describes the problem in natural language |
| Single query with uncertain results | Multi-turn dialogue refines understanding |
| No consideration of constraints | Incorporates budget, location, specifications |
| Generic ranked list | Curated recommendations based on full context |

**Technical Implementation:**
- Conversational model: Google Gemini API
- Session state management for multi-turn context retention
- Intent extraction to identify material type, budget, and specifications
- Query synthesis from accumulated context
- Direct integration with marketplace inventory

---

## Business Model

### Core Philosophy: No Paywalling

The fundamental objective of MaterialMover is waste reduction. Restricting access to material listings through paywalls would directly contradict this mission by creating barriers to the very matches we aim to facilitate.

**Therefore, the platform operates on a principle of open access:**
- All material listings are freely visible to all users
- Search functionality (including semantic and AI-powered search) is available without payment
- Seller contact information is accessible to registered users
- No artificial limits on browsing, saving, or comparing materials

Any interested party—whether an individual homeowner, a contractor, a researcher, or a policy analyst—can access the complete inventory of available materials. This transparency maximizes the probability of successful matches and accelerates the circular flow of construction materials.

### Revenue Model

Revenue generation is structured around two complementary streams that do not restrict core platform access: **Convenience** and **Visibility**.

---

### Revenue Stream 1: Convenience (Transaction Commission)

Not every user has the time, transportation, or logistical bandwidth to coordinate material pickup themselves. For these users, MaterialMover offers an integrated ordering and delivery service.

**How it works:**

```
┌──────────────────────────────────────────────────────────────────┐
│                    CONVENIENCE FLOW                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User finds material → "I want this delivered to my site"       │
│                            │                                     │
│                            ▼                                     │
│  Platform coordinates:                                           │
│  • Seller confirmation                                           │
│  • Logistics partner assignment                                  │
│  • Pickup scheduling                                             │
│  • Delivery to buyer's location                                  │
│                            │                                     │
│                            ▼                                     │
│  Material arrives at doorstep                                    │
│                            │                                     │
│                            ▼                                     │
│  Commission charged on transaction value                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Primary target: Individual Users**

Individual users—homeowners renovating a bathroom, hobbyists building a garden shed, small-scale renovators—typically lack:
- Vehicles suitable for material transport
- Time to coordinate pickup schedules
- Familiarity with logistical considerations (weight, fragility, loading)

For these users, the convenience of doorstep delivery justifies a commission. They are willing to pay for the simplification of the transaction because their bandwidth for self-coordination is limited.

**Secondary target: Contractors under Time Pressure**

While contractors generally have their own logistics capabilities, urgent project timelines occasionally create scenarios where coordinating pickup is not feasible. In these edge cases, even enterprise users may opt for the convenience service to meet deadlines.

However, this is the exception rather than the rule. Contractors with established supply chains and transport infrastructure will typically handle logistics independently.

**Commission Structure:**
- Percentage-based commission on material value
- Separate logistics fee passed through from delivery partner
- Premium for expedited/same-day delivery options

---

### Revenue Stream 2: Visibility (Enterprise Plans)

While all listings are visible, not all listings receive equal attention. Search results, category pages, and recommendations present materials in ranked order. For sellers with large inventories or recurring sales needs, ranking position directly impacts transaction volume.

**The value proposition is straightforward:** Sellers pay for enhanced visibility, not for access.

This model mirrors established classifieds platforms (such as OLX, Craigslist, and similar marketplaces) where listing is free but prominence is monetized.

**Visibility Products:**

| Product | Description | Target User |
|---------|-------------|-------------|
| Featured Listings | Priority placement in search results and category pages | Active sellers, resellers |
| Spotlight Ads | Homepage and high-traffic section placement | Large inventory holders |
| Category Sponsorship | Top position within specific material categories | Specialized dealers |
| Bump/Refresh | Re-surface older listings to appear as recent | Occasional sellers moving slow inventory |

**Enterprise Plans (Subscription-Based):**

For contractors, demolition companies, manufacturing units, and material resellers with consistent listing volume, individual visibility purchases become impractical. Enterprise plans bundle visibility features into monthly or annual subscriptions.

| Plan | Target Segment | Features |
|------|----------------|----------|
| **Professional** | Small contractors, active resellers | Bulk listing upload, 5 featured listings/month, analytics dashboard, priority support |
| **Business** | Mid-size contractors, demolition firms | Unlimited featured listings, category sponsorship slots, API access for inventory sync, dedicated account manager |
| **Enterprise** | Large contractors, manufacturers, scrap dealers | White-label options, custom integrations, volume-based pricing, SLA guarantees |

**Why Enterprises Pay for Visibility:**

Contractors and large resellers face a different problem than individual users. They have:
- Large volumes of materials to move quickly (project timelines, storage costs)
- Recurring inventory turnover (demolition debris, manufacturing excess)
- Competition from other sellers listing similar materials

For these users, visibility is a business expense that directly correlates with revenue. A demolition company with 500 tonnes of salvaged brick competes against dozens of similar listings. Featured placement converts browsing buyers into actual transactions.

---

### Revenue Model Summary

```
┌────────────────────────────────────────────────────────────────────┐
│                       REVENUE STRUCTURE                            │
├──────────────────────────────────────────────────────────────────-─┤
│                                                                    │
│   ┌─────────────────────┐       ┌─────────────────────────────┐   │
│   │    CONVENIENCE      │       │        VISIBILITY           │   │
│   │  (Transaction Fee)  │       │   (Subscription/Ad Fee)     │   │
│   └──────────┬──────────┘       └──────────────┬──────────────┘   │
│              │                                  │                  │
│              ▼                                  ▼                  │
│   ┌─────────────────────┐       ┌─────────────────────────────┐   │
│   │ Individual Users    │       │ Enterprise Users            │   │
│   │ • Homeowners        │       │ • Contractors               │   │
│   │ • Renovators        │       │ • Demolition companies      │   │
│   │ • Hobbyists         │       │ • Resellers                 │   │
│   │ • Time-poor buyers  │       │ • Manufacturers             │   │
│   └─────────────────────┘       └─────────────────────────────┘   │
│                                                                    │
│   Pay for: Delivery to doorstep   Pay for: Search ranking boost   │
│   Value: Saves time & logistics   Value: Faster inventory turnover│
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Key Principle:** The platform never restricts information access. A user who is willing to coordinate their own logistics pays nothing. Revenue is extracted only when value is added—either through convenience services or through competitive visibility advantages.

---

## Future Scope

### Integrated Logistics via Shiprocket API

The convenience revenue stream currently operates through manual coordination with logistics partners. The roadmap includes full API integration with shipping aggregators such as Shiprocket, enabling:

**Planned Capabilities:**
- Real-time shipping rate calculation at checkout
- Automated pickup scheduling with sellers
- Live tracking for buyers
- Multiple courier options based on material weight, dimensions, and urgency
- Cash-on-delivery and prepaid options
- Returns handling for damaged/incorrect materials

**Current Limitation:**
Integration with Shiprocket and similar logistics APIs requires completion of business verification requirements, including GST registration, bank account verification, and volume commitments. These prerequisites are in process and will unlock the fully automated convenience layer.

**Impact on Revenue:**
Once integrated, the convenience stream becomes friction-free. Users can order and pay directly on the platform, with logistics handled end-to-end. This significantly increases conversion from browse to purchase, particularly for individual users who currently abandon transactions due to coordination overhead.

```
┌─────────────────────────────────────────────────────────────────┐
│                 FUTURE: INTEGRATED CHECKOUT                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User selects material                                          │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────┐                   │
│  │  Shiprocket API                         │                   │
│  │  • Calculate shipping rates             │                   │
│  │  • Show delivery estimates              │                   │
│  │  • Process payment                      │                   │
│  └─────────────────────────────────────────┘                   │
│         │                                                       │
│         ▼                                                       │
│  Automatic pickup scheduled with seller                         │
│         │                                                       │
│         ▼                                                       │
│  Buyer receives tracking link                                   │
│         │                                                       │
│         ▼                                                       │
│  Doorstep delivery + Platform earns commission                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Revenue Stream 3: Contractor Referrals

A significant portion of individual users searching for construction materials are undertaking projects that require professional execution. A homeowner buying tiles for a bathroom renovation often needs a contractor to install them. A buyer purchasing cement and aggregates may need a mason for foundation work.

**Opportunity:**
When individual users search for materials, the platform can surface relevant contractors who have subscribed to enterprise plans. This creates a lead generation channel for contractors and an additional revenue stream for the platform.

**How It Works:**

```
┌─────────────────────────────────────────────────────────────────┐
│              CONTRACTOR REFERRAL FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Individual user searches: "tiles for bathroom renovation"     │
│                          │                                      │
│                          ▼                                      │
│  Platform displays:                                             │
│  ┌─────────────────────────────────────────┐                   │
│  │  Material Results                       │                   │
│  │  • Ceramic tiles - Rs 45/sqft          │                   │
│  │  • Vitrified tiles - Rs 65/sqft        │                   │
│  └─────────────────────────────────────────┘                   │
│                          +                                      │
│  ┌─────────────────────────────────────────┐                   │
│  │  "Need help with installation?"         │                   │
│  │                                          │                   │
│  │  Available contractors in your area:    │                   │
│  │  • ABC Interiors (4.8 rating)           │                   │
│  │  • XYZ Construction (4.5 rating)        │                   │
│  │  [Request Quote]                         │                   │
│  └─────────────────────────────────────────┘                   │
│                          │                                      │
│                          ▼                                      │
│  User requests quote → Lead sent to contractor                 │
│                          │                                      │
│                          ▼                                      │
│  Platform earns referral fee per qualified lead                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Revenue Model:**
- Contractors on enterprise plans receive priority placement in referral sections
- Per-lead fees for qualified referrals (user contact shared with contractor)
- Higher-tier plans include more lead allocations
- Performance-based pricing: contractors pay more for leads that convert

**Value for All Parties:**

| Stakeholder | Benefit |
|-------------|---------|
| Individual Buyer | Finds vetted contractors alongside materials, simplifying project execution |
| Enterprise Contractor | Receives qualified leads from users actively purchasing materials |
| Platform | Additional revenue stream from lead generation fees |

This creates a natural synergy: contractors who sell materials on the platform gain visibility for their contracting services, and individual buyers get end-to-end project support rather than just material sourcing.

---

## System Architecture

### Design Decisions

The architecture separates concerns across three specialized services, each optimized for its specific function.

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND                               │
│                     React + Vite (Port 5173)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Home    │ │ Listings │ │  Seller  │ │  Admin   │           │
│  │  Page    │ │   Page   │ │Dashboard │ │Dashboard │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       │            │            │            │                  │
│  ┌────▼────────────▼────────────▼────────────▼────┐            │
│  │              Vite Development Proxy             │            │
│  │         /api → :3000  |  /chat → :8000          │            │
│  └────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   NODE.JS API    │  │  FASTAPI SEARCH  │  │  MONGODB ATLAS   │
│  Express Server  │  │  Python Service  │  │                  │
│   (Port 3000)    │  │   (Port 8000)    │  │  Products        │
│                  │  │                  │  │  Users           │
│  Authentication  │  │  Hybrid Search   │  │  Embeddings      │
│  Product CRUD    │  │  BM25 Indexing   │  │                  │
│  Image Uploads   │  │  Vector Search   │  │                  │
│  Session Mgmt    │  │  Gemini Chat     │  │                  │
└────────┬─────────┘  └────────┬─────────┘  └──────────────────┘
         │                     │                     
         │                     │                     
         ▼                     ▼                     
┌────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                 │
│  Cloudinary (Images) | Mapbox (Maps) | Gemini AI  │
└────────────────────────────────────────────────────┘
```

### Node.js/Express Backend (Port 3000)

**Rationale:** Node.js provides a robust ecosystem for REST API development with excellent MongoDB integration through Mongoose. Express middleware architecture enables clean separation of authentication, validation, and business logic.

**Responsibilities:**
- User authentication via JWT and Google OAuth
- Product CRUD operations with role-based access control
- Image upload handling via Cloudinary integration
- Session and token management

### FastAPI Search Service (Port 8000)

**Rationale:** Python's machine learning ecosystem (sentence-transformers, numpy) makes it the optimal choice for embedding generation and vector operations. FastAPI provides high performance (comparable to Node.js) with automatic OpenAPI documentation.

**Responsibilities:**
- Embedding generation using Sentence Transformers
- BM25 index maintenance for keyword search
- Hybrid search with configurable semantic/keyword weighting
- Gemini-powered conversational chatbot
- Webhook endpoints for real-time index updates

**Separation Justification:**
Keeping ML-intensive operations in a separate Python service allows:
- Independent scaling of search infrastructure
- Deployment on GPU-optimized instances if needed
- Isolation of memory-intensive embedding models
- API documentation via built-in OpenAPI/Swagger

### Mapbox Integration for Location-Based Features

**Rationale:** Construction materials have high transportation costs relative to value. Location proximity is often the deciding factor in purchase decisions.

**Capabilities:**
- Interactive map visualization of available materials
- Radius-based filtering (e.g., "within 10km")
- Route optimization for pickup planning
- Seller location verification

**Implementation:**
- Mapbox GL JS for frontend map rendering
- Geocoding API for address-to-coordinate conversion
- Mapbox Static Images for listing thumbnails

---

## Environmental Impact

Every successful match on the platform represents:

- **Waste Diversion:** One material diverted from landfill to productive reuse
- **Resource Conservation:** Virgin materials that need not be extracted
- **Emissions Reduction:** Manufacturing and processing emissions avoided
- **Transport Optimization:** Local matches reduce long-distance material shipping

The platform's goal is to establish a construction ecosystem where surplus materials systematically find their way to projects with corresponding deficits, closing the loop on construction waste.

---

## Getting Started

### Prerequisites
- Node.js v18 or higher
- Python 3.11 or higher
- MongoDB Atlas account
- Gemini API key (for chatbot functionality)
- Mapbox access token (for map features)

### Installation

```bash
# Clone repository
git clone https://github.com/Aryannnthakurrr/MaterialMover.git
cd MaterialMover

# Install backend dependencies
npm install

# Install frontend dependencies
cd services/frontend && npm install && cd ../..

# Setup Python environment
cd services/search
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
cd ../..

# Configure environment variables (copy .env.example to .env)
```

### Running the Application

**Terminal 1 - Backend API:**
```bash
node services/backend/api/index.js
```

**Terminal 2 - Frontend:**
```bash
cd services/frontend && npm run dev
```

**Terminal 3 - Search Service:**
```bash
cd services/search
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

### Access Points

| Service | URL |
|---------|-----|
| Application | http://localhost:5173 |
| Search API Documentation | http://localhost:8000/docs |
| Backend API | http://localhost:3000/api |

---

## Feature Summary

**For Buyers:**
- Semantic search that understands intent beyond keywords
- AI chatbot that guides material selection through conversation
- Location-based discovery with interactive maps
- Cost savings of 30-70% compared to new materials

**For Sellers:**
- Simple listing creation with image upload
- Dashboard for inventory management
- Automatic indexing in search system via webhooks
- Revenue generation from surplus materials

**Technical Differentiators:**
- Hybrid BM25 + Semantic search architecture
- Context-aware AI chatbot with session management
- Real-time webhook integration for instant indexing
- Microservices architecture for independent scaling
- Location-based filtering via Mapbox integration

---

*Building a circular economy for construction materials.*
