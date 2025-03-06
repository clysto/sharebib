package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"

	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.etcd.io/bbolt"
)

//go:embed web/*
var embeddedFiles embed.FS

var db *bbolt.DB
var translateURL = os.Getenv("TRANSLATE_URL")
var translatePrefix = os.Getenv("TRANSLATE_PREFIX")
var port = os.Getenv("PORT")
var dbPath = os.Getenv("DB_PATH")

// 初始化数据库
func initDB() {
	var err error
	if dbPath == "" {
		dbPath = "data.db"
	}
	db, err = bbolt.Open(dbPath, 0600, nil)
	if err != nil {
		log.Fatal(err)
	}

	// 创建存储文献的 "spaces" Bucket
	err = db.Update(func(tx *bbolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists([]byte("spaces"))
		return err
	})
	if err != nil {
		log.Fatal("Failed to create bucket:", err)
	}
}

// 关闭数据库
func closeDB() {
	db.Close()
}

// 存储数据到 bbolt
func set(id, value string) error {
	return db.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte("spaces"))
		return b.Put([]byte(id), []byte(value))
	})
}

// 从 bbolt 读取数据
func get(id string) (string, error) {
	var val string
	err := db.View(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte("spaces"))
		if b == nil {
			return fmt.Errorf("bucket not found")
		}
		data := b.Get([]byte(id))
		if data == nil {
			return fmt.Errorf("id not found")
		}
		val = string(data)
		return nil
	})
	return val, err
}

// Zotero 代理
func zoteroProxy(c *gin.Context) {
	remote, err := url.Parse(translateURL)
	if err != nil {
		panic(err)
	}

	proxy := httputil.NewSingleHostReverseProxy(remote)
	proxy.Director = func(req *http.Request) {
		req.Header = c.Request.Header
		req.Host = remote.Host
		req.URL.Scheme = remote.Scheme
		req.URL.Host = remote.Host
		req.URL.Path = translatePrefix + c.Param("path")
	}

	proxy.ServeHTTP(c.Writer, c.Request)
}

// 创建文献空间
func createSpace(c *gin.Context) {
	id := uuid.New().String()
	_ = set(id, "[]") // 存入 bbolt

	c.JSON(200, gin.H{
		"id":   id,
		"bibs": json.RawMessage("[]"),
	})
}

// 同步文献空间数据
func syncSpace(c *gin.Context) {
	id := c.Param("id")
	_, err := get(id)
	if err != nil {
		c.JSON(404, gin.H{"error": "space not found"})
		return
	}

	body, _ := c.GetRawData()
	_ = set(id, string(body)) // 更新 bbolt

	c.JSON(200, gin.H{
		"id":   id,
		"bibs": json.RawMessage(body),
	})
}

// 获取文献空间数据
func getSpace(c *gin.Context) {
	id := c.Param("id")
	data, err := get(id)
	if err != nil {
		c.JSON(404, gin.H{"error": "space not found"})
		return
	}

	c.JSON(200, gin.H{
		"id":   id,
		"bibs": json.RawMessage(data),
	})
}

// 获取 BibTeX 格式数据
func getBibtex(c *gin.Context) {
	name := c.Param("name")
	id := strings.TrimSuffix(name, ".bib")

	data, err := get(id)
	if err != nil {
		c.Status(404)
		return
	}

	remote, err := url.Parse(translateURL)
	if err != nil {
		panic(err)
	}

	proxy := httputil.NewSingleHostReverseProxy(remote)
	proxy.Director = func(req *http.Request) {
		req.Method = http.MethodPost
		req.Header = c.Request.Header.Clone()
		req.Header.Set("Content-Type", "application/json")
		req.Body = io.NopCloser(strings.NewReader(data))
		req.ContentLength = int64(len(data))
		req.Host = remote.Host
		req.URL.Scheme = remote.Scheme
		req.URL.Host = remote.Host
		req.URL.Path = translatePrefix + "/export"
		req.URL.RawQuery = "format=bibtex"
	}

	proxy.ServeHTTP(c.Writer, c.Request)
}

func main() {
	initDB()
	defer closeDB() // 确保程序退出时关闭数据库

	app := gin.Default()
	app.Use(static.Serve("/", static.EmbedFolder(embeddedFiles, "web")))
	app.Any("/zotero/*path", zoteroProxy)

	app.POST("/space", createSpace)
	app.POST("/space/:id", syncSpace)
	app.GET("/space/:id", getSpace)
	app.GET("/bibtex/:name", getBibtex)

	addr := ":8080"
	if port != "" {
		addr = ":" + port
	}
	app.Run(addr)
}
