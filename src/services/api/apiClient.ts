export type ApiResponse<TData> = {
  data: TData;
  status: number;
};

export async function mockRequest<TData>(data: TData, status = 200): Promise<ApiResponse<TData>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data, status });
    }, 300);
  });
}
