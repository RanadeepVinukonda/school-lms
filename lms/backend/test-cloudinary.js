
const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: '.env' });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function run() {
  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\nxref\n0 3\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\ntrailer\n<< /Size 3 /Root 1 0 R >>\nstartxref\n111\n%%EOF');
  
  const uploadRaw = () => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ resource_type: 'raw', folder: 'test' }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    stream.end(dummyPdf);
  });

  const resRaw = await uploadRaw();
  console.log('Raw URL:', resRaw.secure_url);
  const fetch = (await import('node-fetch')).default;
  let resp = await fetch(resRaw.secure_url);
  console.log('Raw Fetch Status:', resp.status);

  const uploadAuto = () => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ resource_type: 'image', folder: 'test' }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    stream.end(dummyPdf);
  });
  const resAuto = await uploadAuto();
  console.log('Image URL:', resAuto.secure_url);
  resp = await fetch(resAuto.secure_url);
  console.log('Image Fetch Status:', resp.status);
}
run().catch(console.error);

