# Container image published to GitHub Packages as
#   ghcr.io/lunganlungpg/ble-demystified
#
#   docker run --rm -p 3333:3333 ghcr.io/lunganlungpg/ble-demystified
#   then open http://localhost:3333/web/  and  http://localhost:3333/explainer/
#
# The simulator has zero npm dependencies, so no `npm install` step is needed.
FROM node:20-alpine

LABEL org.opencontainers.image.title="ble-demystified" \
      org.opencontainers.image.description="Simulated BLE GATT peripheral, Web Bluetooth demo and interactive explainer" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /opt/ble-demystified
COPY . .

# Run as the unprivileged `node` user that ships with the base image.
USER node
ENV PORT=3333
EXPOSE 3333

CMD ["node", "simulator/server.js"]
