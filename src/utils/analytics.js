import { dbOperations } from '@/lib/db';

// Returns [{ name: 'Jan', revenue: 0, expenses: 0 }, ...]
export async function getMonthlyRevenueExpenses(year = new Date().getFullYear()) {
  const months = Array.from({ length: 12 }, (_, i) => ({ name: new Date(year, i, 1).toLocaleString('en', { month: 'short' }), revenue: 0, expenses: 0 }));

  const invoices = await dbOperations.getAll('invoices');
  for (const inv of invoices || []) {
    const d = new Date(inv.date || inv.created_at);
    if (d.getFullYear() !== year) continue;
    const m = d.getMonth();
    months[m].revenue += Number(inv.total || 0);
  }

  const vouchers = await dbOperations.getAll('vouchers');
  for (const v of vouchers || []) {
    const d = new Date(v.date || v.created_at);
    if (d.getFullYear() !== year) continue;
    const m = d.getMonth();
    // Treat payment vouchers as expenses
    if ((v.voucherType || v.type) === 'payment') {
      months[m].expenses += Number(v.amount || 0);
    }
  }

  return months;
}

export async function getExpenseBreakdown(year = new Date().getFullYear()) {
  // Very rough split using vouchers; adapt as needed
  const breakdown = [
    { name: 'Vendors', value: 0 },
    { name: 'Labour', value: 0 },
    { name: 'Suppliers', value: 0 },
  ];

  const vouchers = await dbOperations.getAll('vouchers');
  for (const v of vouchers || []) {
    const d = new Date(v.date || v.created_at);
    if (d.getFullYear() !== year) continue;
    if ((v.voucherType || v.type) !== 'payment') continue;

    if (v.payeeType === 'vendor') breakdown[0].value += Number(v.amount || 0);
    else if (v.payeeType === 'labour') breakdown[1].value += Number(v.amount || 0);
    else if (v.payeeType === 'supplier') breakdown[2].value += Number(v.amount || 0);
  }

  return breakdown;
}
