import { html, ref } from "@microsoft/fast-element";
import { AnchoredRegion } from "./anchored-region";
import { unset } from "lodash-es";

export const AnchoredRegionTemplate = html<AnchoredRegion>`
  <template>
      <div
          class="region"
          ${ref("region")}
          style="
              position:relative; 
              left: ${x => x.regionLeft}; 
              right: ${x => x.regionRight}; 
              top: ${x => x.regionTop}; 
              bottom: ${x => x.regionBottom}; 
          "
    >
    <slot></slot>
    </div>
    ${x => x.regionLeft}
    ${x => x.regionRight}
    ${x => x.regionTop}
    ${x => x.regionBottom}
  </template>
`;
