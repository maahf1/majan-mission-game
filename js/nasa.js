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

// ---------------------------------------------------------------------------
// Live sky: cloud cover measured, in the browser, in NASA's image of any day since 2000
// ---------------------------------------------------------------------------
const SAVED_COVER = JSON.parse(JSON.stringify(CLOUD_COVER));
/** The cover measured in the saved season image (what the game uses with no internet). */
export const savedCloud = (region) => SAVED_COVER[region];
/** Use a cover measured live for this region (for this page only). */
export function setCloudCover(region, cover, date) {
  if (!SAVED_COVER[region]) return;
  CLOUD_COVER[region] = { ...SAVED_COVER[region], cover, date, live: true };
}
export function resetCloudCover(region) {
  if (SAVED_COVER[region]) CLOUD_COVER[region] = { ...SAVED_COVER[region] };
}

/** NASA's true-colour MODIS image of a mission's region on a date (YYYY-MM-DD), from NASA GIBS. */
export function skyUrl(region, date, width = 640) {
  const list = NASA_IMAGES[region] || [];
  const ref = list.find((x) => x.key === SAVED_COVER[region]?.key) || list[0];
  return gibsUrl({ layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', date, bbox: ref.bbox, fmt: 'jpeg' }, width);
}

/**
 * Cloud cover in an image, the way tools/measure-clouds.mjs measured the saved images: a pixel
 * is cloud when it is bright and nearly colourless (the darkest of its three colours is above
 * 165 and the colours differ by less than 45). empty = share of pixels with no data (black:
 * the gaps between the satellite's passes). cover is the cloudy share of the pixels with data.
 */
export function measureCloud(img) {
  const W = 320, H = 180;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  const px = g.getImageData(0, 0, W, H).data;
  let cloud = 0, empty = 0;
  for (let i = 0; i < px.length; i += 4) {
    const lo = Math.min(px[i], px[i + 1], px[i + 2]);
    const hi = Math.max(px[i], px[i + 1], px[i + 2]);
    if (lo > 165 && hi - lo < 45) cloud++;
    else if (hi < 4) empty++;
  }
  const n = W * H;
  return { cover: cloud / Math.max(1, n - empty), empty: empty / n };
}

/** Asks NASA GIBS for the image of a day and measures it. Rejects when there is no answer. */
export function liveSky(region, date) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => reject(new Error('timeout')), 15000);
    img.onload = () => {
      clearTimeout(timer);
      try { resolve({ ...measureCloud(img), date, img, url: img.src }); } catch (e) { reject(e); }
    };
    img.onerror = () => { clearTimeout(timer); reject(new Error('no answer')); };
    img.src = skyUrl(region, date);
  });
}
/** A past day's date in UTC. Today's image is not complete until the satellite has passed. */
export const yesterday = (back = 1) => new Date(Date.now() - back * 86400000).toISOString().slice(0, 10);
