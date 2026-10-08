FROM denoland/deno:alpine-2.0.0
WORKDIR /app
COPY main.ts .
EXPOSE 8080
CMD ["deno", "run", "--allow-net", "--allow-env", "main.ts"]
