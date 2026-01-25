# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY src/NewsPortal.Client/package*.json ./
RUN npm install
COPY src/NewsPortal.Client/ ./
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY src/NewsPortal.Client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
