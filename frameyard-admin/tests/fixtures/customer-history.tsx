import {createRoot} from 'react-dom/client';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {Toaster} from 'react-hot-toast';
import '../../src/index.css';
import '../../src/features/customer/styles/storefront.css';
import CustomerNotificationBell from '../../src/features/customer/components/CustomerNotificationBell';
import NotificationsPage from '../../src/pages/notifications/NotificationsPage';
import {useAuthStore} from '../../src/store/authStore';
const fixture=(window as unknown as {customerFixture:{id:string;token:string}}).customerFixture;
sessionStorage.setItem('fy_auth_token',fixture.token);
useAuthStore.setState({user:{id:fixture.id,name:'Dummy Test Order',role:'CUSTOMER'} as never,status:'authenticated',isAuthenticated:true,loading:false});
function Location(){const location=useLocation();return <output data-testid="location" className="sr-only">{location.pathname}</output>;}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/notifications']}><Toaster/><Location/><main className="fy-store"><header className="relative h-16"><CustomerNotificationBell/></header><div data-testid="profile-notifications"><NotificationsPage/></div></main></MemoryRouter>);
