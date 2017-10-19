FROM node:8.2-stretch

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and install deps
COPY package.json .
COPY lib/ ./lib
RUN npm install

# Link to contrib packages directly
RUN rm -r /usr/src/app/node_modules/poloniex-wrapper
RUN ln -s /usr/src/app/lib/poloniex-wrapper /usr/src/app/node_modules/poloniex-wrapper

# Copy application files over
COPY . .

# Expose ports
EXPOSE 8080
CMD ["npm", "start"]
