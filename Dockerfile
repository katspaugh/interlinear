FROM node:22-slim

WORKDIR /app
RUN corepack enable \
 && apt-get update && apt-get install -y --no-install-recommends unzip \
 && rm -rf /var/lib/apt/lists/*

# Bake the Digital Pāḷi Dictionary's released database into the image
# (~200 MB download, ~1 GB unpacked) so Pali word lookups run in-process —
# see server/src/dpd.ts. Without it the server falls back to the dpdict.net
# API, so the download URL can be overridden or the stage skipped entirely.
ARG DPD_DB_URL=https://github.com/digitalpalidictionary/dpd-db/releases/latest/download/dpd-mobile-db.zip
ADD ${DPD_DB_URL} /tmp/dpd-mobile-db.zip
RUN unzip -q /tmp/dpd-mobile-db.zip -d /opt/dpd && rm /tmp/dpd-mobile-db.zip
ENV DPD_DB_PATH=/opt/dpd/dpd-mobile.db

COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["pnpm", "start"]
