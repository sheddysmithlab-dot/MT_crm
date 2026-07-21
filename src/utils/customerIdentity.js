export const normalizeCustomerName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const normalizeCustomerPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length > 10 ? digits.slice(-10) : digits;
};

export const getCustomerPhoneCandidates = (customer) => {
  const rawValues = [
    customer?.phone,
    customer?.mobile,
    customer?.contact_no,
    customer?.contactNo,
    customer?.customer_phone,
  ];

  return [...new Set(rawValues.map(normalizeCustomerPhone).filter(Boolean))];
};

export const findCustomerByIdentity = (customers, { customerId, name, phone }) => {
  if (customerId) {
    const directMatch = customers.find((customer) => String(customer.id) === String(customerId));
    if (directMatch) {
      return { customer: directMatch, matchType: 'id' };
    }
  }

  const normalizedPhone = normalizeCustomerPhone(phone);
  if (normalizedPhone) {
    const phoneMatch = customers.find((customer) =>
      getCustomerPhoneCandidates(customer).includes(normalizedPhone)
    );
    if (phoneMatch) {
      return { customer: phoneMatch, matchType: 'phone' };
    }
  }

  const normalizedName = normalizeCustomerName(name);
  if (normalizedName) {
    const nameMatch = customers.find(
      (customer) => normalizeCustomerName(customer?.name) === normalizedName
    );
    if (nameMatch) {
      return { customer: nameMatch, matchType: 'name' };
    }
  }

  return { customer: null, matchType: null };
};

export const buildCustomerIdentityPatch = (customer, { name, phone, matchType }) => {
  const patch = {};
  const nextName = String(name || '').trim();
  const nextPhone = String(phone || '').trim();
  const normalizedNextName = normalizeCustomerName(nextName);
  const normalizedCurrentName = normalizeCustomerName(customer?.name);
  const currentPhones = getCustomerPhoneCandidates(customer);

  if (
    nextName &&
    normalizedNextName &&
    (
      !normalizedCurrentName ||
      (matchType === 'phone' && normalizedCurrentName !== normalizedNextName)
    )
  ) {
    patch.name = nextName;
  }

  if (nextPhone && currentPhones.length === 0) {
    patch.phone = nextPhone;
  }

  return patch;
};

export const createCustomerPayloadFromIdentity = ({ name, phone }) => {
  const safeName = String(name || phone || 'Customer').trim();

  return {
    name: safeName,
    phone: String(phone || '').trim(),
    address: '',
    gstin: '',
    type: 'customer',
    credit_limit: 0,
    credit_days: 30,
    opening_balance: 0,
  };
};
