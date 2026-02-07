"""Hybrid search combining semantic search and BM25 keyword search"""
from typing import List, Dict, Any
import numpy as np

from app.services.search import SemanticSearchEngine
from app.services.keyword_search import KeywordSearchEngine


class HybridSearchEngine:
    """
    Hybrid search engine that combines:
    - Semantic search (Sentence-BERT embeddings + cosine similarity)
    - Keyword search (BM25 ranking)
    """
    
    def __init__(self):
        self.semantic_engine = SemanticSearchEngine()
        self.keyword_engine = KeywordSearchEngine()
    
    def initialize(self) -> None:
        """Initialize both search engines"""
        print("Initializing hybrid search engine...")
        self.semantic_engine.initialize()
        self.keyword_engine.initialize()
        print("✅ Hybrid search engine ready!")
    
    def shutdown(self) -> None:
        """Clean up resources"""
        self.semantic_engine.shutdown()
    
    def search(
        self,
        query: str,
        top_k: int = 5,
        min_score: float = 0.3,
        semantic_weight: float = 0.6,
        keyword_weight: float = 0.4
    ) -> List[Dict[str, Any]]:
        """
        Perform hybrid search combining semantic and keyword ranking
        
        Args:
            query: Search query text
            top_k: Number of results to return
            min_score: Minimum combined score threshold
            semantic_weight: Weight for semantic scores (default: 0.6)
            keyword_weight: Weight for keyword scores (default: 0.4)
        
        Returns:
            List of materials with combined scores
        """
        # Get results from both engines (fetch more to ensure good coverage)
        fetch_count = min(top_k * 3, 50)
        
        semantic_results = self.semantic_engine.search(query, top_k=fetch_count, min_score=0.0)
        keyword_results = self.keyword_engine.search(query, top_k=fetch_count, min_score=0.0)
        
        # Normalize scores and combine
        combined_scores = self._combine_results(
            semantic_results,
            keyword_results,
            semantic_weight,
            keyword_weight
        )
        
        # Filter by minimum score and sort
        filtered_results = [
            item for item in combined_scores.values()
            if item['combined_score'] >= min_score
        ]
        
        sorted_results = sorted(
            filtered_results,
            key=lambda x: x['combined_score'],
            reverse=True
        )[:top_k]
        
        return sorted_results
    
    def _combine_results(
        self,
        semantic_results: List[Dict],
        keyword_results: List[Dict],
        semantic_weight: float,
        keyword_weight: float
    ) -> Dict[str, Dict[str, Any]]:
        """
        Combine and normalize scores from both search methods
        
        Uses min-max normalization to bring scores to [0, 1] range
        """
        # Extract scores
        semantic_scores = {r['_id']: r.get('score', 0.0) for r in semantic_results}
        keyword_scores = {r['_id']: r.get('bm25_score', 0.0) for r in keyword_results}
        
        # Normalize semantic scores (already in 0-1 range for cosine similarity)
        semantic_max = max(semantic_scores.values()) if semantic_scores else 1.0
        semantic_min = min(semantic_scores.values()) if semantic_scores else 0.0
        
        if semantic_max - semantic_min > 0:
            normalized_semantic = {
                doc_id: (score - semantic_min) / (semantic_max - semantic_min)
                for doc_id, score in semantic_scores.items()
            }
        else:
            normalized_semantic = {doc_id: 0.0 for doc_id in semantic_scores}
        
        # Normalize keyword scores
        keyword_max = max(keyword_scores.values()) if keyword_scores else 1.0
        keyword_min = min(keyword_scores.values()) if keyword_scores else 0.0
        
        if keyword_max - keyword_min > 0:
            normalized_keyword = {
                doc_id: (score - keyword_min) / (keyword_max - keyword_min)
                for doc_id, score in keyword_scores.items()
            }
        else:
            normalized_keyword = {doc_id: 0.0 for doc_id in keyword_scores}
        
        # Combine scores
        all_doc_ids = set(semantic_scores.keys()) | set(keyword_scores.keys())
        combined = {}
        
        # Create a lookup dictionary for materials
        materials_lookup = {}
        for result in semantic_results + keyword_results:
            materials_lookup[result['_id']] = result
        
        for doc_id in all_doc_ids:
            sem_score = normalized_semantic.get(doc_id, 0.0)
            kw_score = normalized_keyword.get(doc_id, 0.0)
            
            combined_score = (semantic_weight * sem_score) + (keyword_weight * kw_score)
            
            material = materials_lookup[doc_id].copy()
            material['semantic_score'] = round(semantic_scores.get(doc_id, 0.0), 4)
            material['keyword_score'] = round(keyword_scores.get(doc_id, 0.0), 4)
            material['combined_score'] = round(combined_score, 4)
            
            # Remove unnecessary fields
            material.pop('score', None)
            material.pop('bm25_score', None)
            material.pop('embedding', None)
            material.pop('embedding_generated_at', None)
            material.pop('embedding_model', None)
            
            combined[doc_id] = material
        
        return combined
    
    def rebuild_keyword_cache(self) -> bool:
        """Rebuild BM25 keyword search index"""
        return self.keyword_engine.rebuild()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics from both search engines"""
        semantic_stats = self.semantic_engine.get_stats()
        return {
            "semantic_materials": semantic_stats["materials_loaded"],
            "keyword_materials": len(self.keyword_engine.docmap),
            "model": semantic_stats["model"],
            "search_type": "hybrid"
        }
