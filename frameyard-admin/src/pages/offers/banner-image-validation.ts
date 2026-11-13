export const validateBannerFile=(file:Pick<File,"size"|"type">)=>{
 if(!file.size)return "Please choose a non-empty banner image.";
 if(file.size>2*1024*1024)return "Image must be 2 MB or smaller";
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))return "Please choose a JPG, PNG or WebP image.";
 return null;
};
export const bannerDimensionWarning=(width:number,height:number)=>width<800||width/height<2||width/height>4.5
 ?"For best results, use an image at least 800 px wide with a 3:1 aspect ratio. You can still upload this image.":null;
