"""BM25 keyword search for construction materials"""
import os
import pickle
import string
import math
from collections import defaultdict, Counter
from typing import List, Dict, Any
from nltk.stem import PorterStemmer
import nltk

from app.core.config import settings
from app.core.database import DatabaseManager

# BM25 Parameters
BM25_K1 = 1.5
BM25_B = 0.75

# Cache directory
CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "cache")

# Common English stopwords
STOPWORDS = {
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with'
}


def preprocess_text(text: str) -> str:
    """Convert text to lowercase and remove punctuation"""
    text = text.lower()
    text = text.translate(str.maketrans("", "", string.punctuation))
    return text


def tokenize_text(text: str) -> List[str]:
    """Tokenize, remove stopwords, and stem text"""
    text = preprocess_text(text)
    tokens = text.split()
    
    # Remove empty tokens and stopwords
    filtered_tokens = [token for token in tokens if token and token not in STOPWORDS]
    
    # Stem the tokens
    stemmer = PorterStemmer()
    stemmed_tokens = [stemmer.stem(token) for token in filtered_tokens]
    
    return stemmed_tokens


class KeywordSearchEngine:
    """BM25-based keyword search engine for construction materials"""
    
    def __init__(self):
        self.index: Dict[str, set] = defaultdict(set)
        self.docmap: Dict[str, Dict] = {}  # MongoDB uses string IDs
        self.term_frequencies: Dict[str, Counter] = {}
        self.doc_lengths: Dict[str, int] = {}
        self.db_manager = DatabaseManager()
        
        # Cache file paths
        self.index_path = os.path.join(CACHE_DIR, "bm25_index.pkl")
        self.docmap_path = os.path.join(CACHE_DIR, "bm25_docmap.pkl")
        self.term_frequency_path = os.path.join(CACHE_DIR, "bm25_term_frequencies.pkl")
        self.doc_lengths_path = os.path.join(CACHE_DIR, "bm25_doc_lengths.pkl")
    
    def initialize(self) -> None:
        """Initialize keyword search - build or load index"""
        try:
            # Try loading from MongoDB first (most up-to-date)
            self.db_manager.connect()
            if self._load_from_mongodb():
                print(f"✅ Loaded BM25 index from MongoDB with {len(self.docmap)} materials")
                return
            
            # Fallback to loading from cache files
            self.load()
            print(f"✅ Loaded BM25 index from cache files with {len(self.docmap)} materials")
        except FileNotFoundError:
            # Build from scratch if nothing exists
            print("🔄 Building BM25 index for the first time...")
            self.db_manager.connect()
            self.build()
            self.save()
            self._save_to_mongodb()
            print(f"✅ Built and saved BM25 index with {len(self.docmap)} materials")
        except Exception as e:
            print(f"⚠️  Error during initialization: {e}")
            # Continue anyway - at least try to build from database
            try:
                self.db_manager.connect()
                self.build()
                self.save()
                self._save_to_mongodb()
                print(f"✅ Built BM25 index from database with {len(self.docmap)} materials")
            except Exception as e2:
                print(f"❌ Failed to build BM25 index: {e2}")
    
    def build(self) -> None:
        """Build inverted index from MongoDB materials"""
        materials = self.db_manager.get_all_materials()
        
        for material in materials:
            doc_id = material["_id"]
            # Create searchable text from title, category, and description
            doc_text = f"{material.get('title', '')} {material.get('category', '')} {material.get('description', '')}"
            self.docmap[doc_id] = material
            self._add_document(doc_id, doc_text)
    
    def rebuild(self) -> bool:
        """Rebuild the index from scratch"""
        try:
            self.db_manager.connect()
            self.index.clear()
            self.docmap.clear()
            self.term_frequencies.clear()
            self.doc_lengths.clear()
            
            self.build()
            self.save()
            self.db_manager.disconnect()
            return True
        except Exception as e:
            print(f"❌ Error rebuilding BM25 index: {e}")
            return False
    
    def save(self) -> None:
        """Save index to disk"""
        os.makedirs(CACHE_DIR, exist_ok=True)
        with open(self.index_path, "wb") as f:
            pickle.dump(dict(self.index), f)
        with open(self.docmap_path, "wb") as f:
            pickle.dump(self.docmap, f)
        with open(self.term_frequency_path, "wb") as f:
            pickle.dump(self.term_frequencies, f)
        with open(self.doc_lengths_path, "wb") as f:
            pickle.dump(self.doc_lengths, f)
    
    def load(self) -> None:
        """Load index from disk"""
        with open(self.index_path, "rb") as f:
            self.index = defaultdict(set, pickle.load(f))
        with open(self.docmap_path, "rb") as f:
            self.docmap = pickle.load(f)
        with open(self.term_frequency_path, "rb") as f:
            self.term_frequencies = pickle.load(f)
        with open(self.doc_lengths_path, "rb") as f:
            self.doc_lengths = pickle.load(f)
    
    def _add_document(self, doc_id: str, text: str) -> None:
        """Add a document to the inverted index"""
        tokens = tokenize_text(text)
        
        self.doc_lengths[doc_id] = len(tokens)
        
        # Add to inverted index
        for token in set(tokens):
            self.index[token].add(doc_id)
        
        # Track term frequencies
        if doc_id not in self.term_frequencies:
            self.term_frequencies[doc_id] = Counter()
        
        for token in tokens:
            self.term_frequencies[doc_id][token] += 1
    
    def add_document(self, doc_id: str, text: str) -> None:
        """
        PUBLIC METHOD: Add a new document to BM25 index
        Called when friend's service adds a new product via webhook
        
        Args:
            doc_id: Document ID (as string)
            text: Text to index (usually product title)
        """
        try:
            # CRITICAL FIX: Fetch the actual material document from MongoDB
            # We need to populate docmap so search can return results
            if self.db_manager.collection is None:
                self.db_manager.connect()
            
            from bson import ObjectId
            material = self.db_manager.collection.find_one({"_id": ObjectId(doc_id)})
            
            if not material:
                raise ValueError(f"Material {doc_id} not found in database")
            
            # Convert ObjectId to string for consistency
            material['_id'] = str(material['_id'])
            
            # Add to docmap
            self.docmap[doc_id] = material
            
            # Add to in-memory index
            self._add_document(doc_id, text)
            
            # Save updated index to disk (cache)
            self.save()
            
            # Also save to MongoDB for persistence
            self._save_to_mongodb()
            
            print(f"✅ BM25: Added document {doc_id} to index and docmap")
        except Exception as e:
            print(f"❌ BM25: Error adding document: {e}")
            raise
    
    def update_document(self, doc_id: str, text: str) -> None:
        """
        PUBLIC METHOD: Update an existing document in BM25 index
        Called when friend's service updates a product via webhook
        
        Args:
            doc_id: Document ID (as string)
            text: Updated text to index (usually updated product title)
        """
        try:
            # CRITICAL FIX: Fetch the updated material document from MongoDB
            if self.db_manager.collection is None:
                self.db_manager.connect()
            
            from bson import ObjectId
            material = self.db_manager.collection.find_one({"_id": ObjectId(doc_id)})
            
            if not material:
                raise ValueError(f"Material {doc_id} not found in database")
            
            # Convert ObjectId to string for consistency
            material['_id'] = str(material['_id'])
            
            # Update docmap with fresh data
            self.docmap[doc_id] = material
            
            # Remove old document from index
            self._remove_document(doc_id)
            
            # Add updated document
            self._add_document(doc_id, text)
            
            # Save updated index to disk (cache)
            self.save()
            
            # Also save to MongoDB for persistence
            self._save_to_mongodb()
            
            print(f"✅ BM25: Updated document {doc_id} in index and docmap")
        except Exception as e:
            print(f"❌ BM25: Error updating document: {e}")
            raise
    
    def _remove_document(self, doc_id: str) -> None:
        """Remove a document from the inverted index"""
        # Remove from inverted index
        for token in list(self.index.keys()):
            if doc_id in self.index[token]:
                self.index[token].discard(doc_id)
                # Remove term if no documents contain it
                if not self.index[token]:
                    del self.index[token]
        
        # Remove from term frequencies and doc lengths
        self.term_frequencies.pop(doc_id, None)
        self.doc_lengths.pop(doc_id, None)
    
    def get_bm25_idf(self, term: str) -> float:
        """Calculate BM25 IDF for a term"""
        tokens = tokenize_text(term)
        
        if not tokens:
            return 0.0
        
        processed_term = tokens[0]
        term_doc_count = len(self.index.get(processed_term, set()))
        doc_count = len(self.docmap)
        
        bm25_idf = math.log((doc_count - term_doc_count + 0.5) / (term_doc_count + 0.5) + 1)
        return bm25_idf
    
    def get_bm25_tf(self, doc_id: str, term: str, K1: float = BM25_K1, b: float = BM25_B) -> float:
        """Calculate BM25 TF for a term in a document"""
        tokens = tokenize_text(term)
        
        if not tokens:
            return 0.0
        
        processed_term = tokens[0]
        tf = self.term_frequencies.get(doc_id, Counter()).get(processed_term, 0)
        
        doc_length = self.doc_lengths.get(doc_id, 0)
        avg_doc_length = self._get_avg_doc_length()
        
        if avg_doc_length == 0:
            length_norm = 1.0
        else:
            length_norm = 1 - b + b * (doc_length / avg_doc_length)
        
        bm25_tf = (tf * (K1 + 1)) / (tf + K1 * length_norm)
        return bm25_tf
    
    def _get_avg_doc_length(self) -> float:
        """Calculate average document length"""
        if not self.doc_lengths:
            return 0.0
        return sum(self.doc_lengths.values()) / len(self.doc_lengths)
    
    def _save_to_mongodb(self) -> None:
        """
        Save BM25 index data to MongoDB collection
        Creates/updates a special "bm25_index" document for persistence
        """
        try:
            if self.db_manager.collection is None:
                self.db_manager.connect()
            
            # Prepare index data for MongoDB
            index_data = {
                "_id": "bm25_index",  # Special ID for the index document
                "inverted_index": {k: list(v) for k, v in self.index.items()},
                "term_frequencies": {
                    doc_id: dict(freq) for doc_id, freq in self.term_frequencies.items()
                },
                "doc_lengths": self.doc_lengths,
                "last_updated": __import__('datetime').datetime.utcnow()
            }
            
            # Upsert into MongoDB (create or update)
            self.db_manager.collection.update_one(
                {"_id": "bm25_index"},
                {"$set": index_data},
                upsert=True
            )
            
            print("✅ BM25 index saved to MongoDB")
        except Exception as e:
            print(f"⚠️  Warning: Could not save BM25 index to MongoDB: {e}")
            # Don't raise - BM25 should still work with cache files
    
    def _load_from_mongodb(self) -> bool:
        """
        Load BM25 index data from MongoDB
        Returns True if successfully loaded, False otherwise
        """
        try:
            if self.db_manager.collection is None:
                self.db_manager.connect()
            
            index_doc = self.db_manager.collection.find_one({"_id": "bm25_index"})
            
            if not index_doc:
                return False
            
            # Restore index data
            self.index = defaultdict(set)
            for term, doc_ids in index_doc.get("inverted_index", {}).items():
                self.index[term] = set(doc_ids)
            
            self.term_frequencies = {}
            for doc_id, freq_dict in index_doc.get("term_frequencies", {}).items():
                self.term_frequencies[doc_id] = Counter(freq_dict)
            
            self.doc_lengths = index_doc.get("doc_lengths", {})
            
            # CRITICAL FIX: Load actual material documents into docmap
            # The index structures are useless without the actual documents!
            all_materials = self.db_manager.get_all_materials()
            self.docmap = {material["_id"]: material for material in all_materials}
            
            print(f"✅ Loaded BM25 index from MongoDB with {len(self.docmap)} materials")
            return True
        except Exception as e:
            print(f"⚠️  Warning: Could not load BM25 index from MongoDB: {e}")
            return False
    
    def bm25_score(self, doc_id: str, term: str) -> float:
        """Calculate BM25 score for a term in a document"""
        bm25_tf = self.get_bm25_tf(doc_id, term)
        bm25_idf = self.get_bm25_idf(term)
        return bm25_tf * bm25_idf
    
    def search(self, query: str, top_k: int = 5, min_score: float = 0.0) -> List[Dict[str, Any]]:
        """
        Perform BM25 keyword search
        
        Args:
            query: Search query text
            top_k: Number of top results to return
            min_score: Minimum BM25 score threshold
        
        Returns:
            List of materials with BM25 scores
        """
        if len(self.docmap) == 0:
            return []
        
        query_tokens = tokenize_text(query)
        
        if not query_tokens:
            return []
        
        # Calculate BM25 scores for all documents
        scores: Dict[str, float] = {}
        
        for doc_id in self.docmap.keys():
            total_score = 0.0
            
            for query_token in query_tokens:
                bm25_score = self.bm25_score(doc_id, query_token)
                total_score += bm25_score
            
            if total_score >= min_score:
                scores[doc_id] = total_score
        
        # Sort by score and get top k
        sorted_docs = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
        
        # Build results
        results = []
        for doc_id, score in sorted_docs:
            material = self.docmap[doc_id].copy()
            material['bm25_score'] = round(score, 4)
            # Remove embedding from response
            material.pop('embedding', None)
            material.pop('embedding_generated_at', None)
            material.pop('embedding_model', None)
            results.append(material)
        
        return results
