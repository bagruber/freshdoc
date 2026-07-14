// Minimale Typen für paged.js (liefert keine eigenen).
declare module "pagedjs" {
  export class Previewer {
    preview(
      content?: string | HTMLElement,
      stylesheets?: string[],
      renderTo?: HTMLElement,
    ): Promise<{ total: number }>;
  }
}
