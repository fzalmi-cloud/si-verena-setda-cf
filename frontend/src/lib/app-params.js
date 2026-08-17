// App parameters utility
// Simplified version without base44 dependencies

const getAppParamValue = (paramName, defaultValue = undefined) => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);
  
  if (searchParam) {
    return searchParam;
  }
  
  return defaultValue;
};

export const appParams = {
  getAppParam: getAppParamValue,
};
