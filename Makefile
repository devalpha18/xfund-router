#!/usr/bin/make -f

DEFAULT_VERSION=0.0.1

VERSION := $(shell echo $(shell git describe --tags) | sed 's/^v//')
COMMIT := $(shell git log -1 --format='%H')

# Nothing released yet - set a default
ifeq ($(strip $(VERSION)),)
VERSION=$(DEFAULT_VERSION)
endif

ldflags = -X go-ooo/version.Version=$(VERSION) \
		  -X go-ooo/version.Commit=$(COMMIT)

BUILD_FLAGS := -ldflags '$(ldflags)'

abigen:
	npx truffle run abigen
	abigen --abi abigenBindings/abi/Router.abi --pkg ooo_router --out go-ooo/ooo_router/ooo_router.go

build:
	cd go-ooo && rm -f build/go-ooo && go build -mod=readonly $(BUILD_FLAGS) -o ./build/go-ooo ./

install:
	cd go-ooo && go install -mod=readonly $(BUILD_FLAGS) ./

# 1. Create a new release tag on Github, e.g. v0.1.5
# 2. 'git checkout main && git pull' to get tag in local repo
# 3. run this target to generate archive & checksum for upload
build-release: build
	rm -rf "dist/go-ooo_v${VERSION}"
	mkdir -p "dist/go-ooo_v${VERSION}"
	cp go-ooo/build/go-ooo "dist/go-ooo_v${VERSION}/go-ooo"
	cd dist && tar -cpzf "go-ooo_linux_v${VERSION}.tar.gz" "go-ooo_v${VERSION}"
	cd dist && sha256sum "go-ooo_linux_v${VERSION}.tar.gz" > "checksum_v${VERSION}.txt"
	cd dist && sha256sum --check "checksum_v${VERSION}.txt"

lint:
	@cd go-ooo && find . -name '*.go' -type f -not -path "./vendor*" -not -path "*.git*" | xargs gofmt -w -s

.PHONY: abigen build install build-release lint

# Dev environment
dev-env:
	docker rm -f ooo_dev_env
	docker build -t ooo_dev_env -f docker/dev.Dockerfile .
	docker run --name ooo_dev_env -it -p 8545:8545 ooo_dev_env

.PHONY: dev-env
