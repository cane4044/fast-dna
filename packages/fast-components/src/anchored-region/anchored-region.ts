import { attr, FastElement, observable, ref } from "@microsoft/fast-element";
import { isNil } from "lodash-es";

export type AxisPositioningMode =
    | "uncontrolled"
    | "locktodefault"
    | "dynamic"
    | "onetime";

export type HorizontalPosition = "start" | "end" | "left" | "right" | "unset";

export type VerticalPosition = "top" | "bottom" | "unset";

export type ViewportOption = "#parent" | "#document";

export declare class ResizeObserverClassDefinition {
    constructor(callback: ResizeObserverCallback);
    public observe(target: Element): void;
    public unobserve(target: Element): void;
    public disconnect(): void;
}

export declare type ResizeObserverCallback = (
    entries: ResizeObserverEntry[],
    observer: ResizeObserverClassDefinition
) => void;

export interface ContentRect {
    height: number;
    left: number;
    top: number;
    width: number;
}

export declare const contentRect: (target: Element) => Readonly<ContentRect>;

export declare class ResizeObserverEntry {
    public readonly target: Element;
    public readonly contentRect: ContentRect;
    constructor(target: Element);
}

export interface Dimension {
    height: number;
    width: number;
}

enum AnchoredRegionHorizontalPositionLabel {
    left = "left",
    insetLeft = "insetLeft",
    insetRight = "insetRight",
    right = "right",
    undefined = "undefined",
}

enum AnchoredRegionVerticalPositionLabel {
    top = "top",
    insetTop = "insetTop",
    insetBottom = "insetBottom",
    bottom = "bottom",
    undefined = "undefined",
}

/**
 * location enum for transform origin settings
 */
enum Location {
    top = "top",
    left = "left",
    right = "right",
    bottom = "bottom",
}

export class AnchoredRegion extends FastElement {
    @attr
    public anchor: string = "";
    @attr
    public viewport: ViewportOption | string = "#parent";

    @attr({ attribute: "horizontal-positioning-mode" })
    public horizontalPositioningMode: AxisPositioningMode = "uncontrolled";
    @attr({ attribute: "horizontal-default-position" })
    public horizontalDefaultPosition: HorizontalPosition = "unset";
    @attr({ attribute: "horizontal-inset" })
    public horizontalInset: boolean = false;
    @attr({ attribute: "horizontal-threshold" })
    public horizontalThreshold: string = "";
    @attr({ attribute: "horizontal-scaling" })
    public horizontalScaling: boolean = false;

    @attr({ attribute: "vertical-positioning-mode" })
    public verticalPositioningMode: AxisPositioningMode = "uncontrolled";
    @attr({ attribute: "vertical-default-position" })
    public verticalDefaultPosition: VerticalPosition = "unset";
    @attr({ attribute: "vertical-inset" })
    public verticalInset: boolean = false;
    @attr({ attribute: "vertical-threshold" })
    public verticalThreshold: string = "";
    @attr({ attribute: "vertical-scaling" })
    public verticalScaling: boolean = false;

    public horizontalPosition: HorizontalPosition = "unset";
    public verticalPosition: VerticalPosition = "unset";

    private collisionDetector: IntersectionObserver;
    private resizeDetector: ResizeObserverClassDefinition;

    private viewportRect: ClientRect | DOMRect | null = null;
    private positionerDimension: Dimension = { height: 0, width: 0 };

    private openRequestAnimationFrame: number | null = null;

    private anchorTop: number = 0;
    private anchorRight: number = 0;
    private anchorBottom: number = 0;
    private anchorLeft: number = 0;
    private anchorHeight: number = 0;
    private anchorWidth: number = 0;

    private viewportScrollTop: number = 0;
    private viewportScrollLeft: number = 0;

    /**
     * the positions currently being applied to layout
     */
    currentVerticalPosition: AnchoredRegionVerticalPositionLabel;
    currentHorizontalPosition: AnchoredRegionHorizontalPositionLabel;

    /**
     * base offsets between the positioner's base position and the anchor's
     */
    private baseHorizontalOffset: number = 0;
    private baseVerticalOffset: number = 0;

    /**
     * values to be applied to the component's transform origin attribute on render
     */
    // @observable
    private xTransformOrigin: string = Location.left;

    // @observable
    private yTransformOrigin: string = Location.top;

    /**
     * values to be applied to the component's positioning attributes on render
     */
    @observable
    public regionTop: string | null = "0";
    // get topStyle() {
    //     return this.regionTop === null
    //       ? ''
    //       : `top: ${this.regionTop};`;
    //   }

    @observable
    public regionRight: string | null = "0";
    // get rightStyle() {
    //     return this.regionRight === null
    //       ? ''
    //       : `right: ${this.regionRight};`;
    //   }

    @observable
    public regionBottom: string | null = "0";
    // get bottomStyle() {
    //     return this.regionBottom === null
    //       ? ''
    //       : `bottom: ${this.regionBottom};`;
    //   }

    @observable
    public regionLeft: string | null = "0";
    // get leftStyle() {
    //     return this.regionLeft === null
    //       ? ``
    //       : `left: ${this.regionLeft};`;
    //   }

    /**
     * the span in pixels of the selected position on each axis
     */
    horizontalSelectedPositionWidth: number | null = null;
    verticalSelectedPositionHeight: number | null = null;

    /**
     * indicates that an initial positioning pass on layout has completed
     */
    initialLayoutComplete: boolean = false;

    public region: HTMLDivElement;

    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();

        const viewportElement: Element | null = this.getViewport();
        const anchorElement: Element | null = this.getAnchor();

        if (anchorElement === null || viewportElement === null) {
            return;
        }

        this.collisionDetector = new IntersectionObserver(this.handleCollision, {
            root: viewportElement,
            rootMargin: "0px",
            threshold: [0, 1],
        });

        this.collisionDetector.observe(this.region);
        this.collisionDetector.observe(anchorElement);

        this.updateLayout();

        // this.resizeDetector = new (window as WindowWithResizeObserver).ResizeObserver(
        //     this.handleResize
        // );
        // this.resizeDetector.observe(anchorElement);
        // this.resizeDetector.observe(this.rootElement.current);

        viewportElement.addEventListener("scroll", this.handleScroll);
    }

    public disconnectedCallback(): void {
        super.disconnectedCallback();

        const viewportElement: Element | null = this.getViewport();

        // disconnect observers
        this.collisionDetector.disconnect();
        this.resizeDetector.disconnect();

        if (viewportElement !== null) {
            viewportElement.removeEventListener("scroll", this.handleScroll);
        }
    }

    adoptedCallback() {
        //do we need to handle this?
    }

    anchorChanged() {}

    viewportChanged() {}

    positionChanged() {
        // this.dispatchEvent(
        //     new CustomEvent("changed", {
        //         bubbles: false,
        //         composed: true,
        //         detail: "current position",
        //     })
        // );
    }

    private getViewport = (): Element | null => {
        if (document.scrollingElement instanceof HTMLElement) {
            return document.scrollingElement;
        }
        return null;
    };

    private getAnchor = (): HTMLElement | null => {
        return document.getElementById(this.anchor);
    };

    /**
     *  Handle collisions
     */
    private handleCollision = (
        entries: IntersectionObserverEntry[],
        observer: IntersectionObserver
    ): void => {
        let positionerRect: DOMRect | ClientRect | null = null;
        entries.forEach((entry: IntersectionObserverEntry) => {
            if (entry.target === this.region) {
                this.handlePositionerCollision(entry, entries.length === 1);
                positionerRect = entry.boundingClientRect;
            } else {
                this.handleAnchorCollision(entry);
            }
        });
        const viewPortElement: Element | null = this.getViewport();
        if (!isNil(viewPortElement)) {
            this.viewportScrollTop = viewPortElement.scrollTop;
            this.viewportScrollLeft = viewPortElement.scrollLeft;
        }
        if (entries.length === 2 && positionerRect !== null) {
            this.updatePositionerOffset(positionerRect);
        }
        this.requestFrame();
    };

    /**
     *  Update data based on anchor collisions
     */
    private handleAnchorCollision = (anchorEntry: IntersectionObserverEntry): void => {
        this.viewportRect = anchorEntry.rootBounds;
        this.anchorTop = anchorEntry.boundingClientRect.top;
        this.anchorRight = anchorEntry.boundingClientRect.right;
        this.anchorBottom = anchorEntry.boundingClientRect.bottom;
        this.anchorLeft = anchorEntry.boundingClientRect.left;
        this.anchorHeight = anchorEntry.boundingClientRect.height;
        this.anchorWidth = anchorEntry.boundingClientRect.width;
    };

    /**
     *  Update data based on positioner collisions
     */
    private handlePositionerCollision = (
        positionerEntry: IntersectionObserverEntry,
        shouldDeriveAnchorPosition: boolean
    ): void => {
        this.viewportRect = positionerEntry.rootBounds;
        const positionerRect: ClientRect | DOMRect = positionerEntry.boundingClientRect;
        this.positionerDimension = {
            height: positionerRect.height,
            width: positionerRect.width,
        };

        if (shouldDeriveAnchorPosition) {
            switch (this.currentVerticalPosition) {
                case AnchoredRegionVerticalPositionLabel.top:
                    this.anchorTop = positionerRect.bottom;
                    this.anchorBottom = this.anchorTop + this.anchorHeight;
                    break;

                case AnchoredRegionVerticalPositionLabel.insetTop:
                    this.anchorBottom = positionerRect.bottom;
                    this.anchorTop = this.anchorBottom - this.anchorHeight;
                    break;

                case AnchoredRegionVerticalPositionLabel.insetBottom:
                    this.anchorTop = positionerRect.top;
                    this.anchorBottom = this.anchorTop + this.anchorHeight;
                    break;

                case AnchoredRegionVerticalPositionLabel.bottom:
                    this.anchorBottom = positionerRect.top;
                    this.anchorTop = this.anchorBottom - this.anchorHeight;
                    break;
            }

            switch (this.currentHorizontalPosition) {
                case AnchoredRegionHorizontalPositionLabel.left:
                    this.anchorLeft = positionerRect.right;
                    this.anchorRight = this.anchorLeft + this.anchorWidth;
                    break;

                case AnchoredRegionHorizontalPositionLabel.insetLeft:
                    this.anchorRight = positionerRect.right;
                    this.anchorLeft = this.anchorRight - this.anchorWidth;
                    break;

                case AnchoredRegionHorizontalPositionLabel.insetRight:
                    this.anchorLeft = positionerRect.left;
                    this.anchorRight = this.anchorLeft + this.anchorWidth;
                    break;

                case AnchoredRegionHorizontalPositionLabel.right:
                    this.anchorRight = positionerRect.left;
                    this.anchorLeft = this.anchorRight - this.anchorWidth;
                    break;
            }
        }
    };

    /**
     * Request's an animation frame if there are currently no open animation frame requests
     */
    private requestFrame = (): void => {
        if (this.openRequestAnimationFrame === null) {
            this.openRequestAnimationFrame = window.requestAnimationFrame(
                this.updateLayout
            );
        }
    };

    /**
     *  Recalculate layout related state values
     */
    private updateLayout = (): void => {
        this.openRequestAnimationFrame = null;
        // if (
        //     isNil(this.viewportRect) ||
        //     isNil(this.positionerDimension) ||
        //     (this.fixedAfterInitialPlacement && this.state.initialLayoutComplete) ||
        //     (this.state.initialLayoutComplete)
        // ) {
        //     return;
        // }

        if (
            isNil(this.viewportRect) ||
            isNil(this.positionerDimension)
            // (this.fixedAfterInitialPlacement && this.state.initialLayoutComplete) ||
            // (this.state.initialLayoutComplete)
        ) {
            return;
        }

        this.updateForScrolling();

        let desiredVerticalPosition: AnchoredRegionVerticalPositionLabel =
            AnchoredRegionVerticalPositionLabel.undefined;
        let desiredHorizontalPosition: AnchoredRegionHorizontalPositionLabel =
            AnchoredRegionHorizontalPositionLabel.undefined;

        if (this.horizontalPositioningMode !== "uncontrolled") {
            const horizontalOptions: AnchoredRegionHorizontalPositionLabel[] = this.getHorizontalPositioningOptions();
            if (this.horizontalDefaultPosition !== "unset") {
                switch (this.horizontalDefaultPosition) {
                    case "left":
                    case "start":
                        desiredHorizontalPosition = this.horizontalInset
                            ? AnchoredRegionHorizontalPositionLabel.insetLeft
                            : AnchoredRegionHorizontalPositionLabel.left;
                        break;

                    case "right":
                    case "end":
                        desiredHorizontalPosition = this.horizontalInset
                            ? AnchoredRegionHorizontalPositionLabel.insetRight
                            : AnchoredRegionHorizontalPositionLabel.right;
                        break;
                }
            }

            const horizontalThreshold: number =
                this.horizontalThreshold !== undefined
                    ? Number(this.horizontalThreshold)
                    : this.positionerDimension.width;

            if (
                desiredHorizontalPosition ===
                    AnchoredRegionHorizontalPositionLabel.undefined ||
                (!(this.horizontalPositioningMode === "locktodefault") &&
                    this.getAvailableWidth(desiredHorizontalPosition) <
                        horizontalThreshold)
            ) {
                desiredHorizontalPosition =
                    this.getAvailableWidth(horizontalOptions[0]) >
                    this.getAvailableWidth(horizontalOptions[1])
                        ? horizontalOptions[0]
                        : horizontalOptions[1];
            }
        }

        if (this.verticalPositioningMode !== "uncontrolled") {
            const verticalOptions: AnchoredRegionVerticalPositionLabel[] = this.getVerticalPositioningOptions();
            if (this.verticalDefaultPosition !== "unset") {
                switch (this.verticalDefaultPosition) {
                    case "top":
                        desiredVerticalPosition = this.verticalInset
                            ? AnchoredRegionVerticalPositionLabel.insetTop
                            : AnchoredRegionVerticalPositionLabel.top;
                        break;

                    case "bottom":
                        desiredVerticalPosition = this.verticalInset
                            ? AnchoredRegionVerticalPositionLabel.insetBottom
                            : AnchoredRegionVerticalPositionLabel.bottom;
                        break;
                }
            }

            const verticalThreshold: number =
                this.verticalThreshold !== undefined
                    ? Number(this.verticalThreshold)
                    : this.positionerDimension.height;

            if (
                desiredVerticalPosition ===
                    AnchoredRegionVerticalPositionLabel.undefined ||
                (!(this.verticalPositioningMode === "locktodefault") &&
                    this.getAvailableHeight(desiredVerticalPosition) < verticalThreshold)
            ) {
                desiredVerticalPosition =
                    this.getAvailableHeight(verticalOptions[0]) >
                    this.getAvailableHeight(verticalOptions[1])
                        ? verticalOptions[0]
                        : verticalOptions[1];
            }
        }

        const nextPositionerDimension: Dimension = this.getNextRegionDimension(
            desiredHorizontalPosition,
            desiredVerticalPosition
        );

        this.setHorizontalPosition(desiredHorizontalPosition, nextPositionerDimension);

        this.setVerticalPosition(desiredVerticalPosition, nextPositionerDimension);

        this.initialLayoutComplete = true;
    };

    /**
     * Get horizontal positioning state based on desired position
     */
    private setHorizontalPosition = (
        desiredHorizontalPosition: AnchoredRegionHorizontalPositionLabel,
        nextPositionerDimension: Dimension
    ): void => {
        let right: number | null = null;
        let left: number | null = null;
        let xTransformOrigin: string = Location.left;

        switch (desiredHorizontalPosition) {
            case AnchoredRegionHorizontalPositionLabel.left:
                xTransformOrigin = Location.right;
                right = nextPositionerDimension.width - this.baseHorizontalOffset;
                break;

            case AnchoredRegionHorizontalPositionLabel.insetLeft:
                xTransformOrigin = Location.right;
                right =
                    nextPositionerDimension.width -
                    this.anchorWidth -
                    this.baseHorizontalOffset;
                break;

            case AnchoredRegionHorizontalPositionLabel.insetRight:
                xTransformOrigin = Location.left;
                left = this.baseHorizontalOffset;
                break;

            case AnchoredRegionHorizontalPositionLabel.right:
                xTransformOrigin = Location.left;
                left = this.anchorWidth + this.baseHorizontalOffset;
                break;
        }

        this.xTransformOrigin = xTransformOrigin;
        this.regionRight = right === null ? null : `${Math.floor(right).toString()}px`;
        this.regionLeft = left === null ? null : `${Math.floor(left).toString()}px`;
        this.currentHorizontalPosition = desiredHorizontalPosition;
        this.horizontalSelectedPositionWidth = nextPositionerDimension.width;
    };

    /**
     * Get vertical positioning state based on desired position
     */
    private setVerticalPosition = (
        desiredVerticalPosition: AnchoredRegionVerticalPositionLabel,
        nextPositionerDimension: Dimension
    ): void => {
        let top: number | null = null;
        let bottom: number | null = null;
        let yTransformOrigin: string = Location.top;

        switch (desiredVerticalPosition) {
            case AnchoredRegionVerticalPositionLabel.top:
                yTransformOrigin = Location.bottom;
                bottom =
                    nextPositionerDimension.height +
                    this.anchorHeight -
                    this.baseVerticalOffset;
                break;

            case AnchoredRegionVerticalPositionLabel.insetTop:
                yTransformOrigin = Location.bottom;
                bottom = nextPositionerDimension.height - this.baseVerticalOffset;
                break;

            case AnchoredRegionVerticalPositionLabel.insetBottom:
                yTransformOrigin = Location.top;
                top = this.baseVerticalOffset - this.anchorHeight;
                break;

            case AnchoredRegionVerticalPositionLabel.bottom:
                yTransformOrigin = Location.top;
                top = this.baseVerticalOffset;
                break;
        }

        this.yTransformOrigin = yTransformOrigin;
        this.regionTop = top === null ? null : `${Math.floor(top).toString()}px`;
        this.regionBottom = bottom === null ? null : `${Math.floor(bottom).toString()}px`;
        this.currentVerticalPosition = desiredVerticalPosition;
        this.verticalSelectedPositionHeight = nextPositionerDimension.height;
    };

    /**
     *  Update the offset values
     */
    private updatePositionerOffset = (positionerRect: DOMRect | ClientRect): void => {
        if (this.horizontalPositioningMode === "uncontrolled") {
            this.baseHorizontalOffset = this.anchorLeft - positionerRect.left;
        } else {
            switch (this.currentHorizontalPosition) {
                case AnchoredRegionHorizontalPositionLabel.undefined:
                    this.baseHorizontalOffset = this.anchorLeft - positionerRect.left;
                    break;
                case AnchoredRegionHorizontalPositionLabel.left:
                    this.baseHorizontalOffset =
                        this.baseHorizontalOffset +
                        (this.anchorLeft - positionerRect.right);
                    break;
                case AnchoredRegionHorizontalPositionLabel.insetLeft:
                    this.baseHorizontalOffset =
                        this.baseHorizontalOffset +
                        (this.anchorRight - positionerRect.right);
                    break;
                case AnchoredRegionHorizontalPositionLabel.insetRight:
                    this.baseHorizontalOffset =
                        this.baseHorizontalOffset +
                        (this.anchorLeft - positionerRect.left);
                    break;
                case AnchoredRegionHorizontalPositionLabel.right:
                    this.baseHorizontalOffset =
                        this.baseHorizontalOffset +
                        (this.anchorRight - positionerRect.left);
                    break;
            }
        }

        if (this.verticalPositioningMode === "uncontrolled") {
            this.baseVerticalOffset = this.anchorBottom - positionerRect.top;
        } else {
            switch (this.currentVerticalPosition) {
                case AnchoredRegionVerticalPositionLabel.undefined:
                    this.baseVerticalOffset = this.anchorBottom - positionerRect.top;
                    break;
                case AnchoredRegionVerticalPositionLabel.top:
                    this.baseVerticalOffset =
                        this.baseVerticalOffset +
                        (this.anchorTop - positionerRect.bottom);
                    break;
                case AnchoredRegionVerticalPositionLabel.insetTop:
                    this.baseVerticalOffset =
                        this.baseVerticalOffset +
                        (this.anchorBottom + positionerRect.bottom);
                    break;
                case AnchoredRegionVerticalPositionLabel.insetBottom:
                    this.baseVerticalOffset =
                        this.baseVerticalOffset + (this.anchorTop - positionerRect.top);
                    break;
                case AnchoredRegionVerticalPositionLabel.bottom:
                    this.baseVerticalOffset =
                        this.baseVerticalOffset +
                        (this.anchorBottom - positionerRect.top);
                    break;
            }
        }
    };

    /**
     *  Handle scroll events
     */
    private handleScroll = (): void => {
        this.requestFrame();
    };

    /**
     * Check for scroll changes in viewport and adjust position data
     */
    private updateForScrolling = (): void => {
        const viewportElement: Element | null = this.getViewport();

        if (viewportElement === null || isNaN(viewportElement.scrollTop)) {
            return;
        }
        const scrollTop: number = viewportElement.scrollTop;
        const scrollLeft: number = viewportElement.scrollLeft;
        if (this.viewportScrollTop !== scrollTop) {
            const verticalScrollDelta: number = this.viewportScrollTop - scrollTop;
            this.viewportScrollTop = scrollTop;
            this.anchorTop = this.anchorTop + verticalScrollDelta;
            this.anchorBottom = this.anchorBottom + verticalScrollDelta;
        }
        if (this.viewportScrollLeft !== scrollLeft) {
            const horizontalScrollDelta: number = this.viewportScrollLeft - scrollLeft;
            this.viewportScrollLeft = scrollLeft;
            this.anchorLeft = this.anchorLeft + horizontalScrollDelta;
            this.anchorRight = this.anchorRight + horizontalScrollDelta;
        }
    };

    /**
     *  Get available Horizontal positions based on positioning mode
     */
    private getHorizontalPositioningOptions = (): AnchoredRegionHorizontalPositionLabel[] => {
        if (this.horizontalInset) {
            return [
                AnchoredRegionHorizontalPositionLabel.insetLeft,
                AnchoredRegionHorizontalPositionLabel.insetRight,
            ];
        }

        return [
            AnchoredRegionHorizontalPositionLabel.left,
            AnchoredRegionHorizontalPositionLabel.right,
        ];
    };

    /**
     * Get available Vertical positions based on positioning mode
     */
    private getVerticalPositioningOptions = (): AnchoredRegionVerticalPositionLabel[] => {
        if (this.verticalInset) {
            return [
                AnchoredRegionVerticalPositionLabel.insetTop,
                AnchoredRegionVerticalPositionLabel.insetBottom,
            ];
        }

        return [
            AnchoredRegionVerticalPositionLabel.top,
            AnchoredRegionVerticalPositionLabel.bottom,
        ];
    };

    /**
     *  Get the width available for a particular horizontal position
     */
    private getAvailableWidth = (
        positionOption: AnchoredRegionHorizontalPositionLabel
    ): number => {
        if (this.viewportRect !== null) {
            const spaceLeft: number = this.anchorLeft - this.viewportRect.left;
            const spaceRight: number =
                this.viewportRect.right - (this.anchorLeft + this.anchorWidth);

            switch (positionOption) {
                case AnchoredRegionHorizontalPositionLabel.left:
                    return spaceLeft;
                case AnchoredRegionHorizontalPositionLabel.insetLeft:
                    return spaceLeft + this.anchorWidth;
                case AnchoredRegionHorizontalPositionLabel.insetRight:
                    return spaceRight + this.anchorWidth;
                case AnchoredRegionHorizontalPositionLabel.right:
                    return spaceRight;
            }
        }

        return 0;
    };

    /**
     *  Get the height available for a particular vertical position
     */
    private getAvailableHeight = (
        positionOption: AnchoredRegionVerticalPositionLabel
    ): number => {
        if (this.viewportRect !== null) {
            const spaceAbove: number = this.anchorTop - this.viewportRect.top;
            const spaceBelow: number =
                this.viewportRect.bottom - (this.anchorTop + this.anchorHeight);

            switch (positionOption) {
                case AnchoredRegionVerticalPositionLabel.top:
                    return spaceAbove;
                case AnchoredRegionVerticalPositionLabel.insetTop:
                    return spaceAbove + this.anchorHeight;
                case AnchoredRegionVerticalPositionLabel.insetBottom:
                    return spaceBelow + this.anchorHeight;
                case AnchoredRegionVerticalPositionLabel.bottom:
                    return spaceBelow;
            }
        }
        return 0;
    };

    /**
     * Get region dimensions for next render
     */
    private getNextRegionDimension = (
        desiredHorizontalPosition: AnchoredRegionHorizontalPositionLabel,
        desiredVerticalPosition: AnchoredRegionVerticalPositionLabel
    ): Dimension => {
        const newPositionerDimension: Dimension = {
            height: this.positionerDimension.height,
            width: this.positionerDimension.width,
        };

        if (this.horizontalScaling) {
            newPositionerDimension.width = Math.max(
                Math.min(
                    this.getAvailableWidth(desiredHorizontalPosition),
                    isNil(this.viewportRect) ? 0 : this.viewportRect.width
                ),
                isNil(this.horizontalThreshold) ? 0 : Number(this.horizontalThreshold)
            );
        }

        if (this.verticalScaling) {
            newPositionerDimension.height = Math.max(
                Math.min(
                    this.getAvailableHeight(desiredVerticalPosition),
                    isNil(this.viewportRect) ? 0 : this.viewportRect.height
                ),
                isNil(this.verticalThreshold) ? 0 : Number(this.verticalThreshold)
            );
        }

        return newPositionerDimension;
    };
}
