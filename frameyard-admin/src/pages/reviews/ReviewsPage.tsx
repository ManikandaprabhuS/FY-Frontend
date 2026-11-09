import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Download, Eye, Star, Trash2, X } from 'lucide-react';
import DataTable from '../../components/tables/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PaginationControls from '../../components/ui/PaginationControls';
import StatusBadge from '../../components/ui/StatusBadge';
import ReviewStars from '../../components/reviews/ReviewStars';
import { reviewService, type AdminReview, type ReviewAdminData, type ReviewFilters } from '../../services/review.service';
import { getApiErrorMessage } from '../../services/api';
import { showError, showLoading, showSuccess, showWarning } from '../../utils/toast';
import { invalidateReviewRating } from '../../store/reviewRatingStore';
import { useAuthStore } from '../../store/authStore';
const empty: ReviewAdminData = { reviews: [], pagination: { page:1,limit:20,total:0,totalPages:0 }, summary:{total:0,pending:0,approved:0,rejected:0,average:0} };
const headers = ['Reviewer','Product','Rating','Review','Verified','Date','Status','Actions'].map(label=>({key:label,label}));
const control = 'min-h-11 min-w-0 rounded-lg border border-outline-variant bg-white px-3 text-sm text-black outline-none focus:ring-2 focus:ring-black/15';
export default function ReviewsPage() {
  const [params,setParams] = useSearchParams();
  const reviewId = params.get('reviewId') || undefined;
  const [data,setData] = useState(empty), [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [search,setSearch] = useState(''), [debounced,setDebounced] = useState(''), [page,setPage] = useState(1), [revision,setRevision] = useState(0);
  const [filters,setFilters] = useState<ReviewFilters>({dateFilter:'all'});
  const [productSearch,setProductSearch] = useState(''), [products,setProducts] = useState<Array<{id:string;productName:string}>>([]);
  const [selected,setSelected] = useState<AdminReview|null>(null), [reject,setReject] = useState<AdminReview|null>(null), [reason,setReason] = useState(''), [deleting,setDeleting] = useState<AdminReview|null>(null);
  const [busy,setBusy] = useState<Record<string,boolean>>({}), [exporting,setExporting] = useState(false);
  const mutationVersion = useRef(0), locks=useRef(new Set<string>()), exportLock=useRef(false);
  const query = JSON.stringify({...filters,search:debounced||undefined,id:reviewId});
  useEffect(()=>{const timer=setTimeout(()=>{setDebounced(search.trim());setPage(1);},350);return()=>clearTimeout(timer);},[search]);
  useEffect(()=>{
    let active=true;const version=mutationVersion.current;
    const timer=setTimeout(()=>{setLoading(true);void reviewService.adminList(JSON.parse(query) as ReviewFilters,page).then(result=>{
      if(active&&version===mutationVersion.current){setData(result);setError('');}
    }).catch(failure=>{if(active)setError(getApiErrorMessage(failure,'Could not load reviews.'));}).finally(()=>{if(active)setLoading(false);});},0);
    return()=>{active=false;clearTimeout(timer);};
  },[query,page,revision]);
  useEffect(()=>{
    let active=true;const timer=setTimeout(()=>{void reviewService.products(productSearch.trim()).then(result=>{if(active)setProducts(result);}).catch(()=>{if(active)setProducts([]);});},300);
    return()=>{active=false;clearTimeout(timer);};
  },[productSearch]);
  const changeFilter=(key:keyof ReviewFilters,value:string)=>{setFilters(current=>({...current,[key]:value||undefined}));setPage(1);};
  const finish=(id:string)=>{locks.current.delete(id);setBusy(current=>{const next={...current};delete next[id];return next;});mutationVersion.current++;setRevision(v=>v+1);};
  const moderate=async(review:AdminReview,status:'APPROVED'|'REJECTED')=>{
    if(locks.current.has(review.id))return;
    if(status === "REJECTED" && (reason.length>500||/<\/?[a-z][^>]*>/i.test(reason))){showWarning('Use plain text, up to 500 characters, for the rejection reason.');return;}
    locks.current.add(review.id);setBusy(current=>({...current,[review.id]:true}));mutationVersion.current++;
    const actor=useAuthStore.getState().user;
    setData(current=>({...current,reviews:current.reviews.map(row=>row.id===review.id?{...row,status,reviewedAt:new Date().toISOString(),reviewedBy:actor?{id:actor.id,name:actor.name,role:actor.role}:null}:row)}));
    const id='review-action:'+review.id;showLoading('Please wait, your review decision is being saved...',id);
    try{
      const updated=await reviewService.moderate(review.id,status,status==='REJECTED'?reason.trim():undefined);
      setData(current=>({...current,reviews:current.reviews.map(row=>row.id===updated.id?updated:row)}));
      setSelected(current=>current?.id===updated.id?updated:current);invalidateReviewRating(review.productId);
      setReject(null);setReason('');showSuccess(status==='APPROVED'?'Review approved':'Review rejected',{id});
    }catch(failure){
      setData(current=>({...current,reviews:current.reviews.map(row=>row.id===review.id?review:row)}));
      showError(getApiErrorMessage(failure,'Review could not be updated.'),{id});
    }finally{finish(review.id);}
  };
  const remove=async(review:AdminReview)=>{
    if(locks.current.has(review.id))return;
    locks.current.add(review.id);setBusy(current=>({...current,[review.id]:true}));mutationVersion.current++;
    const index=data.reviews.findIndex(row=>row.id===review.id);
    setData(current=>({...current,reviews:current.reviews.filter(row=>row.id!==review.id)}));
    const id='review-action:'+review.id;showLoading('Please wait, your review is being deleted...',id);
    try{await reviewService.remove(review.id);invalidateReviewRating(review.productId);setSelected(current=>current?.id===review.id?null:current);showSuccess('Review deleted',{id});}
    catch(failure){setData(current=>{const rows=[...current.reviews];if(!rows.some(row=>row.id===review.id))rows.splice(Math.max(0,index),0,review);return{...current,reviews:rows};});showError(getApiErrorMessage(failure,'Review could not be deleted.'),{id});}
    finally{finish(review.id);}
  };
  const exportReport=async()=>{
    if(exportLock.current)return;exportLock.current=true;setExporting(true);const id='review-export';showLoading('Please wait, your report is being generated...',id);
    try{
      const report=await reviewService.export(JSON.parse(query) as ReviewFilters);
      if(!report.reviews.length){showWarning('No reviews match the selected filters',{id});return;}
      const {createReviewsPdf}=await import('../../utils/reviews-pdf');createReviewsPdf(report).save('frameyaad-reviews-'+new Date().toISOString().slice(0,10)+'.pdf');
      showSuccess('Reviews export downloaded successfully',{id});
    }catch(failure){showError(getApiErrorMessage(failure,'Reviews could not be exported.'),{id});}
    finally{exportLock.current=false;setExporting(false);}
  };
  const actions=(review:AdminReview)=><div className="flex flex-wrap items-center gap-1"><button aria-label={'View review by '+review.name} onClick={()=>setSelected(review)} className="grid h-10 w-10 place-items-center rounded hover:bg-black/5"><Eye className="h-4 w-4"/></button>{review.status!=='APPROVED'&&<button disabled={busy[review.id]} aria-label={'Approve review by '+review.name} onClick={()=>void moderate(review,'APPROVED')} className="grid h-10 w-10 place-items-center rounded text-green-700 hover:bg-green-50 disabled:opacity-40"><Check className="h-4 w-4"/></button>}{review.status!=='REJECTED'&&<button disabled={busy[review.id]} aria-label={'Reject review by '+review.name} onClick={()=>{setReject(review);setReason('');}} className="grid h-10 w-10 place-items-center rounded text-red-700 hover:bg-red-50 disabled:opacity-40"><X className="h-4 w-4"/></button>}<button disabled={busy[review.id]} aria-label={'Delete review by '+review.name} onClick={()=>setDeleting(review)} className="grid h-10 w-10 place-items-center rounded text-red-700 hover:bg-red-50 disabled:opacity-40"><Trash2 className="h-4 w-4"/></button></div>;
  const reviewer=(review:AdminReview)=><div className="flex items-center gap-2"><span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/5 font-bold">{review.name.slice(0,1).toUpperCase()}</span><div className="min-w-0"><p className="break-words text-sm font-bold">{review.name}</p><p className="break-all text-xs text-on-surface-variant">{review.email}</p></div></div>;
  const content=(review:AdminReview)=><div className="max-w-xs"><p className="line-clamp-2 text-xs font-semibold">{review.title}</p><p className="line-clamp-2 text-xs text-on-surface-variant">{review.comment}</p><button onClick={()=>setSelected(review)} className="min-h-9 text-xs font-bold underline">View full</button></div>;
  const rows=data.reviews.filter(row=>!filters.status||row.status===filters.status);
  return <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Reviews & Ratings</h1><p className="mt-1 text-sm text-on-surface-variant">Review customer feedback before it appears on the storefront.</p></div><button disabled={exporting||loading||debounced!==search.trim()} onClick={()=>void exportReport()} className={control+' inline-flex items-center gap-2 font-bold disabled:opacity-50'}><Download className="h-4 w-4"/>{exporting?'Generating…':'Export PDF'}</button></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[['Total reviews',data.summary.total],['Pending',data.summary.pending],['Approved',data.summary.approved],['Rejected',data.summary.rejected],['Average rating',data.summary.average?data.summary.average.toFixed(1):'—']].map(([label,value])=><div key={label} className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-on-surface-variant">{label}</p><p className="mt-2 flex items-center gap-2 text-2xl font-bold">{label==='Average rating'&&<Star className="h-5 w-5 text-amber-600"/>}{value}</p>{label==='Average rating'&&<p className="mt-1 text-[10px] text-on-surface-variant">Approved reviews only</p>}</div>)}</div>
    <div className="grid gap-3 rounded-xl border border-outline-variant bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
      <input aria-label="Search reviews" placeholder="Reviewer, email, or product…" value={search} onChange={e=>setSearch(e.target.value)} className={control}/>
      <select aria-label="Review status" value={filters.status||''} onChange={e=>changeFilter('status',e.target.value)} className={control}><option value="">All statuses</option>{['PENDING','APPROVED','REJECTED'].map(value=><option key={value}>{value}</option>)}</select>
      <select aria-label="Star rating" value={filters.rating||''} onChange={e=>changeFilter('rating',e.target.value)} className={control}><option value="">All ratings</option>{[5,4,3,2,1].map(value=><option key={value} value={value}>{value} stars</option>)}</select>
      <select aria-label="Date range" value={filters.dateFilter||'all'} onChange={e=>changeFilter('dateFilter',e.target.value)} className={control}><option value="all">All time</option><option value="today">Today</option><option value="7">Last 7 Days</option><option value="30">Last 30 Days</option><option value="90">Last 90 Days</option></select>
      <input aria-label="Find a product" placeholder="Find a product…" value={productSearch} onChange={e=>setProductSearch(e.target.value)} className={control}/>
      <select aria-label="Product filter" value={filters.productId||''} onChange={e=>changeFilter('productId',e.target.value)} className={control}><option value="">All products</option>{filters.productId&&!products.some(product=>product.id===filters.productId)&&<option value={filters.productId}>Selected product</option>}{products.map(product=><option key={product.id} value={product.id}>{product.productName}</option>)}</select>
      <label className="text-xs font-semibold">From<input type="date" value={filters.from||''} onChange={e=>changeFilter('from',e.target.value)} className={control+' mt-1 w-full'}/></label>
      <label className="text-xs font-semibold">To<input type="date" value={filters.to||''} onChange={e=>changeFilter('to',e.target.value)} className={control+' mt-1 w-full'}/></label>
      <button onClick={()=>{setFilters({dateFilter:'all'});setSearch('');setDebounced('');setProductSearch('');setPage(1);setParams({});}} className="min-h-11 text-left text-xs font-bold underline">Clear filters{reviewId?' (including selected review)':''}</button>
    </div>
    {error&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}<button onClick={()=>setRevision(v=>v+1)} className="ml-2 min-h-10 font-bold underline">Retry</button></div>}
    <DataTable headers={headers} items={rows} loading={loading&&!data.reviews.length} emptyTitle="No reviews found" emptyMessage="No reviews match the selected filters."
      renderRow={review=><tr key={review.id} className="border-b border-outline-variant/50"><td className="p-4">{reviewer(review)}</td><td className="p-4 text-xs font-semibold">{review.product.productName}</td><td className="p-4"><ReviewStars rating={review.rating}/></td><td className="p-4">{content(review)}</td><td className="p-4 text-xs font-bold text-green-700">{review.verifiedPurchase?'Verified':'—'}</td><td className="whitespace-nowrap p-4 text-xs">{new Date(review.createdAt).toLocaleDateString('en-GB')}</td><td className="p-4"><StatusBadge status={review.status}/></td><td className="p-3">{actions(review)}</td></tr>}
      renderCard={review=><article key={review.id} className="space-y-3 rounded-xl border border-outline-variant bg-white p-4">{reviewer(review)}<p className="text-sm font-bold">{review.product.productName}</p><div className="flex flex-wrap items-center justify-between gap-2"><ReviewStars rating={review.rating}/><StatusBadge status={review.status}/></div>{content(review)}<p className="text-xs">{new Date(review.createdAt).toLocaleDateString('en-GB')}{review.verifiedPurchase?' · Verified purchase':''}</p>{actions(review)}</article>}/>
    <PaginationControls pagination={data.pagination} busy={loading} onPageChange={setPage}/>
    <Modal isOpen={Boolean(selected)} onClose={()=>setSelected(null)} title="Review details">{selected&&<div className="space-y-4">{reviewer(selected)}<p className="font-bold">{selected.product.productName}</p><ReviewStars rating={selected.rating}/><StatusBadge status={selected.status}/>{selected.title&&<h3 className="break-words font-bold">{selected.title}</h3>}<p className="whitespace-pre-wrap break-words text-sm leading-6">{selected.comment}</p><p className="text-xs">{selected.verifiedPurchase?'Verified purchase':'Purchase not verified (review submission is open to everyone)'}</p><p className="text-xs">Submitted: {new Date(selected.createdAt).toLocaleString('en-GB')}</p><p className="text-xs">Reviewed by: {selected.reviewedBy?.name||'—'}{selected.reviewedAt?' · '+new Date(selected.reviewedAt).toLocaleString('en-GB'):''}</p>{selected.rejectionReason&&<p className="break-words text-sm">Rejection reason: {selected.rejectionReason}</p>}{actions(selected)}</div>}</Modal>
    <Modal isOpen={Boolean(reject)} onClose={()=>setReject(null)} title="Reject review"><label className="block text-sm font-bold">Reason (optional)<textarea maxLength={500} rows={4} value={reason} onChange={e=>setReason(e.target.value)} className={control+' mt-2 w-full py-2'}/></label><p className="mt-1 text-right text-xs">{reason.length}/500</p><button disabled={Boolean(reject&&busy[reject.id])} onClick={()=>{if(reject)void moderate(reject,'REJECTED');}} className="mt-4 min-h-11 rounded-lg bg-black px-4 text-sm font-bold text-white disabled:opacity-50">Confirm rejection</button></Modal>
    <ConfirmDialog isOpen={Boolean(deleting)} onClose={()=>setDeleting(null)} onConfirm={()=>{if(deleting)void remove(deleting);}} title="Delete review?" message="This permanently deletes this review and removes it from public ratings." confirmText="Delete review"/>
  </div>;
}
