# Imgate

Monorepo for smart contracts and web application.

## Project Structure

```
imgate/
├── packages/
│   ├── hardhat/     # Smart contracts (Hardhat)
│   └── nextjs/      # Web application (Next.js)
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

## Getting Started

### Installation

```bash
pnpm install
```

### Development

**Run Next.js development server:**
```bash
pnpm dev
```

**Run Hardhat local node:**
```bash
pnpm dev:hardhat
```

### Building

**Build Next.js app:**
```bash
pnpm build
```

**Compile smart contracts:**
```bash
pnpm build:contracts
```

### Testing

**Test smart contracts:**
```bash
pnpm test
```

**Test Next.js app:**
```bash
pnpm test:nextjs
```

### Deploy Contracts

```bash
pnpm deploy
```

## Packages

### Hardhat
Smart contract development environment. See [packages/hardhat/README.md](packages/hardhat/README.md) for details.

### Next.js
Web application frontend. See [packages/nextjs/README.md](packages/nextjs/README.md) for details.

## License

MIT
