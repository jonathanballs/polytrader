FROM node:8.2-stretch

# Create app directory
WORKDIR /usr/src/app
RUN mkdir /upload

# Copy package.json and install deps
COPY package.json .
RUN npm install
RUN npm install -g webpack

# Copy application files over and build
COPY . .
RUN webpack

# Expose ports
EXPOSE 8080
EXPOSE 8443
CMD ["npm", "start"]

