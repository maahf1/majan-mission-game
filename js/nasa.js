// Real NASA satellite images of each mission's target area in Oman, shown in the mission report.
// Images come from NASA GIBS (the service behind NASA Worldview). A saved copy in
// assets/nasa/<mission>_<a|b>.jpg is used first, so the game also works offline at the venue.
const GIBS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';

// bbox = [south, west, north, east] in degrees
export const NASA_IMAGES = {
  aflaj: [
    { key: 'img_aflaj_a', layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', date: '2023-12-12', bbox: [22.4, 57.2, 23.3, 58.8], fmt: 'jpeg' },
    { key: 'img_aflaj_b', layer: 'MODIS_Terra_Land_Surface_Temp_Day', date: '2023-12-12', bbox: [22.4, 57.2, 23.3, 58.8], fmt: 'png' },
  ],
  khareef: [
    { key: 'img_khareef_a', layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', date: '2024-05-10', bbox: [16.6, 53.4, 17.6, 55.2], fmt: 'jpeg' },
    { key: 'img_khareef_b', layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', date: '2024-08-10', bbox: [16.6, 53.4, 17.6, 55.2], fmt: 'jpeg' },
  ],
  dunes: [
    { key: 'img_dunes_a', layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', date: '2023-02-15', bbox: [21.2, 58.2, 22.4, 59.8], fmt: 'jpeg' },
    { key: 'img_dunes_b', layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', date: '2024-01-20', bbox: [21.2, 58.2, 22.4, 59.8], fmt: 'jpeg' },
  ],
};

// Cloud cover measured in the saved NASA image of each target, in the season the mission flies.
// Measured by tools/measure-clouds.mjs: the share of pixels that are bright and nearly colourless.
// The rules use these numbers (rules.js, cloudLoss): cameras cannot see the ground through cloud.
export const CLOUD_COVER = {
  aflaj: { cover: 0.0, date: '2023-12-12', key: 'img_aflaj_a' },
  khareef: { cover: 0.495, date: '2024-08-10', key: 'img_khareef_b' },
  dunes: { cover: 0.008, date: '2024-01-20', key: 'img_dunes_b' },
};

export function gibsUrl({ layer, date, bbox, fmt }, width = 640) {
  const [s, w, n, e] = bbox;
  const height = Math.round((width * (n - s)) / (e - w));
  const q = new URLSearchParams({
    SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.3.0', LAYERS: layer, STYLES: '',
    FORMAT: `image/${fmt}`, TRANSPARENT: 'false', CRS: 'EPSG:4326',
    BBOX: `${s},${w},${n},${e}`, WIDTH: String(width), HEIGHT: String(height), TIME: date,
  });
  return `${GIBS}?${q}`;
}

/** Local copy first, then NASA GIBS. */
export function imageSources(mission) {
  return (NASA_IMAGES[mission] || []).map((img, i) => ({
    ...img,
    local: `assets/nasa/${mission}_${'ab'[i]}.${img.fmt === 'png' ? 'png' : 'jpg'}`,
    remote: gibsUrl(img),
  }));
}
