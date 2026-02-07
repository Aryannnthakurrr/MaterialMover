module.exports = {
    apps: [
        {
            name: 'backend',
            script: 'node',
            args: 'api/index.js',
            cwd: './services/backend',
            env: {
                NODE_ENV: 'development'
            }
        },
        {
            name: 'search',
            script: '.venv/Scripts/python.exe',
            args: '-m uvicorn app.main:app --host 0.0.0.0 --port 8000',
            cwd: './services/search',
            interpreter: 'none',
            max_restarts: 3,
            min_uptime: 60000,
            restart_delay: 10000,
            env: {
                PYTHONPATH: './services/search',
                PYTHONIOENCODING: 'utf-8',   // Fix Windows Unicode encoding
                PYTHONUTF8: '1'              // Force UTF-8 mode
            }
        }
    ]
};
