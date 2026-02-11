#!/bin/bash
# Start MaterialMover Services (macOS/Linux)

echo "Starting MaterialMover services..."

# --- Kill existing processes ---
echo "Stopping any running services on ports 3000, 5173, 8000..."
lsof -ti:3000,5173,8000 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1 # Give processes a moment to die

# --- Start Node.js Backend ---
echo "Starting backend on port 3000..."
cd "$(dirname "$0")/services/backend" || exit
(node api/index.js &)

# --- Start Python Search Service ---
echo "Starting search service on port 8000..."
cd "$(dirname "$0")/services/search" || exit

# Check for python3, otherwise use python
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    $PYTHON_CMD -m venv .venv
fi

# Activate virtual environment and install dependencies
source .venv/bin/activate
pip install -r requirements.txt

# Start Uvicorn server
(uvicorn app.main:app --host 0.0.0.0 --port 8000 &)


# --- Start Vite Frontend ---
echo "Starting frontend on port 5173..."
cd "$(dirname "$0")/services/frontend" || exit
(npm install && npx vite --port 5173 &)


echo ""
echo "✅ All services started!"
echo "   - Backend:   http://localhost:3000"
echo "   - Frontend:  http://localhost:5173"
echo "   - Search:    http://localhost:8000"
echo ""
echo "To stop all services, run the stop-services.sh script."
