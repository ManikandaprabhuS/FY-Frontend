import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { getOrderStatusStyle, orderStatusLabel } from '../components/ui/order-status';

export interface RevenueReportItem { productId?: string | null; productIdentifier?: string | null; productName?: string; frameSize?: string; colorName?: string | null; colorHex?: string | null; material?: string | null; quantity: number; price: number | string; subtotal?: number | string }
export interface RevenueReportOrder {
  refundStatus?:string|null;refundInitiatedAt?:string|null;refundCompletedAt?:string|null;excludedFromRevenue?:boolean;
  photoDeleted?:boolean;
  photoUploaded?: boolean; photoFileName?: string|null;
  orderItems?: RevenueReportItem[];
  createdAt: string;
  orderNumber: string;
  user?: { name?: string | null; email?: string | null; phoneNumber?: string | null } | null;
  address?: string; paymentStatus?: string; paymentMethod?: string; exportCoupon?: string; subtotal?: number; discount?: number;
  orderStatus: string;
  totalAmount: number | string;
}
export interface RevenueReportData {
  range: string;
  generatedAt: Date;
  totalRevenue: number;
  paidActiveOrders: number;
  averageOrderValue: number;
  orders: RevenueReportOrder[];
  logo?: Uint8Array;
}
export const formatReportAmount = (value: number | string) => 'INR ' + Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatReportDate = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : [date.getDate(), date.getMonth() + 1, date.getFullYear()].map((part, index) => index < 2 ? String(part).padStart(2, '0') : String(part)).join('/');
};

export function createRevenueReportPdf(data: RevenueReportData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'FrameYaad Revenue Report', subject: data.range, creator: 'FrameYaad' });
  const margin = 14;
  if (data.logo) doc.addImage(data.logo, 'JPEG', margin, 13, 12, 12);
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor('#111827');
  doc.text('FrameYaad Revenue Report', data.logo ? 30 : margin, 21);
  doc.setFont('helvetica', 'normal').setFontSize(9);
  const rangeLines = doc.splitTextToSize('Range: ' + data.range, 182);
  doc.text(rangeLines, margin, 32);
  const generatedY = 32 + rangeLines.length * 4.5;
  doc.text('Generated: ' + formatReportDate(data.generatedAt) + ' ' + data.generatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }), margin, generatedY);
  let summaryBottom = generatedY + 25;
  autoTable(doc, {
    startY: generatedY + 6, margin: { left: margin, right: margin }, theme: 'grid',
    head: [['Total revenue', 'Paid/active orders', 'Average order value']],
    body: [[formatReportAmount(data.totalRevenue), String(data.paidActiveOrders), formatReportAmount(data.averageOrderValue)]],
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3, textColor: '#111827', lineColor: '#d1d5db', lineWidth: 0.2 },
    headStyles: { fillColor: '#f3f4f6', textColor: '#111827', fontStyle: 'bold' },
    bodyStyles: { fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 182 / 3 }, 1: { cellWidth: 182 / 3 }, 2: { cellWidth: 182 / 3 } },
    didDrawPage: ({ cursor }) => { if (cursor) summaryBottom = cursor.y; },
  });
  const tableStart = summaryBottom + 8;
  let ordersBottom = tableStart;
  autoTable(doc, {
    startY: tableStart, margin: { top: 16, bottom: 20, left: margin, right: margin },
    head: [['Date', 'Order ID', 'Customer', 'Status', 'Amount (INR)']],
    body: data.orders.length ? data.orders.map(order => [
      formatReportDate(order.createdAt), order.orderNumber, order.user?.name || 'Unknown Customer',
      orderStatusLabel(order.orderStatus)+(order.orderStatus==="CANCELLED"?" (excluded from revenue)":""), formatReportAmount(order.totalAmount),
    ]) : [[{ content: 'No orders found for this range', colSpan: 5, styles: { halign: 'center', cellPadding: 8 } }]],
    foot: [[{ content: 'Total', colSpan: 4, styles: { halign: 'right' } }, { content: formatReportAmount(data.totalRevenue), styles: { halign: 'right' } }]],
    showHead: 'everyPage', showFoot: 'lastPage', rowPageBreak: 'avoid', theme: 'striped',
    didDrawPage: ({ cursor }) => { if (cursor) ordersBottom = cursor.y; },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, overflow: 'linebreak', valign: 'middle', textColor: '#111827', lineColor: '#e5e7eb', lineWidth: 0.15 },
    headStyles: { fillColor: '#111827', textColor: '#ffffff', fontStyle: 'bold' },
    footStyles: { fillColor: '#f3f4f6', textColor: '#111827', fontStyle: 'bold' },
    alternateRowStyles: { fillColor: '#f9fafb' },
    columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 37 }, 2: { cellWidth: 53 }, 3: { cellWidth: 34 }, 4: { cellWidth: 33, halign: 'right' } },
    didParseCell: cell => {
      if (cell.section === 'body' && cell.column.index === 3 && data.orders[cell.row.index]) {
        const colors = getOrderStatusStyle(data.orders[cell.row.index].orderStatus);
        cell.cell.styles.textColor = colors.color;
        cell.cell.styles.fillColor = colors.backgroundColor;
        cell.cell.styles.fontStyle = 'bold';
      }
      if (cell.section === 'head' && cell.column.index === 4) cell.cell.styles.halign = 'right';
    },
  });
  if (data.orders.some(order => order.photoUploaded !== undefined)) {
    if (ordersBottom > 230) { doc.addPage(); ordersBottom = 12; }
    autoTable(doc, {
      startY: ordersBottom + 9, margin: { left: margin, right: margin, top: 16, bottom: 20 },
      head: [['Order ID', 'Photo uploaded', 'Customer photo file name']],
      body: data.orders.map(order => [order.orderNumber, order.photoDeleted?'Deleted':order.photoUploaded ? 'Yes' : 'No', order.photoFileName || '-']),
      theme: 'grid', showHead: 'everyPage', rowPageBreak: 'avoid',
      headStyles: { fillColor: '#111827', textColor: '#ffffff', fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak', textColor: '#111827' },
      columnStyles: { 0: {cellWidth: 40}, 1: {cellWidth: 32}, 2: {cellWidth: 110} },
      didDrawPage: ({cursor}) => {if(cursor) ordersBottom = cursor.y;},
    });
  }
  if (data.orders.some(order => order.address !== undefined)) {
    if (ordersBottom > 230) { doc.addPage(); ordersBottom = 12; }
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor('#111827');
    doc.text('Order customer and payment details', margin, ordersBottom + 9);
    autoTable(doc, {
      startY: ordersBottom + 13, margin: { left: margin, right: margin, top: 16, bottom: 20 },
      head: [['Order / Date', 'Customer / Contact', 'Address', 'Payment / Coupon', 'Subtotal / Discount / Total']],
      body: data.orders.map(order => [order.orderNumber + '\n' + formatReportDate(order.createdAt), [order.user?.name || '-', order.user?.email || '-', order.user?.phoneNumber || '-'].join('\n'), order.address || '-', 'Status: ' + (order.paymentStatus || '-') + '\nMethod: ' + (order.paymentMethod || '-') + '\nCoupon: ' + (order.exportCoupon || '-'), 'Subtotal: ' + formatReportAmount(order.subtotal ?? order.totalAmount) + '\nDiscount: ' + formatReportAmount(order.discount ?? 0) + '\nTotal: ' + formatReportAmount(order.totalAmount)]),
      theme: 'grid', rowPageBreak: 'avoid', showHead: 'everyPage',
      styles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak', valign: 'middle', textColor: '#111827', lineColor: '#e5e7eb', lineWidth: 0.15 },
      headStyles: { fillColor: '#111827', textColor: '#ffffff', fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 40 }, 2: { cellWidth: 42 }, 3: { cellWidth: 34 }, 4: { cellWidth: 38, halign: 'right' } },
      didDrawPage: ({ cursor }) => { if (cursor) ordersBottom = cursor.y; },
    });
  }
  if(data.orders.some(o=>o.orderStatus==="CANCELLED"||o.refundStatus)){
    if(ordersBottom>230){doc.addPage();ordersBottom=12;}
    autoTable(doc,{startY:ordersBottom+8,margin:{left:margin,right:margin,top:16,bottom:20},head:[['Order ID','Refund status','Initiated','Completed','Revenue']],
      body:data.orders.map(o=>[o.orderNumber,o.refundStatus??'-',o.refundInitiatedAt?formatReportDate(o.refundInitiatedAt):'-',o.refundCompletedAt?formatReportDate(o.refundCompletedAt):'-',o.orderStatus==='CANCELLED'?'Excluded from revenue':'Included']),
      styles:{fontSize:8,cellPadding:3},headStyles:{fillColor:'#111827',textColor:'#ffffff'},showHead:'everyPage',rowPageBreak:'avoid',
      didDrawPage:({cursor})=>{if(cursor)ordersBottom=cursor.y;}
    });
  }
  const itemRows = data.orders.flatMap(order => (order.orderItems ?? []).map(item => ({ ...item, orderNumber: order.orderNumber })));
  if (itemRows.length) {
    if (ordersBottom > 235) { doc.addPage(); ordersBottom = 12; }
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor('#111827');
    doc.text('Order item details', margin, ordersBottom + 9);
    autoTable(doc, {
      startY: ordersBottom + 13, margin: { left: margin, right: margin, top: 16, bottom: 20 },
      head: [['Order ID', 'Product / ID', 'Size', 'Color', 'Material', 'Qty', 'Unit (INR)', 'Line total']],
      body: itemRows.map(item => [item.orderNumber, (item.productName || '-') + '\nProduct ID: ' + (item.productId || item.productIdentifier || '-'), item.frameSize || '-', item.colorName || '-', item.material || '-', String(item.quantity), formatReportAmount(item.price), formatReportAmount(item.subtotal ?? Number(item.price) * item.quantity)]),
      theme: 'grid', rowPageBreak: 'avoid', showHead: 'everyPage',
      styles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak', valign: 'middle', lineColor: '#e5e7eb', lineWidth: 0.15, textColor: '#111827' },
      headStyles: { fillColor: '#111827', textColor: '#ffffff', fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 23 }, 1: { cellWidth: 38 }, 2: { cellWidth: 17 }, 3: { cellWidth: 22, cellPadding: { left: 7, right: 2, top: 2.5, bottom: 2.5 } }, 4: { cellWidth: 24 }, 5: { cellWidth: 10 }, 6: { cellWidth: 24, halign: 'right' }, 7: { cellWidth: 24, halign: 'right' } },
      didDrawCell: cell => { const hex = itemRows[cell.row.index]?.colorHex; if (cell.section === 'body' && cell.column.index === 3 && hex && /^#[a-f0-9]{6}$/i.test(hex)) { doc.setFillColor(hex).setDrawColor('#9ca3af'); doc.rect(cell.cell.x + 2.5, cell.cell.y + cell.cell.height / 2 - 1.2, 2.4, 2.4, 'FD'); } },
    });
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor('#6b7280');
    doc.text('Page ' + page + ' of ' + pages, 196, 286, { align: 'right' });
  }
  return doc;
}
