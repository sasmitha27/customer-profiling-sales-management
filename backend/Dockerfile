FROM node:20-alpine

WORKDIR /app

# Install postgresql-client and redis for healthchecks
RUN apk add --no-cache postgresql-client redis

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Copy and set permissions for entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Ensure SQL assets are present in dist after build so runtime migrations can find them
RUN mkdir -p dist/database \
	&& cp -R src/database/*.sql dist/database/ 2>/dev/null || true \
	&& if [ -d src/database/migrations ]; then cp -R src/database/migrations dist/database/ 2>/dev/null || true; fi

EXPOSE 5000

ENTRYPOINT ["docker-entrypoint.sh"]
