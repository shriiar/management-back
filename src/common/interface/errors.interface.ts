export interface TErrorSource {
    path: string | number;
    message: string;
}


export interface TGenericErrorResponse {
    statusCode: number;
    message: string;
    errorInfo?: any;
    errorSource: TErrorSource[];
    err?: any;
  }