import React, { createContext, useContext, useState } from 'react';

const PreviewRoleContext = createContext();

export function PreviewRoleProvider({ children }) {
  const [previewRole, setPreviewRole] = useState(null); // null = tidak preview

  const exitPreview = () => setPreviewRole(null);

  return (
    <PreviewRoleContext.Provider value={{ previewRole, setPreviewRole, exitPreview }}>
      {children}
    </PreviewRoleContext.Provider>
  );
}

export function usePreviewRole() {
  return useContext(PreviewRoleContext);
}