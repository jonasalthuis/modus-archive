export interface ModelImage {
    url: string;
    importance: 1 | 2 | 3;
    isStarred: boolean;
    caption?: string;
}

export type ImageGroupMode = "single" | "gallery" | "strip";

// For "strip" (side-by-side) groups: lay images out in a row or a column
export type StripOrientation = "horizontal" | "vertical";

export interface ImageGroup {
    id: string;
    mode: ImageGroupMode;
    images: ModelImage[];
    label?: string;
    /** Only used when mode === "strip" — defaults to "horizontal" */
    orientation?: StripOrientation;
}

// Top-level featured imagery, shown prominently and separate from the content
// image groups. Stored as a map (no array holes) — both slots optional.
export interface FeaturedImages {
    main?: ModelImage;
    secondary?: ModelImage;
}

export interface ModelData {
    id: string;
    isVisible?: boolean;
    modelNumber?: string;
    year?: number;
    title?: string;
    architect?: string;
    scale?: string;
    modelSize?: string;
    materials?: string[];
    tags?: string[];
    photographer?: string;
    notes?: string;
    buildingStatus?: string;
    buildingType?: string;
    modelType?: string;
    location?: string;
    leadMaker?: string;
    provenance?: string;
    voiceNarrative?: string;
    images?: ModelImage[];
    imageGroups?: ImageGroup[];
    /** Featured main (+ optional secondary) imagery — featured[0]=main, featured[1]=secondary */
    featured?: FeaturedImages;
    [key: string]: unknown;
}

export interface CanvasItemLayout {
    id: string;
    x: number;
    y: number;
    rotation: number;
    zIndex: number;
    /** Pinned items don't move when dragged — dragging them pans the canvas instead */
    pinned?: boolean;
}
