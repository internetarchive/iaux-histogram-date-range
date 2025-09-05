export { default } from 'dayjs/esm';

declare module 'dayjs/esm' {
  // Widening the Dayjs interface so that we can properly extend it via plugin
  interface Dayjs {
    $d: Date;
    parse(cfg: { date: unknown; args: unknown[] }): void;
    init(): void;
  }
}
