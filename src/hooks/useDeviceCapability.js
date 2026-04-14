// Only flag truly low-end: 2 or fewer cores AND mobile
const cores = navigator.hardwareConcurrency || 4
const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory <= 1
const isLowEnd = (cores <= 2) || hasLowMemory

export function useDeviceCapability() {
  return { isLowEnd, canRender3D: !isLowEnd, isMobile }
}
