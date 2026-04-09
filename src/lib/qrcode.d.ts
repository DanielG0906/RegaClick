declare class QRCode {
  constructor(
    el: HTMLElement,
    opts: {
      text: string;
      width?: number;
      height?: number;
      colorDark?: string;
      colorLight?: string;
      correctLevel?: number;
    }
  );
  static CorrectLevel: { L: number; M: number; Q: number; H: number };
}
