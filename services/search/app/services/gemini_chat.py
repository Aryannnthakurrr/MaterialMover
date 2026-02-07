"""Gemini-powered conversational product recommendation service.

Uses the google-genai SDK (Gemini 2.0 Flash) with function calling to:
1. Chat with users to understand their construction material needs
2. Build context through conversation
3. When ready, call a tool to search products and return recommendations
"""

import uuid
import json
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

from google import genai
from google.genai import types

from app.core.config import settings


# ── System prompt that guides Gemini's behaviour ────────────────────────────

SYSTEM_PROMPT = """\
You are a helpful construction materials advisor for MaterialMover, an online \
marketplace for construction supplies in India.

YOUR GOAL: Understand exactly what the user needs, then recommend the best \
matching products from our catalog using the search_and_recommend_products tool.

CONVERSATION GUIDELINES:
- Be conversational, friendly, and efficient.
- Ask AT MOST 1 clarifying question — prefer to make smart guesses.
- Key things to consider about the user's needs:
  • What project or task they are working on (e.g. building a wall, roofing, flooring)
  • What specific materials they need (e.g. cement, steel rods, paint)
  • Any preferences: category, brand, budget range, quantity
- If the user's message is even somewhat specific, call the tool IMMEDIATELY \
  with your best-guess query. Do NOT over-ask.
- If the user uses words like "urgent", "quick", "fast", "hurry", "asap", \
  "just find", or "show me", call the tool RIGHT AWAY with zero follow-up \
  questions — infer everything you can from their message.
- At most gather context in 1-2 short exchanges before calling the tool.
- When in doubt, SEARCH rather than ask another question.

WHEN CALLING THE TOOL:
- Construct a clear, descriptive search query that will match product titles, \
  descriptions, and categories in our catalog.
- Include relevant keywords: material type, use-case, category.
- Provide a brief reasoning for your query.

AFTER RECEIVING TOOL RESULTS:
- Summarise the recommended products in a friendly, readable way.
- Mention product names, prices, and why they match the user's needs.
- If no products matched, apologise and suggest the user refine their request.

PRODUCT CATEGORIES IN OUR CATALOG:
Wood, Glass, Aggregates, Metals, Bricks/Blocks, Plastics, Composites, Cement, \
Structural Materials, Finishing Materials, Ceramic Materials, Insulation Materials, \
Roofing Materials, Landscaping Materials, Adhesives/Sealants, Paint/Coatings, \
Plumbing Materials, Electrical Materials, Hardware/Fasteners, Other
"""


# ── Tool declaration for Gemini function calling ────────────────────────────

SEARCH_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="search_and_recommend_products",
            description=(
                "Search the MaterialMover product catalog and return recommended "
                "construction materials. Call this once you have gathered enough "
                "context about the user's requirements."
            ),
            parameters_json_schema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": (
                            "A well-constructed search query summarising the user's "
                            "construction material needs. Will be used for semantic "
                            "and keyword search over product titles/descriptions."
                        ),
                    },
                    "reasoning": {
                        "type": "string",
                        "description": (
                            "Brief explanation of why this query was chosen and how "
                            "it aligns with what the user asked for."
                        ),
                    },
                },
                "required": ["query", "reasoning"],
            },
        )
    ]
)


# ── Session management ──────────────────────────────────────────────────────

class ConversationSession:
    """Holds state for a single user conversation."""

    def __init__(self):
        self.id: str = str(uuid.uuid4())
        self.created_at: datetime = datetime.utcnow()
        self.messages: List[Dict[str, str]] = []
        self.status: str = "active"          # active | completed
        self.recommendations: Optional[List[Dict]] = None
        self.query_used: Optional[str] = None
        self.reasoning: Optional[str] = None
        # Stores the content history for multi-turn (list[types.Content])
        self.history: List[types.Content] = []

    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() - self.created_at > timedelta(hours=1)


# ── Main service ────────────────────────────────────────────────────────────

class GeminiChatService:
    """Manages Gemini chat sessions with tool-calling for product search."""

    def __init__(self):
        self.sessions: Dict[str, ConversationSession] = {}
        self.client: Optional[genai.Client] = None
        self.search_engine = None  # Set via set_search_engine()

    # -- lifecycle -----------------------------------------------------------

    def initialize(self) -> None:
        """Configure the genai client."""
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY is not set. Add it to your .env file."
            )

        self.client = genai.Client(api_key=api_key)
        self.model_name = settings.GEMINI_MODEL
        print(f"✅ Gemini chat service initialised ({self.model_name})")

    def set_search_engine(self, engine) -> None:
        """Inject the HybridSearchEngine from main.py."""
        self.search_engine = engine

    # -- session management --------------------------------------------------

    async def create_session(self) -> Dict[str, Any]:
        """Start a new conversation and return the assistant's greeting."""
        self._cleanup_expired_sessions()

        session = ConversationSession()

        # Ask the model to greet the user
        greeting_prompt = (
            "The user just opened the construction materials advisor chat. "
            "Greet them briefly and ask what construction materials or "
            "project they need help with."
        )

        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=greeting_prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=[SEARCH_TOOL],
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                ),
            ),
        )

        greeting = response.text or "Hello! How can I help you find construction materials today?"

        # Save greeting exchange to history
        session.history.append(
            types.Content(role="user", parts=[types.Part.from_text(text=greeting_prompt)])
        )
        session.history.append(response.candidates[0].content)

        session.messages.append({"role": "assistant", "content": greeting})
        self.sessions[session.id] = session

        return {
            "session_id": session.id,
            "message": greeting,
            "status": "active",
        }

    async def send_message(
        self, session_id: str, user_message: str
    ) -> Dict[str, Any]:
        """Process a user message and return the model's response.

        If the model decides it has enough context it will invoke the
        search_and_recommend_products tool, and we execute the search,
        feed the results back, and return the final recommendation.
        """
        session = self._get_session(session_id)

        if session.status == "completed":
            return {
                "session_id": session_id,
                "message": (
                    "This conversation already completed with recommendations. "
                    "Start a new session via POST /chat/start."
                ),
                "status": "completed",
                "products": session.recommendations,
            }

        session.messages.append({"role": "user", "content": user_message})

        # Build contents from history + new user message
        user_content = types.Content(
            role="user", parts=[types.Part.from_text(text=user_message)]
        )
        contents = session.history + [user_content]

        response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=[SEARCH_TOOL],
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                ),
            ),
        )

        # Persist turn in history
        session.history.append(user_content)
        model_content = response.candidates[0].content
        session.history.append(model_content)

        # ── Check for a function-call ───────────────────────────────────
        if response.function_calls:
            return await self._handle_tool_call(session, response.function_calls[0])

        # ── Regular text reply (follow-up question) ─────────────────────
        assistant_message = response.text or ""
        session.messages.append(
            {"role": "assistant", "content": assistant_message}
        )

        return {
            "session_id": session_id,
            "message": assistant_message,
            "status": "active",
        }

    async def get_session_history(self, session_id: str) -> Dict[str, Any]:
        """Return the full message history plus current status."""
        session = self._get_session(session_id)
        return {
            "session_id": session.id,
            "status": session.status,
            "messages": session.messages,
            "created_at": session.created_at.isoformat(),
            "products": session.recommendations,
        }

    # -- internal helpers ----------------------------------------------------

    def _get_session(self, session_id: str) -> ConversationSession:
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session '{session_id}' not found")
        if session.is_expired:
            del self.sessions[session_id]
            raise ValueError(f"Session '{session_id}' has expired")
        return session

    async def _handle_tool_call(
        self,
        session: ConversationSession,
        function_call: types.FunctionCall,
    ) -> Dict[str, Any]:
        """Execute the search tool and feed results back to Gemini."""
        args = dict(function_call.args) if function_call.args else {}
        query = args.get("query", "")
        reasoning = args.get("reasoning", "")

        # Run the actual product search
        products = await self._execute_search(query)

        # Build a concise summary to send back as the function response
        products_summary = [
            {
                "id": p.get("_id"),
                "title": p.get("title"),
                "price": p.get("price"),
                "category": p.get("category"),
                "description": (p.get("description", "")[:120] + "...")
                if len(p.get("description", "")) > 120
                else p.get("description", ""),
            }
            for p in products
        ]

        tool_result = {
            "products_found": len(products),
            "products": products_summary,
        }

        # Build the function response part
        function_response_part = types.Part.from_function_response(
            name="search_and_recommend_products",
            response={"result": json.dumps(tool_result)},
        )
        function_response_content = types.Content(
            role="tool", parts=[function_response_part]
        )
        session.history.append(function_response_content)

        # Send function result back to Gemini for a natural-language summary
        contents = session.history[:]

        summary_response = await self.client.aio.models.generate_content(
            model=self.model_name,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=[SEARCH_TOOL],
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                ),
            ),
        )

        summary = summary_response.text or "Here are the products I found for you."
        session.history.append(summary_response.candidates[0].content)

        # Finalise session
        session.messages.append({"role": "assistant", "content": summary})
        session.status = "completed"
        session.recommendations = products
        session.query_used = query
        session.reasoning = reasoning

        return {
            "session_id": session.id,
            "message": summary,
            "status": "completed",
            "reasoning": reasoning,
            "query_used": query,
            "products": products,
        }

    async def _execute_search(self, query: str) -> List[Dict]:
        """Run hybrid search and return full product documents.

        Uses the same logic as the /recommend endpoint (hybrid search
        to get product IDs) then enriches each ID from MongoDB so the
        response has every field the React carousel will need.
        """
        if not self.search_engine:
            print("⚠️  Search engine not available for chat service")
            return []

        # Use hybrid search (semantic + BM25) — this is sync, run in thread
        results = await asyncio.to_thread(
            self.search_engine.search,
            query=query,
            top_k=10,
            min_score=0.25,
            semantic_weight=0.7,
            keyword_weight=0.3,
        )

        products: List[Dict] = []
        for result in results:
            product_id = result.get("_id")
            if not product_id:
                continue

            # Fetch full document from MongoDB
            full = self.search_engine.semantic_engine.db_manager.find_by_id(
                product_id
            )
            if not full:
                continue

            # Strip internal / large fields not needed by the frontend
            for key in (
                "embedding",
                "embedding_generated_at",
                "embedding_model",
                "__v",
            ):
                full.pop(key, None)

            # Convert MongoDB-native types to JSON-safe strings
            for key, val in full.items():
                if hasattr(val, 'isoformat'):        # datetime
                    full[key] = val.isoformat()
                elif type(val).__name__ == 'ObjectId':  # bson ObjectId
                    full[key] = str(val)

            full["relevance_score"] = round(
                result.get("combined_score", 0), 4
            )
            products.append(full)

        return products

    # -- housekeeping --------------------------------------------------------

    def _cleanup_expired_sessions(self) -> None:
        """Remove sessions older than 1 hour."""
        expired = [
            sid
            for sid, s in self.sessions.items()
            if s.is_expired
        ]
        for sid in expired:
            del self.sessions[sid]
        if expired:
            print(f"🧹 Cleaned up {len(expired)} expired chat sessions")
