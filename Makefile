.PHONY: setup env dev-server dev-agent dev-frontend

setup:
	cd backend && uv sync
	cd frontend && npm install

env:
	cp backend/.env.example backend/.env
	@echo "Please fill in your API keys in backend/.env"

dev-server:
	cd backend && uv run python server.py

dev-agent:
	cd backend && uv run python agent.py

dev-frontend:
	cd frontend && npm run dev
