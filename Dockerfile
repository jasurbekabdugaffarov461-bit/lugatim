FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

# data.sqlite va yuklangan avatarlar shu papkalarda saqlanadi (volume orqali)
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/index.js"]
