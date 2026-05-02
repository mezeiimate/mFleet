# 1. Alap kép: ugyanaz a Node verzió, mint a backendnél
FROM node:18-slim

# 2. Munkakönyvtár kijelölése
WORKDIR /app

# 3. Függőségek másolása és telepítése
COPY package*.json ./
RUN npm install

# 4. A teljes frontend forráskód másolása
COPY . .

# 5. A Vite alapértelmezett portja (ezt irányítjuk majd ki 5174-re)
EXPOSE 5173

# 6. A fejlesztői szerver indítása
CMD ["npm", "run", "dev"]