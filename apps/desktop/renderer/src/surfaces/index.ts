/**
 * Surfaces module — 统一的 Surface 注册与操作入口
 */

export {
  surfaceRegistry,
  getRegistryStorybookTitles,
  getSurfacesByKind,
  getSurfaceByStorybookTitle,
  getSurfaceById,
  getAppSurfaces,
  getStorybookOnlySurfaces,
  getRegistryStats,
  type SurfaceKind,
  type EntryPointType,
  type EntryPoint,
  type SurfaceRegistryItem,
} from "./surfaceRegistry";

export {
  createSurfaceActions,
  type OpenSurfaceParams,
  type SurfaceActionResult,
  type LayoutStoreActions,
  type DialogStoreActions,
  type SurfaceActions,
} from "./openSurface";
