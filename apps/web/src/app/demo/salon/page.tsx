import type {Metadata} from "next";
import SalonDemoClient from "./salon-demo-client";
import "./salon-demo.css";
import "./salon-demo-light.css";
import "./salon-pos-workspace.css";

export const metadata:Metadata={
 title:"تجربة إدارة الصالون | DRVO ERP",
 description:"تجربة تفاعلية مجانية لواجهة DRVO ERP للصالونات ببيانات وهمية فقط، دون حجز أو بيع حقيقي.",
 robots:{index:false,follow:false},
};
export default function SalonDemo(){
 return <SalonDemoClient/>;
}
