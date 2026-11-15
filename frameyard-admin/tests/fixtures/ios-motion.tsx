import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import {MemoryRouter} from "react-router-dom";
import PhotoToFrameSection from "../../src/features/customer/components/PhotoToFrameSection";
import AddToCartButton from "../../src/features/customer/components/AddToCartButton";
import MobileDock from "../../src/features/customer/components/MobileDock";
import "../../src/index.css";
import "../../src/features/customer/styles/storefront.css";
function Fixture(){
 const [count,setCount]=useState(0);
 return <MemoryRouter><main className="fy-store" style={{paddingBottom:140}}><div style={{height:500,padding:24}}><AddToCartButton available onAdd={()=>{setCount(n=>n+1);return true;}}/><output data-testid="cart-count">{count}</output></div><PhotoToFrameSection/><div style={{height:1000}}/><MobileDock/></main></MemoryRouter>;
}
createRoot(document.getElementById("root")!).render(<Fixture/>);
