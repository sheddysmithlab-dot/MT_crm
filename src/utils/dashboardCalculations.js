// Lightweight, defensive calculations used by the Dashboard page.
// These implementations intentionally favor safety over perfect accuracy so
// the dashboard doesn't crash when data is missing or stored as JSON strings.

function safeParse(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}

export function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function normalizeJobs(jobs) {
  if (!jobs) return [];
  if (Array.isArray(jobs)) return jobs;
  return Object.values(jobs);
}

export function calculateJobStats(jobsInput) {
  const jobs = normalizeJobs(jobsInput);
  const total = jobs.length;
  let completed = 0;
  let inProgress = 0;
  let pendingApprovals = 0;

  for (const j of jobs) {
    const status = (j.status || '').toLowerCase();
    if (status === 'completed') completed += 1;
    else if (status && status !== 'cancelled') inProgress += 1;

    const estimate = j.estimate || safeParse(j.estimate_data) || j.estimate_data;
    if (estimate && (estimate.approvalNeeded || estimate.approval_needed)) pendingApprovals += 1;
  }

  return {
    total,
    completed,
    inProgress,
    pendingApprovals
  };
}

export function calculateRevenue(jobsInput) {
  const jobs = normalizeJobs(jobsInput);
  let total = 0;
  for (const j of jobs) {
    const invoice = safeParse(j.invoice_data) || j.invoice_data || j.invoice;
    if (invoice && typeof invoice === 'object' && (invoice.total_amount || invoice.totalAmount)) {
      total += Number(invoice.total_amount || invoice.totalAmount) || 0;
      continue;
    }

    // fallback to any total_amount property on job
    total += Number(j.total_amount || j.total) || 0;
  }
  return total;
}

export function calculateExpenses(jobsInput, laboursInput, vendorsInput, suppliersInput) {
  const jobs = normalizeJobs(jobsInput);
  let total = 0;

  for (const j of jobs) {
    const jobsheet = safeParse(j.jobsheet_data) || j.jobsheet_data;
    if (jobsheet && Array.isArray(jobsheet.items)) {
      for (const item of jobsheet.items) {
        const cost = Number(item.cost || item.amount || 0) || 0;
        const mult = Number(item.multiplier || item.quantity || 1) || 1;
        total += cost * mult;
      }
    }

    // also consider extraWork which some jobsheets use
    if (jobsheet && Array.isArray(jobsheet.extraWork)) {
      for (const item of jobsheet.extraWork) {
        const cost = Number(item.cost || item.amount || 0) || 0;
        const mult = Number(item.multiplier || item.quantity || 1) || 1;
        total += cost * mult;
      }
    }
  }

  // as a defensive fallback, don't try to pull ledger entries from stores here.
  return total;
}

export function calculateMonthlyRevenue(jobsInput) {
  const jobs = normalizeJobs(jobsInput);
  // create 12 months (Jan..Dec)
  const months = Array.from({ length: 12 }, (_, i) => ({ name: new Date(0, i).toLocaleString('default', { month: 'short' }), revenue: 0, expenses: 0 }));

  for (const j of jobs) {
    const invoice = safeParse(j.invoice_data) || j.invoice_data || j.invoice;
    const dateStr = (invoice && (invoice.invoice_date || invoice.invoiceDate)) || j.job_date || j.jobDate || j.created_at || j.date;
    const amount = (invoice && (Number(invoice.total_amount || invoice.totalAmount) || 0)) || Number(j.total_amount || j.total) || 0;
    let dt = null;
    if (dateStr) dt = new Date(dateStr);
    if (!dt || Number.isNaN(dt.getTime())) {
      // skip if invalid
      continue;
    }
    const monthIdx = dt.getMonth();
    months[monthIdx].revenue += amount;
    // expenses estimation: reuse jobsheet costs as expenses
    const jobsheet = safeParse(j.jobsheet_data) || j.jobsheet_data;
    if (jobsheet && Array.isArray(jobsheet.items)) {
      for (const item of jobsheet.items) {
        months[monthIdx].expenses += Number(item.cost || item.amount || 0) * (Number(item.multiplier || item.quantity || 1) || 1);
      }
    }
  }

  return months;
}

export function calculateExpenseBreakdown(jobsInput, laboursInput, vendorsInput) {
  const jobs = normalizeJobs(jobsInput);
  const breakdown = { Labour: 0, Vendor: 0, Parts: 0 };

  for (const j of jobs) {
    const jobsheet = safeParse(j.jobsheet_data) || j.jobsheet_data;
    if (!jobsheet) continue;
    const items = jobsheet.items || [];
    for (const it of items) {
      const cost = Number(it.cost || it.amount || 0) || 0;
      const qty = Number(it.multiplier || it.quantity || 1) || 1;
      if (it.workBy === 'Labour' || (it.labourId && !it.vendorId)) breakdown.Labour += cost * qty;
      else if (it.workBy === 'Vendor' || it.vendorId) breakdown.Vendor += cost * qty;
      else breakdown.Parts += cost * qty;
    }
  }

  return Object.keys(breakdown).map(k => ({ name: k, value: breakdown[k] }));
}
