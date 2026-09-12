# ollama.Dockerfile — Ollama server with a pre-pulled model
#
# Usage:
#   # Build (pulls the model at build time so startup is instant):
#   podman build \
#     --build-arg OLLAMA_MODEL=qwen2.5-coder:7b \
#     -f build/dockerfiles/ollama.Dockerfile \
#     -t dev-workflow-ai-ollama:latest \
#     .
#
#   # Run standalone:
#   podman run -d --name ollama -p 11434:11434 dev-workflow-ai-ollama:latest
#
#   # Run alongside the app (share host network):
#   podman run -d --name ollama --network=host dev-workflow-ai-ollama:latest
#
# The app container points at Ollama via OLLAMA_BASE_URL=http://localhost:11434
# or http://ollama:11434 when both containers are in the same pod/network.
#
# GPU note:
#   CPU-only inference works out of the box.
#   For CUDA: use the base image ollama/ollama:latest (NVIDIA) instead.
#   For ROCm: use ollama/ollama:rocm (AMD).

ARG OLLAMA_MODEL=qwen2.5-coder:7b

# ── Stage 1: pull the model ───────────────────────────────────────────────────
FROM ollama/ollama:latest AS model-puller

ARG OLLAMA_MODEL

# Start server in background, wait for it, pull the model, stop it.
# Model files land in /root/.ollama/models and are copied to the final image.
RUN ollama serve & \
    SERVER_PID=$! && \
    sleep 5 && \
    ollama pull ${OLLAMA_MODEL} && \
    kill $SERVER_PID 2>/dev/null || true

# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM ollama/ollama:latest

ARG OLLAMA_MODEL
ENV OLLAMA_MODEL=${OLLAMA_MODEL}

# Copy pre-pulled model from stage 1
COPY --from=model-puller /root/.ollama /root/.ollama

EXPOSE 11434

# Keep models dir explicit so mounts don't shadow it
VOLUME ["/root/.ollama"]

# Start Ollama server; it will serve whatever models are in /root/.ollama
CMD ["serve"]
