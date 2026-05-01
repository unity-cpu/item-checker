{
  "version": 3,
  "builds": [
    { "src": "api/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/cos-check", "dest": "/api/index.js" },
    { "src": "/(.*)", "dest": "/api/index.js" }
  ]
}
