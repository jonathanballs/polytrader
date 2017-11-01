FROM node:8.2-stretch

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and install deps
COPY package.json .
RUN npm install

# Copy application files over
COPY . .

# Expose ports
EXPOSE 8080
CMD ["npm", "start"]
