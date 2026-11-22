import {createRoot} from 'react-dom/client';
import {MemoryRouter,Route,Routes} from 'react-router-dom';
import EmployeesPage from '../../src/pages/employees/EmployeesPage';
import AdminLayout from '../../src/layouts/AdminLayout';
import {useAuthStore} from '../../src/store/authStore';
import {Toaster} from 'react-hot-toast';
import '../../src/index.css';
useAuthStore.setState({user:{id:'00000000-0000-4000-8000-000000000001',name:'Test Admin',email:'admin@example.invalid',role:'ADMIN'} as never,token:'fixture-only',isAuthenticated:true,status:'authenticated',loading:false});
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/admin/employees']}><Routes><Route path="/admin" element={<AdminLayout/>}><Route path="employees" element={<EmployeesPage/>}/></Route></Routes><Toaster/></MemoryRouter>);
