# 1. Alap kép: egy könnyített Node.js környezet
FROM node:18-slim

# 2. Munkakönyvtár létrehozása a konténeren belül
WORKDIR /app

# 3. A package.json másolása és a függőségek telepítése
COPY package*.json ./
RUN npm install

# 4. A teljes kód (pl. index.js) másolása a mappába
COPY . .

# 5. Jelzünk a Dockernek, hogy a belső 5000-es portot fogjuk használni
EXPOSE 5000

# 6. A szerver elindítása
CMD ["npm", "start"]