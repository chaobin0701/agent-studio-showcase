FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_AGENT_STUDIO_ADMIN_URL
ENV NEXT_PUBLIC_AGENT_STUDIO_ADMIN_URL=${NEXT_PUBLIC_AGENT_STUDIO_ADMIN_URL}
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3300
RUN mkdir -p /data/hub /app/.next && chown -R node:node /data/hub /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/data ./data
USER node
EXPOSE 3300
CMD ["node", "server.js"]
