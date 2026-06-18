FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libvulkan1 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY server.js .

ENV QVAC_BRIDGE_HOST=0.0.0.0
ENV QVAC_BRIDGE_PORT=8765

EXPOSE 8765

CMD ["node", "server.js"]
