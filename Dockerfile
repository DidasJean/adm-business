FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY .env.example ./.env.example

EXPOSE 8080

CMD ["npm", "run", "start"]

