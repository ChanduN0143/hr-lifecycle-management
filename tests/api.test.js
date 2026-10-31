const request=require('supertest');const app=require('../backend/src/app');
test('health endpoint returns service status',async()=>{const res=await request(app).get('/health');expect(res.statusCode).toBe(200);expect(res.body.status).toBe('ok')});
test('unknown endpoint returns normal not-found response',async()=>{const res=await request(app).get('/missing');expect(res.statusCode).toBe(404)});
