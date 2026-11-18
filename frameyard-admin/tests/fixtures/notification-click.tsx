import {createRoot} from 'react-dom/client';
import {Toaster} from 'react-hot-toast';
import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
import '../../src/index.css';
import AdminLayout from '../../src/layouts/AdminLayout';
import NotificationsPage from '../../src/pages/notifications/NotificationsPage';
import OrdersPage from '../../src/pages/orders/OrdersPage';
import {useAuthStore} from '../../src/store/authStore';
const role=new URLSearchParams(location.search).get('role')==='EMPLOYEE'?'EMPLOYEE':'ADMIN';
useAuthStore.setState({user:{id:'fixture-staff',name:'Dummy Test Order',email:'dummy@example.invalid',role} as never,status:'authenticated',isAuthenticated:true,loading:false});
function Location(){const value=useLocation();return <output data-testid="location" className="sr-only">{value.pathname+value.search}</output>;}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/admin/notification-click-test']}><Toaster/><Location/><Routes><Route path="/admin" element={<AdminLayout/>}><Route path="notification-click-test" element={<p>Notification click verification</p>}/><Route path="notifications" element={<NotificationsPage/>}/><Route path="orders" element={<OrdersPage/>}/></Route></Routes></MemoryRouter>);
