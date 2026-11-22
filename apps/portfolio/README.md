# AlpineCraft

Lean web software, built with AI. This portfolio is a **Rust → WebAssembly** site (Leptos + Trunk).

## Dev

```bash
rustup target add wasm32-unknown-unknown
cargo install trunk
trunk serve
```

Open http://127.0.0.1:8080

## Production

```bash
../../scripts/build-portfolio.sh
```

See [DEPLOY.md](./DEPLOY.md) for Apache layout with Mon Vino at `/monvino/`.
