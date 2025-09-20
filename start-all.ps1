# PowerShell script to start frontend and backend processes

# Start backend (activate venv first, adjust venv path if needed)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; & 'venv\Scripts\activate.ps1'; python app.py"

# Start frontend (using npx serve, adjust if you use another frontend server)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npx serve ."

Write-Host "Frontend and backend processes started in separate terminals."