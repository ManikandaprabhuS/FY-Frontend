import api from "./api";
export const CONTACT_VIDEO_MAX=50*1024*1024,CONTACT_IMAGE_MAX=2*1024*1024;
export type ContactMediaKind="video"|"poster"|"banner";
export type ContactDetails={phone:string|null;email:string|null;studioName:string|null;address:string|null};
export type ContactAsset={url:string;fileName:string;sizeBytes:number};
export type ContactContent={videoUrl:string|null;posterUrl:string|null;bannerImageUrl:string|null;defaultVideoUrl:string|null;contactDetails:ContactDetails};
export type ContactSettings={video:ContactAsset|null;poster:ContactAsset|null;banner:ContactAsset|null;defaultVideoUrl:string|null;contactDetails:ContactDetails;updatedAt:{storyboard:string|null;banner:string|null;details:string|null}};
export const contactMediaService={
 public:async()=>(await api.get<{data:ContactContent}>("/site/contact-media",{timeout:15000})).data.data,
 settings:async()=>(await api.get<{data:ContactSettings}>("/admin/contact-settings",{timeout:20000})).data.data,
 upload:async(kind:ContactMediaKind,file:File,onProgress:(n:number)=>void)=>{
  const body=new FormData();body.append("file",file);
  return (await api.put<{data:ContactSettings}>("/admin/contact-settings/media/"+kind,body,{timeout:180000,onUploadProgress:event=>onProgress(event.total?Math.round(event.loaded/event.total*100):0)})).data.data;
 },
 remove:async(kind:ContactMediaKind)=>(await api.delete<{data:ContactSettings}>("/admin/contact-settings/media/"+kind,{timeout:30000})).data.data,
 details:async(details:ContactDetails)=>(await api.patch<{data:ContactSettings}>("/admin/contact-settings/details",details,{timeout:20000})).data.data,
};
export function contactFileWarning(kind:ContactMediaKind,file:Pick<File,"type"|"size">){
 if(file.size<=0)return "Please choose a non-empty file.";
 const video=kind==="video",max=video?CONTACT_VIDEO_MAX:CONTACT_IMAGE_MAX;
 if(file.size>max)return video?"Video must be 50 MB or smaller.":"Image must be 2 MB or smaller.";
 if(!(video?["video/mp4","video/webm"]:["image/jpeg","image/png","image/webp"]).includes(file.type))return video?"Choose an MP4 or WebM video.":"Choose a JPG, PNG or WebP image.";
 return null;
}
export function contactDetailsWarning(details:ContactDetails){
 const {phone,email,studioName,address}=details;
 if(phone&&(!/^\+?[0-9 ()-]+$/.test(phone.trim())||phone.replace(/\D/g,"").length<7||phone.replace(/\D/g,"").length>15))return "Enter a valid phone number with 7–15 digits.";
 if(email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())||email.length>254))return "Enter a valid email address.";
 if(studioName&&(studioName.trim().length<2||studioName.trim().length>120))return "Studio name must be 2–120 characters.";
 if(address&&(address.trim().length<5||address.trim().length>500))return "Address must be 5–500 characters.";
 if([phone,email,studioName,address].some(v=>v&&(/[<>]/.test(v)||Array.from(v).some(c=>c.charCodeAt(0)<32))))return "Use plain text without HTML.";
 return null;
}
