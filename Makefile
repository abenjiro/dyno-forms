.PHONY: help dev build prod stop clean test mock-start

help:
	@echo "Dyno Forms — Available Commands:"
	@echo "  make dev          - Start development stack in Docker (Next.js + Mock API)"
	@echo "  make prod         - Build and run production standalone container"
	@echo "  make stop         - Stop all active containers"
	@echo "  make local-dev    - Run locally with host Node.js"
	@echo "  make local-mock   - Run mock API server locally on port 4000"
	@echo "  make typecheck    - Run TypeScript strict type verification"

dev:
	docker compose up --build

prod:
	docker compose -f docker-compose.prod.yml up --build

stop:
	docker compose down

local-dev:
	npm run dev

local-mock:
	node docker/mock-server/server.js

typecheck:
	npm run typecheck
