.PHONY: all build build-backend build-frontend test test-backend lint lint-backend \
       dev dev-backend dev-frontend clean clean-backend clean-frontend \
       docker docker-up docker-down docker-build \
       deps deps-backend deps-frontend deps-update deps-update-backend deps-update-frontend \
       check fmt fmt-backend k8s-apply k8s-delete

# Default target
all: build

# ---- Build ----

build: build-backend build-frontend

build-backend:
	cd backend && npm run build

build-frontend:
	cd frontend && npm run build

# ---- Test ----

test: test-backend

test-backend:
	cd backend && npm test

# ---- Lint & Format ----

lint: lint-backend

lint-backend:
	cd backend && npm run lint

fmt: fmt-backend

fmt-backend:
	cd backend && npm run format

check: lint test

# ---- Dev servers ----

dev-backend:
	cd backend && npm run dev

dev-frontend:
	cd frontend && npm run dev

# ---- Dependencies ----

deps: deps-backend deps-frontend

deps-backend:
	cd backend && npm ci

deps-frontend:
	cd frontend && npm install

deps-update: deps-update-backend deps-update-frontend

deps-update-backend:
	cd backend && npm update

deps-update-frontend:
	cd frontend && npm update

# ---- Docker ----

docker-build:
	docker compose build

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

# ---- Bazel ----

bazel-build:
	bazel build //...

bazel-test:
	bazel test //...

# ---- Kubernetes ----

k8s-apply:
	kubectl apply -k k8s/

k8s-delete:
	kubectl delete -k k8s/

# ---- Clean ----

clean: clean-backend clean-frontend

clean-backend:
	rm -rf backend/dist backend/node_modules backend/coverage

clean-frontend:
	rm -rf frontend/dist frontend/node_modules/.vite

# ---- Help ----

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Build:"
	@echo "  build              Build backend and frontend"
	@echo "  build-backend      Build TypeScript backend (tsc)"
	@echo "  build-frontend     Build frontend with Vite"
	@echo ""
	@echo "Test & Lint:"
	@echo "  test               Run all tests"
	@echo "  lint               Run ESLint on backend"
	@echo "  fmt                Format backend code with Prettier"
	@echo "  check              Lint + test"
	@echo ""
	@echo "Dev:"
	@echo "  dev-backend        Run backend dev server (tsx watch)"
	@echo "  dev-frontend       Run frontend dev server"
	@echo ""
	@echo "Dependencies:"
	@echo "  deps               Install all dependencies"
	@echo "  deps-update        Update all dependencies"
	@echo "  deps-update-backend  Update backend npm dependencies"
	@echo "  deps-update-frontend Update frontend npm dependencies"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build       Build Docker images"
	@echo "  docker-up          Start services with Docker Compose"
	@echo "  docker-down        Stop Docker Compose services"
	@echo ""
	@echo "Bazel:"
	@echo "  bazel-build        Build all targets with Bazel"
	@echo "  bazel-test         Run all tests with Bazel"
	@echo ""
	@echo "Kubernetes:"
	@echo "  k8s-apply          Deploy to Kubernetes"
	@echo "  k8s-delete         Remove Kubernetes deployment"
	@echo ""
	@echo "Other:"
	@echo "  clean              Remove build artifacts"
	@echo "  help               Show this help"
