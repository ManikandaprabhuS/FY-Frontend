import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route,useLocation} from 'react-router-dom';
import '../../src/index.css';
import AdminLayout from '../../src/layouts/AdminLayout';
import Products from '../../src/pages/products/ProductsPage';
import Before from './products-list-before';
import {useAuthStore} from '../../src/store/authStore';
useAuthStore.setState({user:{id:'fixture-admin',name:'Test Admin',role:'ADMIN'} as any,status:'authenticated',isAuthenticated:true,loading:false});
const q=new URLSearchParams(location.search),Page=q.has('before')?Before:Products;
function Target(){const location=useLocation();return <div data-testid="route-target">{location.pathname}</div>;}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/admin/products']}><Routes><Route path="/admin" element={<AdminLayout/>}><Route path="products" element={<Page/>}/><Route path="products/new" element={<Target/>}/><Route path="products/:id" element={<Target/>}/></Route></Routes></MemoryRouter>);
