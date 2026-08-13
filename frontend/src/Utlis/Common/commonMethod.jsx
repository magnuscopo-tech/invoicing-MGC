export const setFormInput = (value, field, formData, setFormData) => {
  setFormData({ ...formData, [field]: value });
};

export const setNestedFormInput = (
  value,
  parent,
  field,
  formData,
  setFormData
) => {
  setFormData({
    ...formData,
    [parent]: { ...formData[parent], [field]: value },
  });
};

export const classNames = (...values) => values.filter(Boolean).join(" ");

export const debounce = (callback, delay = 350) => {
  let timer;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
};

export const initialsOf = (value = "") =>
  value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();

export const truncate = (value = "", length = 60) =>
  value.length > length ? `${value.slice(0, length)}…` : value;

// Strips empty strings so partial-update endpoints only receive real changes.
export const compactPayload = (payload) =>
  Object.entries(payload).reduce((accumulator, [key, value]) => {
    if (value === "" || value === undefined || value === null) {
      return accumulator;
    }
    accumulator[key] = value;
    return accumulator;
  }, {});

export const itemsOf = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

export const downloadBlobAsFile = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const safeFileName = (docNumber = "document") =>
  `${docNumber.replace(/\//g, "-")}.pdf`;
