const express = require('express');
const cors = require('cors');
const api = require('./routes');
const app = express();
app.use(cors()); app.use(express.json({limit:'1mb'}));
app.get('/health', (_req,res)=>res.json({status:'ok',service:'hr-lifecycle-api'}));
app.use('/api', api);
app.use((err,_req,res,_next)=>{ console.error(err); res.status(err.status || 500).json({error: err.message || 'Internal server error'}); });
module.exports = app;
