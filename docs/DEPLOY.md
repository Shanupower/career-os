# Deploy live demo on Render

Career OS ships a [render.yaml](../render.yaml) Blueprint and [Dockerfile.render](../Dockerfile.render) for a free-tier demo with pre-seeded Alex Dev data.

## One-click deploy

1. Open [Create Blueprint from GitHub](https://dashboard.render.com/blueprint/new).
2. Connect the **Shanupower/career-os** repository (branch: `main`).
3. Confirm the Blueprint path is `render.yaml` and click **Deploy Blueprint**.
4. Wait ~10–15 minutes for the first Docker build (Playwright Chromium download).
5. Copy your service URL (e.g. `https://career-os-demo.onrender.com`) and update the **Live demo** link at the top of [README.md](../README.md).

## What the demo includes

- Pre-seeded profile, intelligence, and 5 scored jobs
- **Explore live demo** button on the welcome screen (`DEMO_MODE=1`)
- Full `/api/*` pipeline (discovery/scoring/tailoring may be slow on 512 MB free tier)
- Spins down after ~15 min idle; first load after idle can take ~50s

## Local smoke test

```bash
docker build -f Dockerfile.render -t career-os-demo .
docker run --rm -p 10000:10000 -e DEMO_MODE=1 career-os-demo
# Open http://localhost:10000 → Explore live demo
```

## CLI validation

```bash
curl -fsSL https://raw.githubusercontent.com/render-oss/cli/refs/heads/main/bin/install.sh | sh
render login
render blueprints validate render.yaml
```
