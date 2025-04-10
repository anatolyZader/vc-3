# 1. Use Node 22 Alpine base image
FROM node:22-alpine

# 2. Set a working directory inside the container
WORKDIR /app

# 3. Copy package.json and package-lock.json for dependency install
COPY package*.json ./

# 4. Install dependencies
#    In production, consider using:
#      npm ci --omit=dev
#    or
#      npm install --omit=dev
#    to reduce image size.
RUN npm install

# 5. Copy the rest of your backend source
COPY . .

# 6. Expose the port the server listens on (e.g., 3000)
EXPOSE 3000

# 7. Define the default command (start your Fastify server)
CMD ["npm", "start"]
