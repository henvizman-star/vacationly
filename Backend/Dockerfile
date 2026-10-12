FROM node:24-alpine AS build
WORKDIR /app
COPY Backend/package*.json ./
RUN npm ci
COPY Backend/tsconfig.json ./
COPY Backend/src ./src
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY Backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY Backend/assets ./assets
COPY Database/01-schema.sql Database/02-seed.sql /Database/
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 4000
CMD ["node", "dist/app.js"]

