import {useCallback,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import '../../src/index.css';
import AdminLayout from '../../src/layouts/AdminLayout';
import Details from '../../src/pages/products/ProductReadOnlyModal';
import Before from './product-readonly-before';
import {useAuthStore} from '../../src/store/authStore';
import type {Product} from '../../src/types';
useAuthStore.setState({user:{id:'fixture-staff',name:'Test Admin',role:'ADMIN'} as never,status:'authenticated',isAuthenticated:true,loading:false});
const Component=new URLSearchParams(location.search).has('before')?Before:Details;
function Page(){const [open,setOpen]=useState(false);const close=useCallback(()=>setOpen(false),[]);const initial=(window as unknown as {fixtureProduct:Product}).fixtureProduct;return <><button type="button" onClick={()=>setOpen(true)}>Open product details</button>{open&&<Component initial={initial} onClose={close}/>}</>;}
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/admin/products']}><Routes><Route path="/admin" element={<AdminLayout/>}><Route path="products" element={<Page/>}/><Route path="products/:id" element={<p data-testid="edit-route">Existing Edit route</p>}/></Route></Routes></MemoryRouter>);
