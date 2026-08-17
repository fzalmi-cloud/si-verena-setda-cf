import { useState } from 'react';
import { api } from '@/api/client';

export function useLLM() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async (prompt, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const { result } = await api.generateLLM(prompt, options);
      
      // Try to parse JSON if responseJsonSchema was provided
      if (options.responseJsonSchema) {
        try {
          return JSON.parse(result);
        } catch {
          // Try to extract JSON from response
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return result;
        }
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyDocument = async (dokumenId, kategori) => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.request('/api/llm/verify', {
        method: 'POST',
        body: JSON.stringify({ 
          dokumen_id: dokumenId, 
          kategori 
        }),
      });
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getModels = async () => {
    try {
      return await api.request('/api/llm/models');
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { 
    generate, 
    verifyDocument, 
    getModels, 
    loading, 
    error 
  };
}
