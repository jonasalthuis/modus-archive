// Shared types for the archive "universe" experience (3 view modes).

// Two top-level modes. "explore" is the floating universe; when a grouping
// attribute other than "none" is chosen it becomes the clustered view.
export type ViewMode = "explore" | "grid";

export type Vec3 = [number, number, number];

export interface UniverseImage {
    url: string;
    isStarred?: boolean;
    importance?: number;
}

// A model as needed by the canvas + grouping/filtering. Loaded from ma_models.
export interface UniverseModel {
    id: string;
    modelNumber?: string;
    title?: string;
    architect?: string;
    leadMaker?: string;
    year?: number;
    scale?: string;
    modelType?: string;
    buildingType?: string;
    buildingStatus?: string;
    materials?: string[];
    location?: string;
    images?: UniverseImage[];
}

// Attributes the user can cluster ("group by") on. "none" = no clustering,
// i.e. the free-floating universe.
export type GroupAttr =
    | "none"
    | "architect"
    | "leadMaker"
    | "modelType"
    | "buildingType"
    | "buildingStatus"
    | "decade"
    | "scale"
    | "material"
    | "location"
    | "dossier";

export interface Cluster {
    key: string;
    label: string;
    center: Vec3;
    count: number;
}

// Filters driven by the grid-mode header controls. Applied in every mode.
export interface Filters {
    text: string;
    modelType: string | null;
    buildingType: string | null;
    buildingStatus: string | null;
    scales: string[]; // selected raw scale strings, e.g. ["1:200", "1:500"]
}

export const EMPTY_FILTERS: Filters = {
    text: "",
    modelType: null,
    buildingType: null,
    buildingStatus: null,
    scales: [],
};
