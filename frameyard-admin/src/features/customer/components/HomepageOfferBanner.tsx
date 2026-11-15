import {useHomepageBannerStore} from "../../../store/homepageBannerStore";
import HomepageBannerVisual from "./HomepageBannerVisual";
export default function HomepageOfferBanner(){
 const banner=useHomepageBannerStore(s=>s.banner);
 if(banner===undefined)return <div className="fy-offer-wrap" role="status" aria-label="Loading homepage offer"><div className="fy-offer-skeleton"/></div>;
 if(!banner)return null;
 return <div className="fy-offer-wrap"><HomepageBannerVisual offer={banner}/></div>;
}
