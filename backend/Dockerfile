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

EXPOSE 5000

ENTRYPOINT ["docker-entrypoint.sh"]
