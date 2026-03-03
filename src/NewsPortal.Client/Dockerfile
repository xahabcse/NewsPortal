# Build stage
FROM node:20-alpine AS build
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
WORKDIR /app
COPY src/NewsPortal.Client/package*.json ./
RUN npm install
COPY src/NewsPortal.Client/ ./
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY src/NewsPortal.Client/nginx.prod.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
