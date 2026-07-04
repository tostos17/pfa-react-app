// src/config/errorExtractor.ts

export interface ExtractedError {
  message: string;
  validationErrors?: Record<string, string>;
  code: number;
}

export const extractBackendError = (error: any): ExtractedError => {
  const defaultError: ExtractedError = {
    message: 'An unexpected terminal error occurred.',
    code: 500
  };

  if (!error.response || !error.response.data) {
    return { ...defaultError, message: error.message || defaultError.message };
  }

  const data = error.response.data;

  // Variant 1: Handles your custom structural ApiResponse style (ApiException / 404 handlers)
  if ('success' in data && data.success === false) {
    return {
      message: data.message || 'Execution error encountered.',
      code: data.code || error.response.status
    };
  }

  // Variant 2: Handles the standard ErrorResponse structural wrapper (MethodArgumentNotValidException, etc.)
  return {
    message: data.message || 'Validation constraints failed.',
    validationErrors: data.validationErrors, // Field level error map: { "firstName": "Must not be blank" }
    code: data.status || error.response.status
  };
};