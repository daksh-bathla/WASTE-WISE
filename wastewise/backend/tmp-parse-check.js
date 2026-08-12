const express = require('express');
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.post('/test', (req, res) => {
  console.log('body', JSON.stringify(req.body));
  res.json({ body: req.body });
});
app.listen(5100, () => console.log('listening'));
