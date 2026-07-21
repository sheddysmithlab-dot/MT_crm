import { useMemo } from 'react';
import useJobsStore from '@/store/jobsStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { amountInWords } from '@/utils/calculations';
import { Trash2 } from 'lucide-react';

const EstimateNewBodyTable = ({ jobId }) => {
    const { jobs, updateEstimateTotals } = useJobsStore();
    const job = jobs[jobId];
    const { items = [], discountAmount, gstRate } = job.estimate;

    const totals = useMemo(() => {
        const subTotal = items.reduce((acc, item) => acc + ((item.qty || 0) * (item.rate || 0)), 0);
        const subTotalLessDiscount = subTotal - discountAmount;
        const totalTax = subTotalLessDiscount * (gstRate / 100);
        const balanceDue = subTotalLessDiscount + totalTax;
        const roundOff = Math.round(balanceDue) - balanceDue;
        return { subTotal, subTotalLessDiscount, totalTax, balanceDue: Math.round(balanceDue), roundOff };
    }, [items, discountAmount, gstRate]);

    return (
        <Card title="Estimate Details">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-left">
                        <tr>
                            {['#', 'Description', 'Qty', 'Unit Price', 'Total'].map(h => <th key={h} className="p-2">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                            const total = (item.qty || 0) * (item.rate || 0);
                            return (
                                <tr key={item.id} className="border-b dark:border-gray-700 even:bg-gray-50 dark:even:bg-gray-800/50">
                                    <td className="p-2">{index + 1}</td>
                                    <td className="p-2 font-medium">{item.description}</td>
                                    <td className="p-2">{item.qty}</td>
                                    <td className="p-2">{item.rate.toLocaleString('en-IN')}</td>
                                    <td className="p-2 font-semibold">{total.toLocaleString('en-IN')}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-6 flex justify-end">
                <div className="w-full max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-dark-text-secondary">Sub-Total:</span><span>{totals.subTotal.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between items-center"><label htmlFor="discount" className="text-gray-600 dark:text-dark-text-secondary">Discount:</label><input type="number" id="discount" value={discountAmount} onChange={e => updateEstimateTotals(jobId, { discountAmount: parseFloat(e.target.value) || 0, gstRate })} className="w-24 p-1 border rounded-lg bg-transparent dark:border-gray-600 text-right focus:ring-2 focus:ring-brand-red"/></div>
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-dark-text-secondary">Sub-Total after Discount:</span><span>{totals.subTotalLessDiscount.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between items-center"><label className="text-gray-600 dark:text-dark-text-secondary">GST:</label><select value={gstRate} onChange={e => updateEstimateTotals(jobId, { discountAmount, gstRate: parseFloat(e.target.value) })} className="form-select text-sm rounded-lg bg-transparent dark:border-gray-600 w-24 focus:ring-2 focus:ring-brand-red"><option value={0}>No GST</option><option value={12}>12%</option><option value={18}>18%</option><option value={28}>28%</option></select></div>
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-dark-text-secondary">Total Tax:</span><span>{totals.totalTax.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-dark-text-secondary">Round Off:</span><span>{totals.roundOff.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2 dark:border-gray-600"><span >Balance Due:</span><span>₹{totals.balanceDue.toLocaleString('en-IN')}</span></div>
                     <div className="text-right text-gray-500 italic pt-2">{amountInWords(totals.balanceDue)} Rupees Only</div>
                </div>
            </div>
        </Card>
    );
};
export default EstimateNewBodyTable;
