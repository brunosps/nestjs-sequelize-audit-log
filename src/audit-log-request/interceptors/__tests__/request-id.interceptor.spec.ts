import { of } from 'rxjs';

import { RequestIdInterceptor } from '../request-id.interceptor';

describe('RequestIdInterceptor', () => {
  let interceptor: RequestIdInterceptor;

  beforeEach(() => {
    interceptor = new RequestIdInterceptor();
  });

  it('should set X-Request-Id header on response', (done) => {
    const mockRequest = { headers: {} };
    const mockResponse = {
      setHeader: jest.fn(),
    };
    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };
    const mockHandler: any = {
      handle: () => of('result'),
    };

    const result$ = interceptor.intercept(mockContext, mockHandler);
    result$.subscribe({
      next: (value) => {
        expect(value).toBe('result');
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'X-Request-Id',
          expect.any(String),
        );
      },
      complete: () => done(),
    });
  });

  it('should use existing x-request-id from request headers', (done) => {
    const mockRequest = { headers: { 'x-request-id': 'existing-id' } };
    const mockResponse = { setHeader: jest.fn() };
    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };
    const mockHandler: any = {
      handle: () => of('result'),
    };

    const result$ = interceptor.intercept(mockContext, mockHandler);
    result$.subscribe({
      next: () => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'X-Request-Id',
          'existing-id',
        );
      },
      complete: () => done(),
    });
  });

  it('should handle null response gracefully', (done) => {
    const mockRequest = { headers: {} };
    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => null,
      }),
    };
    const mockHandler: any = {
      handle: () => of('result'),
    };

    const result$ = interceptor.intercept(mockContext, mockHandler);
    result$.subscribe({
      next: (val) => expect(val).toBe('result'),
      complete: () => done(),
    });
  });

  describe('static methods', () => {
    it('should return undefined context when not in ALS', () => {
      expect(RequestIdInterceptor.getContext()).toBeUndefined();
      expect(RequestIdInterceptor.getRequestId()).toBeUndefined();
    });
  });
});
