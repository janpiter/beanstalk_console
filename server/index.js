import { createApp } from './app.js';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3080);
createApp().listen(port, host, () => console.log(`Beanstalk Console listening on http://${host}:${port}`));
