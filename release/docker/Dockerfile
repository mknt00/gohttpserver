FROM golang:1.16
WORKDIR /app/gohttpserver
ADD . /app/gohttpserver
# Source is in ./src; assets are embedded via go:embed at build time.
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags '-X main.VERSION=docker' -o gohttpserver ./src

FROM debian:stable
WORKDIR /app
RUN mkdir -p /app/public
RUN apt-get update && apt-get install -y ca-certificates
VOLUME /app/public
COPY --from=0 /app/gohttpserver/gohttpserver .
EXPOSE 8000
ENTRYPOINT [ "/app/gohttpserver", "--root=/app/public" ]
CMD []
