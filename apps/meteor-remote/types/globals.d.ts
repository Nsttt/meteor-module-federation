declare module "*.svg" {
  import type { FC, SVGProps } from "react";
  const Component: FC<SVGProps<SVGSVGElement>>;
  export default Component;
}

/** Rspack's public path for the running chunk's runtime. */
declare const __webpack_public_path__: string;
