"""FastAPI application for construction materials semantic search"""
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from app.core.config import settings
from app.models.schemas import (
    Material, SearchRequest, SearchResponse, HealthResponse, HybridSearchRequest,
    WebhookProductAdded, WebhookProductUpdated 
)
from app.services.hybrid_search import HybridSearchEngine
from app.services.gemini_chat import GeminiChatService
from app.routers.chat import router as chat_router, set_chat_service


# Global service instances
search_engine: Optional[HybridSearchEngine] = None
chat_service: Optional[GeminiChatService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global search_engine
    
    print("Initializing hybrid search engine...")
    search_engine = HybridSearchEngine()
    search_engine.initialize()
    print("Search engine ready!")
    
    # Initialise Gemini chat service
    global chat_service
    try:
        chat_service = GeminiChatService()
        chat_service.initialize()
        chat_service.set_search_engine(search_engine)
        set_chat_service(chat_service)
        print("✅ Chat advisor ready!")
    except Exception as e:
        print(f"⚠️  Chat advisor disabled (Gemini init failed): {e}")
        chat_service = None
    
    yield
    
    print("Shutting down...")
    if search_engine:
        search_engine.shutdown()


# Create FastAPI application
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan
)

# ===== CORS CONFIGURATION FOR WiFi TESTING (Lines 36-48) =====
# ADDED: Enable Cross-Origin Resource Sharing for your friend's MERN app
# Your friend's React frontend (192.168.0.x:3000) can now make requests to your API (192.168.0.x:8000)
# This allows requests from any device on the same WiFi network
# 
# Details:
# - allow_origins: Allows requests from friend's React dev server on port 3000
# - allow_credentials: Allows cookies to be sent with requests
# - allow_methods: ["*"] Allows GET, POST, PUT, DELETE, etc.
# - allow_headers: ["*"] Allows any headers in the request
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # See app/core/config.py (Lines 25-32) for allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ===== END CORS CONFIGURATION =====

# Register chat advisor router
app.include_router(chat_router)


@app.get("/", tags=["General"])
async def root():
    """Root endpoint with API information"""
    return {
        "service": settings.API_TITLE,
        "version": settings.API_VERSION,
        "endpoints": {
            "search": "/search",
            "recommend": "/recommend",
            "chat_start": "/chat/start",
            "chat_message": "/chat/message",
            "chat_history": "/chat/history/{session_id}",
            "health": "/health",
            "rebuild_cache": "/rebuild-cache",
            "docs": "/docs"
        }
    }


@app.get("/health", response_model=HealthResponse, tags=["General"])
async def health_check():
    """Check API health and return statistics"""
    if not search_engine:
        raise HTTPException(status_code=503, detail="Search engine not initialized")
    
    stats = search_engine.get_stats()
    return {
        "status": "healthy",
        "materials_loaded": stats["semantic_materials"],
        "model": stats["model"]
    }


@app.get("/search", response_model=SearchResponse, tags=["Search"])
async def search_get(
    query: str = Query(..., description="Natural language search query", min_length=1),
    top_k: int = Query(5, description="Number of results to return", ge=1, le=50),
    min_score: float = Query(0.3, description="Minimum combined score", ge=0.0, le=1.0),
    semantic_weight: float = Query(0.6, description="Weight for semantic search", ge=0.0, le=1.0),
    keyword_weight: float = Query(0.4, description="Weight for keyword search", ge=0.0, le=1.0)
):
    """
    Hybrid search for construction materials using semantic + keyword matching
    
    Combines:
    - Semantic search (BERT embeddings + cosine similarity)
    - Keyword search (BM25 ranking)
    
    Example queries:
    - cement for foundation work
    - steel rods for reinforcement
    - waterproofing material for roof
    - paint for exterior walls
    - tiles for bathroom flooring
    """
    if not search_engine:
        raise HTTPException(status_code=503, detail="Search engine not initialized")
    
    try:
        results = search_engine.search(query, top_k, min_score, semantic_weight, keyword_weight)
        return {
            "query": query,
            "results": results,
            "total": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.post("/search", response_model=SearchResponse, tags=["Search"])
async def search_post(request: HybridSearchRequest):
    """Hybrid search for construction materials using JSON request body"""
    if not search_engine:
        raise HTTPException(status_code=503, detail="Search engine not initialized")
    
    try:
        results = search_engine.search(
            request.query, 
            request.top_k, 
            request.min_score,
            request.semantic_weight,
            request.keyword_weight
        )
        return {
            "query": request.query,
            "results": results,
            "total": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/recommend", tags=["Search"])
async def recommend_products(
    query: str = Query(..., description="Natural language search query", min_length=1)
):
    """
    Get top 10 recommended product IDs based on hybrid search
    
    Returns only product IDs - optimized for clean integration
    
    Default parameters:
    - top_k: 10
    - semantic_weight: 0.7 (prioritize meaning)
    - keyword_weight: 0.3 (ensure exact matches)
    - min_score: 0.3
    
    Example queries:
    - cement for foundation work
    - steel rods for reinforcement
    - waterproofing material
    """
    if not search_engine:
        raise HTTPException(status_code=503, detail="Search engine not initialized")
    
    try:
        results = search_engine.search(
            query=query,
            top_k=10,
            min_score=0.3,
            semantic_weight=0.7,
            keyword_weight=0.3
        )
        
        # Extract only product IDs
        product_ids = [result["_id"] for result in results]
        
        return {
            "product_ids": product_ids
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")


@app.post("/rebuild-cache", tags=["Admin"])
async def rebuild_cache():
    """Rebuild semantic embeddings and BM25 keyword index from scratch"""
    if not search_engine:
        raise HTTPException(status_code=503, detail="Search engine not initialized")
    
    try:
        # Rebuild semantic embeddings
        semantic_success = search_engine.semantic_engine.rebuild_cache()
        # Rebuild keyword index
        keyword_success = search_engine.rebuild_keyword_cache()
        
        if semantic_success and keyword_success:
            stats = search_engine.get_stats()
            return {
                "status": "success",
                "message": "All embeddings and keyword index rebuilt",
                "semantic_materials": stats["semantic_materials"],
                "keyword_materials": stats["keyword_materials"]
            }
        else:
            raise HTTPException(status_code=500, detail="Cache rebuild failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rebuild failed: {str(e)}")


# ===== WEBHOOK ENDPOINTS (Lines 220-330) =====
# These endpoints receive automatic notifications from your friend's service
# when products are added or updated in their database

@app.post("/webhook/product-added", tags=["Webhooks"], summary="Product Added Webhook")
async def webhook_product_added(data: WebhookProductAdded):
    """
    ✨ WEBHOOK: Friend's service notifies you when a NEW product is added
    
    SIMPLIFIED: Only send product_id - we fetch everything else from database!
    
    WHAT IT DOES:
    1. Friend adds a product to their database
    2. Friend's service automatically sends: {"product_id": "690f371b..."}
    3. Your system automatically:
       - Fetches product from database
       - Generates embedding from product title
       - Indexes the product
    4. Product is now searchable via /search and /recommend endpoints
    
    FRIEND'S CODE:
    ```javascript
    await axios.post('https://your-ngrok-url/webhook/product-added', {
      product_id: product._id.toString()  // That's it!
    });
    ```
    """
    try:
        from bson import ObjectId
        
        if not search_engine:
            raise HTTPException(status_code=503, detail="Search engine not initialized")
        
        # Validate ObjectId format
        try:
            object_id = ObjectId(data.product_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid product_id format: {str(e)}")
        
        # Fetch product from database using db_manager
        try:
            product = search_engine.semantic_engine.db_manager.collection.find_one({"_id": object_id})
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {data.product_id} not found in database")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
        
        # Check if already has embedding
        if "embedding" in product:
            raise HTTPException(status_code=400, detail=f"Product {data.product_id} already indexed")
        
        # Get title from database
        title = product.get("title", "")
        if not title:
            raise HTTPException(status_code=400, detail=f"Product {data.product_id} has no title")
        
        # CRITICAL FIX: Use add_material() to update both database AND in-memory cache
        try:
            success = search_engine.semantic_engine.add_material(data.product_id)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to add material to semantic search")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Semantic search update failed: {str(e)}")
        
        # Update BM25 keyword index (this now also updates docmap)
        try:
            search_engine.keyword_engine.add_document(
                doc_id=data.product_id,
                text=title
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"BM25 index update failed: {str(e)}")
        
        # Verify the product is now searchable
        stats = search_engine.get_stats()
        
        print(f"✅ Webhook SUCCESS: Product '{title}' (ID: {data.product_id}) indexed and added to in-memory caches")
        
        return {
            "status": "success",
            "product_id": data.product_id,
            "title": title,
            "message": "Product indexed and immediately searchable",
            "semantic_materials": stats["semantic_materials"],
            "keyword_materials": stats["keyword_materials"],
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Webhook ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Webhook failed: {str(e)}")


@app.post("/webhook/product-updated", tags=["Webhooks"], summary="Product Updated Webhook")
async def webhook_product_updated(data: WebhookProductUpdated):
    """
    🔄 WEBHOOK: Friend's service notifies you when a product is UPDATED
    
    SIMPLIFIED: Only send product_id - we fetch everything else from database!
    
    WHAT IT DOES:
    1. Friend updates a product in their database
    2. Friend's service sends: {"product_id": "690f371b..."}
    3. Your system automatically:
       - Fetches product from database (gets updated title)
       - Regenerates embedding based on new title
       - Re-indexes the product
    4. Updated product reflects in search results immediately
    
    FRIEND'S CODE:
    ```javascript
    await axios.post('https://your-ngrok-url/webhook/product-updated', {
      product_id: product._id.toString()  // That's it!
    });
    ```
    """
    try:
        from bson import ObjectId
        
        if not search_engine:
            raise HTTPException(status_code=503, detail="Search engine not initialized")
        
        # Validate ObjectId format
        try:
            object_id = ObjectId(data.product_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid product_id format: {str(e)}")
        
        # Fetch product from database using db_manager
        try:
            product = search_engine.semantic_engine.db_manager.collection.find_one({"_id": object_id})
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {data.product_id} not found in database")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
        
        # Check if product is indexed
        if "embedding" not in product:
            raise HTTPException(status_code=400, detail=f"Product {data.product_id} not indexed yet. Call /webhook/product-added first.")
        
        # Get title from database
        title = product.get("title", "")
        if not title:
            raise HTTPException(status_code=400, detail=f"Product {data.product_id} has no title")
        
        # CRITICAL FIX: Use update_material() to update both database AND in-memory cache
        try:
            success = search_engine.semantic_engine.update_material(data.product_id)
            if not success:
                raise HTTPException(status_code=500, detail="Failed to update material in semantic search")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Semantic search update failed: {str(e)}")
        
        # Update BM25 index with new title (this now also updates docmap)
        try:
            search_engine.keyword_engine.update_document(
                doc_id=data.product_id,
                text=title
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"BM25 index update failed: {str(e)}")
        
        # Verify the product is searchable
        stats = search_engine.get_stats()
        
        print(f"✅ Webhook SUCCESS: Product '{title}' (ID: {data.product_id}) updated in both search engines")
        
        return {
            "status": "success",
            "product_id": data.product_id,
            "title": title,
            "message": "Product updated and immediately searchable",
            "semantic_materials": stats["semantic_materials"],
            "keyword_materials": stats["keyword_materials"],
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌x Webhook ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Webhook failed: {str(e)}")

# ===== END WEBHOOK ENDPOINTS =====
