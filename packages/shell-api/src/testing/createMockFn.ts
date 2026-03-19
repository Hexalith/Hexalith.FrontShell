export interface MockFn<TArgs extends unknown[] = [], TReturn = void> {
  (...args: TArgs): TReturn;
  calls: TArgs[];
  callCount: number;
  reset: () => void;
}

export function createMockFn<TArgs extends unknown[] = [], TReturn = void>(
  implementation?: (...args: TArgs) => TReturn,
): MockFn<TArgs, TReturn> {
  const fn = ((...args: TArgs) => {
    fn.calls.push(args);
    fn.callCount = fn.calls.length;

    return implementation ? implementation(...args) : (undefined as TReturn);
  }) as MockFn<TArgs, TReturn>;

  fn.calls = [];
  fn.callCount = 0;
  fn.reset = () => {
    fn.calls = [];
    fn.callCount = 0;
  };

  return fn;
}