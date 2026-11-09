import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { AdminReview } from '../services/review.service';
import { getOrderStatusStyle } from '../components/ui/order-status';
import { formatReportDate } from './revenue-report-pdf';
export function createReviewsPdf(data: { reviews: AdminReview[]; generatedAt: string; filters: Record<string, unknown> }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'FrameYaad Reviews & Ratings', creator: 'FrameYaad' });
  doc.setFont('helvetica','bold').setFontSize(18).setTextColor('#111827').text('FrameYaad Reviews & Ratings',14,20);
  doc.setFont('helvetica','normal').setFontSize(8);
  doc.text('Generated: ' + formatReportDate(data.generatedAt) + ' ' + new Date(data.generatedAt).toLocaleTimeString('en-IN'),14,28);
  const filters = Object.entries(data.filters).filter(([,value]) => value !== undefined && value !== '').map(([key,value]) => key + ': ' + (typeof value === 'string' || typeof value === 'number' ? String(value) : '')).join(' | ');
  const lines: string[] = doc.splitTextToSize(filters || 'All reviews',269);
  doc.text(lines,14,34);
  autoTable(doc,{
    startY: 38 + lines.length * 4, margin:{left:14,right:14,top:14,bottom:18}, theme:'striped', showHead:'everyPage', rowPageBreak:'avoid',
    head:[['Reviewer','Product','Rating','Review','Verified','Date','Status']],
    body:data.reviews.length ? data.reviews.map(review => [review.name + '\n' + review.email,review.product.productName,review.rating + '/5',(review.title ? review.title + '\n' : '') + review.comment,review.verifiedPurchase ? 'Yes' : 'No',formatReportDate(review.createdAt),review.status]) : [[{content:'No reviews match the selected filters',colSpan:7,styles:{halign:'center',cellPadding:8}}]],
    styles:{font:'helvetica',fontSize:8,cellPadding:3,overflow:'linebreak',valign:'top',textColor:'#111827',lineWidth:0.15,lineColor:'#e5e7eb'},
    headStyles:{fillColor:'#111827',textColor:'#ffffff',fontStyle:'bold'},
    columnStyles:{0:{cellWidth:46},1:{cellWidth:43},2:{cellWidth:16,halign:'center'},3:{cellWidth:96},4:{cellWidth:20},5:{cellWidth:24},6:{cellWidth:24}},
    didParseCell:cell=>{if(cell.section==='body'&&cell.column.index===6&&data.reviews[cell.row.index]){const style=getOrderStatusStyle(data.reviews[cell.row.index].status);cell.cell.styles.fillColor=style.backgroundColor;cell.cell.styles.textColor=style.color;cell.cell.styles.fontStyle='bold';}},
  });
  const pages=doc.getNumberOfPages();for(let page=1;page<=pages;page++){doc.setPage(page);doc.setFont('helvetica','normal').setFontSize(8).setTextColor('#6b7280').text('Page '+page+' of '+pages,283,202,{align:'right'});}
  return doc;
}
