import overview from '../../components/mapa todo.png';
import northwest from '../../components/lado esquerdo cima.png';
import northeast from '../../components/lado direito cima.png';
import southwest from '../../components/lado esquerdo baixo.png';
import southeast from '../../components/lado direito baixo.png';

export const MAP_WIDTH = 1853;
export const MAP_HEIGHT = 769;

export type MapImageryLayer = {
  id: string;
  src: string;
  width: number;
  height: number;
  crop: { x: number; y: number; width: number; height: number };
  transform: {
    scaleX: number;
    scaleY: number;
    offsetX: number;
    offsetY: number;
  };
};

/**
 * Original user-supplied captures; no generated geography or resampled assets.
 * Pixel coordinates start at the top-left of the full overview. A source pixel
 * maps to that overview with x = offsetX + scaleX * sourceX (and likewise y).
 * The crop is only a UV/geometry window, keeping all original PNGs untouched.
 * Keep the Google Earth attribution visible in the containing map UI.
 *
 * The four north-up details were aligned using multiscale grayscale template
 * matching, followed by independent x/y least-squares fits of terrain patches.
 * Accepted 58/47/47/45 local patches; median residuals in overview pixels were
 * 0.37/0.19/0.28/0.00, maxima 1.64/0.91/0.89/0.00. The last zero reflects integer
 * template quantization, not survey precision. Labels differ between zoom levels
 * and are not control points. Resolution is approximately 1.78x the overview;
 * these transforms describe image alignment, not surveyed/geographic positions.
 */
export const mapLayers: readonly MapImageryLayer[] = [
  {
    id: 'overview',
    src: overview,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    crop: { x: 20, y: 0, width: 1833, height: 690 },
    transform: { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 },
  },
  {
    id: 'northwest',
    src: northwest,
    width: 1854,
    height: 893,
    crop: { x: 20, y: 45, width: 1834, height: 755 },
    transform: {
      scaleX: 0.5627495062,
      scaleY: 0.5620224528,
      offsetX: 94.40501988,
      offsetY: -3.92468015,
    },
  },
  {
    id: 'northeast',
    src: northeast,
    width: 1837,
    height: 883,
    crop: { x: 20, y: 45, width: 1817, height: 755 },
    transform: {
      scaleX: 0.5626584810,
      scaleY: 0.5617214043,
      offsetX: 649.56709643,
      offsetY: -22,
    },
  },
  {
    id: 'southwest',
    src: southwest,
    width: 1749,
    height: 823,
    crop: { x: 0, y: 0, width: 1749, height: 780 },
    transform: {
      scaleX: 0.5624599192,
      scaleY: 0.5623464536,
      offsetX: 106.72901979,
      offsetY: 220.49318492,
    },
  },
  {
    id: 'southeast',
    src: southeast,
    width: 1498,
    height: 872,
    crop: { x: 20, y: 36, width: 1478, height: 760 },
    transform: {
      scaleX: 0.5627503338,
      scaleY: 0.5619266055,
      offsetX: 881,
      offsetY: 192,
    },
  },
];
