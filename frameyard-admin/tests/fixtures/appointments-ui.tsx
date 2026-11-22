import {createRoot} from 'react-dom/client';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import AppointmentsPage from '../../src/pages/appointments/AppointmentsPage';
import AdminLayout from '../../src/layouts/AdminLayout';
import {useAuthStore} from '../../src/store/authStore';
import '../../src/index.css';
useAuthStore.setState({user:{id:'00000000-0000-4000-8000-000000000001',name:'Test Admin',email:'admin@example.invalid',role:'ADMIN'} as never,token:'fixture-only',isAuthenticated:true,status:'authenticated',loading:false});
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/admin/appointments']}><Routes><Route path="/admin" element={<AdminLayout/>}><Route path="appointments" element={<AppointmentsPage/>}/><Route path="appointments/:id" element={<p>Existing appointment details route</p>}/></Route></Routes></MemoryRouter>);
