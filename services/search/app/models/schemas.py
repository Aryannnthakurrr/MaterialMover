"""Pydantic models for API requests and responses"""
from typing import List, Optional
from pydantic import BaseModel, Field


class Material(BaseModel):
    """Material data model"""
    id: str = Field(alias="_id")
    title: str
    description: str
    category: str
    price: float
    quantity: Optional[int] = 0
    brand: Optional[str] = ""
    image: Optional[str] = ""
    phone_number: Optional[str] = ""
    address: Optional[str] = ""
    score: Optional[float] = None
    semantic_score: Optional[float] = None
    keyword_score: Optional[float] = None
    combined_score: Optional[float] = None
    
    class Config:
        populate_by_name = True


class SearchRequest(BaseModel):
    """Search request payload"""
    query: str = Field(..., min_length=1, description="Search query text")
    top_k: int = Field(5, ge=1, le=50, description="Number of results to return")
    min_score: float = Field(0.3, ge=0.0, le=1.0, description="Minimum similarity score")


class HybridSearchRequest(BaseModel):
    """Hybrid search request payload"""
    query: str = Field(..., min_length=1, description="Search query text")
    top_k: int = Field(5, ge=1, le=50, description="Number of results to return")
    min_score: float = Field(0.3, ge=0.0, le=1.0, description="Minimum combined score")
    semantic_weight: float = Field(0.6, ge=0.0, le=1.0, description="Weight for semantic search (0-1)")
    keyword_weight: float = Field(0.4, ge=0.0, le=1.0, description="Weight for keyword search (0-1)")


# ===== WEBHOOK SCHEMAS (Lines 44-65) =====
# SIMPLIFIED: Only need product_id - API fetches all data from database!

class WebhookProductAdded(BaseModel):
    """Schema for product-added webhook from friend's service"""
    product_id: str = Field(..., description="MongoDB ObjectId of new product")
    
    class Config:
        json_schema_extra = {
            "example": {
                "product_id": "690f371b09bfc4dc74bea545"
            }
        }


class WebhookProductUpdated(BaseModel):
    """Schema for product-updated webhook from friend's service"""
    product_id: str = Field(..., description="MongoDB ObjectId of updated product")
    
    class Config:
        json_schema_extra = {
            "example": {
                "product_id": "690f371b09bfc4dc74bea545"
            }
        }


# ===== END WEBHOOK SCHEMAS =====

class SearchResponse(BaseModel):
    """Search response payload"""
    query: str
    results: List[Material]
    total: int


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    materials_loaded: int
    model: str
