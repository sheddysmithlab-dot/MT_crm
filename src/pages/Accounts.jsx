// import TabbedPage from '@/components/TabbedPage';
// import Card from '@/components/ui/Card';

// const Placeholder = ({ title }) => (
//     <Card>
//         <h3 className="text-lg font-bold dark:text-dark-text">{title}</h3>
//         <p className="mt-2 text-gray-600 dark:text-dark-text-secondary text-sm">A full-featured interface for managing {title.toLowerCase()} will be available here.</p>
//     </Card>
// );

// const tabs = [
//     { id: 'purchase', label: 'Purchase', component: () => <Placeholder title="Purchase" /> },
//     { id: 'voucher', label: 'Voucher', component: () => <Placeholder title="Voucher" /> },
//     { id: 'invoice', label: 'Invoice', component: () => <Placeholder title="Invoice" /> },
//     { id: 'challan', label: 'Challan', component: () => <Placeholder title="Challan" /> },
//     { id: 'gst', label: 'GST Ledger', component: () => <Placeholder title="GST Ledger" /> },
// ];

// const Accounts = () => <TabbedPage tabs={tabs} title="Accounts Management" />;
// export default Accounts;



// import { Route, Routes } from "react-router-dom";
// import TabbedPage from "../components/TabbedPage";
// import Card from "../components/ui/Card"
// import Purchase from "../pages/accounts/Purchase"
// import Voucher from "./accounts/Voucher";
// // Ye ek chhota component hai jo sirf title leta hai aur ek card dikhata hai
// const Placeholder = ({ title }) => {
//   return (
//     <Card>
//       {/* <h3 className="text-lg font-bold dark:text-dark-text">{title}</h3>
//       <p className="mt-2 text-gray-600 dark:text-dark-text-secondary text-sm">
//         A full-featured interface for managing {title.toLowerCase()} will be available here.
//       </p> */}
//       <Routes>
//         <Route  path="Purchase"  element={ <Purchase/>}/>
//        <Route path="Voucher" element={ <Voucher/>}/>

//        </Routes>

//     </Card>
//   );
// };

// // Sabhi tabs ka data yaha rakha hai
// const tabs = [
//   {
//     id: "purchase",
//     label: "Purchase",
//     component: () => <Placeholder title="Purchase" />,
//   },
//   {
//     id: "voucher",
//     label: "Voucher",
//     component: () => <Placeholder title="Voucher" />,
//   },
//   {
//     id: "invoice",
//     label: "Invoice",
//     component: () => <Placeholder title="Invoice" />,
//   },
//   {
//     id: "challan",
//     label: "Challan",
//     component: () => <Placeholder title="Challan" />,
//   },
//   {
//     id: "gst",
//     label: "GST Ledger",
//     component: () => <Placeholder title="GST Ledger" />,
//   },
// ];

// // Accounts page yaha se export ho raha hai
// const Accounts = () => {
//   return (
//     <>
//         <TabbedPage 
//       tabs={tabs} 
//       title="Accounts Management" />
     
//    </>

//   );
// };

// export default Accounts;



// src/pages/accounts/Account.jsx
import TabbedPage from "../components/TabbedPage";
import Card from "../components/ui/Card";
import Purchase from "./accounts/Purchase";
import Voucher from "./accounts/Voucher";
import Invoice from "./accounts/Invoice";
import Challan from "./accounts/Challan";
import Sellchallan from "./accounts/Sellchallan";
import GSTLedger from "./accounts/Gstledger";
import CashReceipt from "./accounts/CashReceipt";
import OtherExpenses from "./accounts/OtherExpenses";

const tabs = [
  {
    id: "purchase",
    label: "Purchase-Invoice",
    component:Purchase,
  },
  {
    id: "voucher",
    label: "Voucher",
    component: Voucher,
  },
  {
    id: "expenses",
    label: "Other Expenses",
    component: OtherExpenses,
  },
   {
    id: "invoice",
    label: "Sell-Invoice",
    component: Invoice,
  },
{
  id:"challan",
  label:"Purchase-Challan",
  component:Challan,

},
{
  id:"Sellchallan",
  label:"Sell-Challan",
  component:Sellchallan,

},
{
  id:"cashreceipt",
  label:"Cash Receipt",
  component:CashReceipt,

},
{
  id:"GST",
  label:"GSTLedger",
  component:GSTLedger,
},



  // baaki tabs yaha add kar sakta hai Invoice, Challan, GSTLedger...
];

const Accounts = () => {
  return (
    <TabbedPage 
      tabs={tabs} 
      title="Accounts Management" 
    />
  );
};

export default Accounts;
