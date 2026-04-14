const isLowEnd =
  navigator.hardwareConcurrency <= 4 ||
  /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) ||
  (navigator.deviceMemory && navigator.deviceMemory <= 2)

export function useDeviceCapability() {
  return { isLowEnd, canRender3D: !isLowEnd }
}
