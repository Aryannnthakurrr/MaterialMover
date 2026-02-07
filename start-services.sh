#!/bin/bash
# Start MaterialMover Services (Linux)

echo "Starting MaterialMover services..."

# Start Node.js backend
echo "Starting backend on port 3000..."
cd "$(dirname "$0")/services/backend"
node api/index.js &

# Start Python search service
echo "Starting search on port 8000..."
cd "$(dirname "$0")/services/search"
source .venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &

echo ""
echo "Services started!"
echo "- Backend: http://localhost:3000"
echo "- Search:  http://localhost:8000"
echo ""
echo "Use 'pkill -f uvicorn' and 'pkill -f node' to stop."
