require('dotenv').config();
const { analyzeProductImageMulti } = require('./services/visionService');

// 1x1 red pixel JPEG
const TINY_JPEG = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AP//Z';

(async () => {
  console.log('Testing vision providers with tiny test image...');
  const result = await analyzeProductImageMulti(TINY_JPEG, 'image/jpeg');
  const usable = result && (
    (result.product_name && !/^(unknown|scanned item)$/i.test(result.product_name))
    || (result.detected_category && result.detected_category !== 'other')
  );
  if (usable) {
    console.log('VISION_OK:', JSON.stringify(result, null, 2));
    process.exit(0);
  }
  console.error('VISION_FAIL: providers returned no usable signal');
  process.exit(1);
})();
