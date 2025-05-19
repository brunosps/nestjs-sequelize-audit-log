import { AxiosRequestConfig, AxiosResponse, AxiosRequestHeaders } from 'axios';

export interface HttpServiceConfig extends AxiosRequestConfig {
  baseURL?: string;
  timeout?: number;
  headers?: AxiosRequestHeaders;
  method?: string;
  url?: string;
  data?: any;
}

// Ensure HttpResponse's config property is compatible
export interface HttpResponse<T = any>
  extends Omit<AxiosResponse<T, any>, 'config'> {
  data: T;
  status: number;
  statusText: string;
  headers: AxiosRequestHeaders; // This is for response headers
  config: HttpServiceConfig; // Use HttpServiceConfig for the request config part
}

export interface HttpError {
  response?: HttpResponse;
  request?: any;
  message: string;
  config: HttpServiceConfig;
  code?: string;
}
