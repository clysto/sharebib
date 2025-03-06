FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY sharelib /bin/sharelib
RUN chmod +x /bin/sharelib
CMD ["/app/sharelib"]
