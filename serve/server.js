var Express = require("express");
var HTTP = require("http");
var Path = require("path");

var app = Express();
var server = HTTP.createServer(app);

app.use(Express.static(Path.resolve(__dirname, "../content")));

server.listen(8080);
