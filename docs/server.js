import express from 'express';
import http from 'http';

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.static('./public'));
app.use('/libs', express.static('./node_modules'));
const http_ = http.createServer(app);

http_.listen(PORT, function () {
  console.log(`Server is listening on port http://localhost:${PORT}`);
});