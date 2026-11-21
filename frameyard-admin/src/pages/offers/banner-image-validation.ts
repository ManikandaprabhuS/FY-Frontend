export const BANNER_IMAGE_MAX=2*1024*1024;
export const bannerImageRecommendation=(maxBytes=BANNER_IMAGE_MAX)=>`Recommended size: 1800 x 600 px (3:1). JPG, PNG or WebP, max ${maxBytes/1024/1024} MB. Keep the main subject in the center/right and the left side clear for text. The image is cropped to fit.`;
export const validateBannerFile=(file:Pick<File,"size"|"type">)=>{
 if(!file.size)return "Please choose a non-empty banner image.";
 if(file.size>BANNER_IMAGE_MAX)return "Image must be 2 MB or smaller";
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))return "Please choose a JPG, PNG or WebP image.";
 return null;
};
export const bannerDimensionWarning=(width:number,height:number)=>width<800||width/height<2||width/height>4.5
 ?"For best results, use an image at least 800 px wide with a 3:1 aspect ratio. You can still upload this image.":null;
