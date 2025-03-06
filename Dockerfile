FROM alpine:latest
RUN apk --no-cache add ca-certificates
RUN mkdir /app
WORKDIR /app
COPY sharebib /bin/sharebib
RUN chmod +x /bin/sharebib
EXPOSE 8080
CMD ["/bin/sharebib"]
