FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the client code
COPY . .

# Expose frontend port
EXPOSE 5173

# Start Vite dev server on all network interfaces
CMD ["npm", "run", "dev", "--", "--host"]
