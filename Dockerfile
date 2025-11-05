# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy Prisma schema and source code
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./

# Generate Prisma client
RUN npx prisma generate

# Build (if using TypeScript)
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
