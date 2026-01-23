# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY src/NewsPortal.Web.Client/package*.json ./
RUN npm install
COPY src/NewsPortal.Web.Client/ ./
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
