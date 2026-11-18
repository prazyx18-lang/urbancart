
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadImage(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'urbancart/products',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

async function deleteImageByUrl(url) {
  if (!url || !url.includes('res.cloudinary.com')) return;

  const pathname = new URL(url).pathname;
  const uploadIndex = pathname.indexOf('/upload/');

  if (uploadIndex === -1) return;

  let publicId = pathname.substring(uploadIndex + 8);
  publicId = publicId.replace(/^v\d+\//, '');
  publicId = publicId.replace(/\.[^/.]+$/, '');

  return cloudinary.uploader.destroy(publicId);
}

module.exports = { cloudinary, uploadImage, deleteImageByUrl };
