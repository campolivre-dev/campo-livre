import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { MOBILE_MAP_QUERY } from './mobileMap';
import { MAP_WIDTH, MAP_HEIGHT, mapLayers } from './mapImagery';

export type MapView = '2d' | '3d';
export type MapPosition = readonly [number, number];
export type MapScene = {
  reveal: () => void;
  refresh: () => void;
  pick: (screenX: number, screenY: number) => [number, number] | null;
  zoom: (factor: number) => void;
  rotate: (radians: number) => void;
  reset: () => void;
  setView: (view: MapView) => void;
  focus: (position: MapPosition) => void;
  dispose: () => void;
};

const WIDTH = 200;
const DEPTH = WIDTH * MAP_HEIGHT / MAP_WIDTH;
const world = (position: MapPosition, height = 0) => new THREE.Vector3((position[0] - .5) * WIDTH, height, (position[1] - .5) * DEPTH);
const overview = mapLayers.find(layer => layer.id === 'overview')!;
const bounds = {
  left: overview.crop.x * overview.transform.scaleX + overview.transform.offsetX,
  right: (overview.crop.x + overview.crop.width) * overview.transform.scaleX + overview.transform.offsetX,
  top: overview.crop.y * overview.transform.scaleY + overview.transform.offsetY,
  bottom: (overview.crop.y + overview.crop.height) * overview.transform.scaleY + overview.transform.offsetY,
};
const groundMin = world([bounds.left / MAP_WIDTH, bounds.top / MAP_HEIGHT]);
const groundMax = world([bounds.right / MAP_WIDTH, bounds.bottom / MAP_HEIGHT]);
const groundCenter = groundMin.clone().add(groundMax).multiplyScalar(.5);

type Callbacks = {
  project: (project: (position: MapPosition) => { x: number; y: number; visible: boolean }) => void;
  loaded: (failed: number) => void;
  lost: () => void;
};

export function createMapScene(host: HTMLDivElement, callbacks: Callbacks, initialView: MapView = '3d'): MapScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#111728');
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 1200);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', initialView === '2d' ? 'Mapa 2D da planta: arraste para mover e use dois dedos para ampliar.' : 'Mapa tridimensional da planta: arraste para mover, role para ampliar e use o botão direito para girar.');
  renderer.domElement.setAttribute('role', 'img');
  const controls = new MapControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .12;
  controls.minDistance = 13;
  controls.maxDistance = 330;
  controls.maxPolarAngle = Math.PI * .46;
  controls.minPolarAngle = .03;
  controls.screenSpacePanning = false;
  controls.zoomSpeed = .8;
  const ground = new THREE.Mesh(new THREE.BoxGeometry(groundMax.x - groundMin.x, 1.7, groundMax.z - groundMin.z), new THREE.MeshStandardMaterial({ color: '#211a30', roughness: .95 }));
  ground.position.copy(groundCenter).setY(-.92);
  scene.add(ground);
  scene.add(new THREE.HemisphereLight('#f3f4ff', '#111728', 2.4));
  const sun = new THREE.DirectionalLight('#fff5da', 2.6);
  sun.position.set(-60, 100, 30);
  scene.add(sun);
  const grid = new THREE.GridHelper(600, 60, '#363047', '#211a30');
  grid.position.y = -2;
  scene.add(grid);

  let disposed = false;
  let dirty = true;
  let mode: MapView = initialView;
  controls.enableRotate = mode === '3d';
  let framingOverview = true;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let introAvailable = true;
  let introStart: number | null = null;
  let overviewOffset = new THREE.Vector3();
  function cancelIntro() { introAvailable = false; introStart = null; }

  const textures: THREE.Texture[] = [];
  const loader = new THREE.TextureLoader();

  function plane(points: Array<[number, number]>, height: number, layer: typeof mapLayers[number], texture: THREE.Texture) {
    const positions: number[] = [];
    const uv: number[] = [];
    for (const [x, y] of points) {
      positions.push((x / MAP_WIDTH - .5) * WIDTH, height, (y / MAP_HEIGHT - .5) * DEPTH);
      uv.push((x - layer.transform.offsetX) / layer.transform.scaleX / layer.width, 1 - (y - layer.transform.offsetY) / layer.transform.scaleY / layer.height);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.setIndex([0, 2, 1, 0, 3, 2]);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  }

  const promises = mapLayers.map((layer, index) => new Promise<void>((resolve, reject) => {
    loader.load(layer.src, (texture) => {
      if (disposed) { texture.dispose(); resolve(); return; }
      textures.push(texture);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      const { crop: c, transform: t } = layer;
      const left = Math.max(bounds.left, c.x * t.scaleX + t.offsetX);
      const right = Math.min(bounds.right, (c.x + c.width) * t.scaleX + t.offsetX);
      const top = Math.max(bounds.top, c.y * t.scaleY + t.offsetY);
      const bottom = Math.min(bounds.bottom, (c.y + c.height) * t.scaleY + t.offsetY);
      scene.add(plane([[left, top], [right, top], [right, bottom], [left, bottom]], index * .012, layer, texture));
      dirty = true;
      resolve();
    }, undefined, reject);
  }));

  void Promise.allSettled(promises).then((results) => {
    if (disposed) return;
    dirty = true;
    renderer.render(scene, camera);
    callbacks.loaded(results.filter(result => result.status === 'rejected').length);
  });

  function placeCamera(target: THREE.Vector3, offset: THREE.Vector3) {
    // Consume pending drag/zoom damping before applying a deliberate view change.
    controls.enableDamping = false;
    controls.update();
    controls.target.copy(target);
    camera.position.copy(target).add(offset);
    controls.update();
    controls.enableDamping = true;
    dirty = true;
  }

  function fitOverview() {
    framingOverview = true;
    const direction = (mode === '2d'
      ? new THREE.Vector3(0, 1, .0001)
      : camera.aspect < .85
        ? new THREE.Vector3(.76, .98, .32)
        : new THREE.Vector3(.06, .9, .45)).normalize();
    const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right);
    const tanVertical = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const tanHorizontal = tanVertical * camera.aspect;
    // Fit the overview inside the unobscured screen rectangle. A shifted frustum
    // keeps orbiting/pin projection consistent while the canvas fills the screen.
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    const mobile = window.matchMedia(MOBILE_MAP_QUERY).matches;
    const leftInset = mobile ? 20 : width <= 900 ? 112 : width <= 1200 ? 124 : 136;
    const explorerWidth = width >= 1700 ? 320 : width > 1200 ? 290 : width > 900 ? 270 : 240;
    const rightInset = mobile ? 20 : explorerWidth + (width <= 900 ? 32 : 48);
    const topInset = Math.min(mobile ? width > height ? 76 : 116 : 230, height * .3);
    const bottomInset = Math.min(mobile ? 52 : 220, height * .35);
    const usableWidth = Math.max(width - leftInset - rightInset, width * .25);
    const usableHeight = Math.max(height - topInset - bottomInset, height * .3);
    const centerX = leftInset + usableWidth / 2;
    const centerY = topInset + usableHeight / 2;
    camera.setViewOffset(width, height, width / 2 - centerX, height / 2 - centerY, width, height);
    // A full-width industrial strip becomes unreadably small in portrait.
    // Start closer on phones; drag/pinch and the area explorer reach the rest.
    const portraitZoom = mobile && height > width ? 3.6 : 1;
    const horizontalRoom = usableWidth / width * .98 * portraitZoom;
    const verticalRoom = usableHeight / height * .98;
    let distance = 0;
    // Fit the map and marker projection plane with room for the map UI.
    for (const x of [groundMin.x, groundMax.x]) {
      for (const z of [groundMin.z, groundMax.z]) {
        for (const y of [-1.8, 4]) {
          const point = new THREE.Vector3(x, y, z).sub(groundCenter);
          distance = Math.max(distance,
            Math.abs(point.dot(right)) / (tanHorizontal * horizontalRoom) + point.dot(direction),
            Math.abs(point.dot(up)) / (tanVertical * verticalRoom) + point.dot(direction));
        }
      }
    }
    controls.maxDistance = Math.max(330, distance * 2);
    camera.far = Math.max(1200, controls.maxDistance + WIDTH * 2);
    camera.updateProjectionMatrix();
    overviewOffset = direction.multiplyScalar(distance);
    placeCamera(groundCenter, overviewOffset.clone().multiplyScalar(introAvailable && !reducedMotion.matches ? 1.08 : 1));
  }

  function reset() { cancelIntro(); fitOverview(); }

  let previousLandscape = host.clientWidth > host.clientHeight;
  const observer = new ResizeObserver(() => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    const landscape = width > height;
    // Reframe after rotating a phone even if the user previously panned or zoomed.
    if (landscape !== previousLandscape && window.matchMedia(MOBILE_MAP_QUERY).matches) reset();
    else if (framingOverview) fitOverview();
    previousLandscape = landscape;
    dirty = true;
  });
  observer.observe(host);
  camera.aspect = Math.max(host.clientWidth, 1) / Math.max(host.clientHeight, 1);
  renderer.setSize(host.clientWidth, host.clientHeight);
  fitOverview();
  controls.addEventListener('change', () => { dirty = true; });
  controls.addEventListener('start', () => { cancelIntro(); framingOverview = false; });
  const onContextLost = (event: Event) => { event.preventDefault(); callbacks.lost(); };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  let frame = 0;
  function tick() {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    if (introStart !== null) {
      const progress = reducedMotion.matches ? 1 : Math.min((performance.now() - introStart) / 1000, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      placeCamera(groundCenter, overviewOffset.clone().multiplyScalar(1.08 - .08 * eased));
      if (progress === 1) { introStart = null; introAvailable = false; }
    }
    controls.update();
    // Keep the camera target near the reference instead of losing the plant in empty space.
    const x = THREE.MathUtils.clamp(controls.target.x, groundMin.x, groundMax.x);
    const z = THREE.MathUtils.clamp(controls.target.z, groundMin.z, groundMax.z);
    if (x !== controls.target.x || z !== controls.target.z || controls.target.y !== 0) {
      camera.position.x += x - controls.target.x;
      camera.position.y -= controls.target.y;
      camera.position.z += z - controls.target.z;
      controls.target.set(x, 0, z);
      dirty = true;
    }
    if (!dirty) return;
    renderer.render(scene, camera);
    // Read layout once, before the projection callback writes marker positions.
    const width = host.clientWidth;
    const height = host.clientHeight;
    callbacks.project(position => {
      const p = world(position, 4).project(camera);
      return { x: (p.x + 1) / 2 * width, y: (-p.y + 1) / 2 * height, visible: p.z > -1 && p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05 };
    });
    dirty = false;
  }
  tick();

  const raycaster = new THREE.Raycaster();
  const mapPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  return {
    refresh() { dirty = true; },
    pick(screenX, screenY) {
      if (disposed || !host.clientWidth || !host.clientHeight) return null;
      raycaster.setFromCamera(new THREE.Vector2(screenX / host.clientWidth * 2 - 1, 1 - screenY / host.clientHeight * 2), camera);
      const point = raycaster.ray.intersectPlane(mapPlane, new THREE.Vector3());
      if (!point || point.x < groundMin.x || point.x > groundMax.x || point.z < groundMin.z || point.z > groundMax.z) return null;
      return [THREE.MathUtils.clamp(point.x / WIDTH + .5, 0, 1), THREE.MathUtils.clamp(point.z / DEPTH + .5, 0, 1)];
    },
    reveal() {
      if (!introAvailable || introStart !== null || disposed) return;
      if (reducedMotion.matches) { cancelIntro(); fitOverview(); }
      else introStart = performance.now();
    },
    zoom(factor) {
      cancelIntro();
      framingOverview = false;
      if (!Number.isFinite(factor) || factor <= 0) return;
      const delta = camera.position.clone().sub(controls.target);
      delta.setLength(THREE.MathUtils.clamp(delta.length() * factor, controls.minDistance, controls.maxDistance));
      placeCamera(controls.target.clone(), delta);
    },
    rotate(radians) {
      cancelIntro();
      if (mode === '2d' || !Number.isFinite(radians)) return;
      framingOverview = false;
      const delta = camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), radians);
      placeCamera(controls.target.clone(), delta);
    },
    reset,
    setView(view) { mode = view; controls.enableRotate = view === '3d'; renderer.domElement.setAttribute('aria-label', view === '2d' ? 'Mapa 2D da planta: arraste para mover e use dois dedos para ampliar.' : 'Mapa tridimensional da planta: arraste para mover, role para ampliar e use o botão direito para girar.'); reset(); },
    focus(position) {
      cancelIntro();
      framingOverview = false;
      const target = world(position).clamp(groundMin, groundMax);
      placeCamera(target, mode === '2d' ? new THREE.Vector3(0, 60, .01) : new THREE.Vector3(12, 52, 29));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelIntro();
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      textures.forEach(texture => texture.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
