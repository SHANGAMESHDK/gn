# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copy custom nginx config if routing (react-router) is needed
COPY nginx.conf /etc/nginx/conf.d/default.conf

ENV PORT=80
EXPOSE 80

# Cloud Run injects $PORT environment variable, but nginx config uses 80 by default. 
# We'll rely on the default 8080/80 mappings for standard Cloud Run configs, 
# or start nginx dynamically if needed.
CMD ["nginx", "-g", "daemon off;"]
