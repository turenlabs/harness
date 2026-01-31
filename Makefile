.PHONY: help dev build build-universal build-x64 build-arm64 dmg clean install setup lint check

# Default target
help:
	@echo "Harness - Build Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make setup          Install all dependencies (npm + Rust targets)"
	@echo "  make install        Install npm dependencies only"
	@echo ""
	@echo "Development:"
	@echo "  make dev            Start development server with hot reload"
	@echo "  make check          Run TypeScript and Rust checks"
	@echo "  make lint           Run linters"
	@echo ""
	@echo "Build:"
	@echo "  make build          Build for current architecture"
	@echo "  make build-x64      Build for Intel Macs (x86_64)"
	@echo "  make build-arm64    Build for Apple Silicon (aarch64)"
	@echo "  make build-universal Build universal binary (both architectures)"
	@echo "  make dmg            Build universal DMG for distribution"
	@echo ""
	@echo "Utility:"
	@echo "  make clean          Remove build artifacts"
	@echo "  make icons          Regenerate app icons from public/vite.svg"

# Setup - install all dependencies
setup: install
	@echo "Adding Rust targets for universal build..."
	rustup target add x86_64-apple-darwin
	rustup target add aarch64-apple-darwin
	@echo "Setup complete!"

# Install npm dependencies
install:
	npm install

# Development
dev:
	npm run tauri dev

# Check compilation
check:
	@echo "Checking TypeScript..."
	npx tsc --noEmit
	@echo "Checking Rust..."
	cd src-tauri && cargo check

# Lint
lint:
	@echo "Linting not configured yet"

# Build for current architecture
build:
	npm run tauri build

# Build for Intel Macs
build-x64:
	npm run tauri build -- --target x86_64-apple-darwin

# Build for Apple Silicon
build-arm64:
	npm run tauri build -- --target aarch64-apple-darwin

# Build universal binary (both architectures)
build-universal:
	npm run tauri build -- --target universal-apple-darwin

# Build universal DMG for distribution (alias for build-universal)
dmg: build-universal
	@echo ""
	@echo "Universal DMG built successfully!"
	@echo "Location: src-tauri/target/universal-apple-darwin/release/bundle/dmg/"
	@ls -la src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg 2>/dev/null || echo "DMG file created in bundle directory"

# Regenerate icons
icons:
	npx tauri icon public/vite.svg

# Clean build artifacts
clean:
	rm -rf dist
	rm -rf src-tauri/target
	rm -rf node_modules/.vite
	@echo "Build artifacts cleaned"

# Clean everything including node_modules
clean-all: clean
	rm -rf node_modules
	@echo "All artifacts cleaned (run 'make install' to reinstall)"
