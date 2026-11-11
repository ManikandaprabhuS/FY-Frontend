import React from "react";
import {createRoot} from "react-dom/client";
import {MemoryRouter} from "react-router-dom";
import HomepageBannerVisual from "../../src/features/customer/components/HomepageBannerVisual";
import FrameCollectionsSection from "../../src/features/customer/components/FrameCollectionsSection";
import "../../src/index.css";
createRoot(document.getElementById("root")!).render(<MemoryRouter><div className="fy-offer-wrap"><HomepageBannerVisual offer={{code:"BIG_ORDER",title:"Big Order Offer",percentage:12,minOrderAmount:3000}}/></div><FrameCollectionsSection/></MemoryRouter>);
