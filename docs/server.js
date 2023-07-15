import express from 'express';
import http from 'http';

// minimal server for dev
const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.static('./'));
const http_ = http.createServer(app);

http_.listen(PORT, function () {
  console.log(`Server is listening on port http://localhost:${PORT}`);
});