import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Sparkles,
  RotateCw,
  Maximize2,
  Minimize2,
  BookOpen,
  Feather,
  Globe,
  Compass,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';

export type SceneMode = 'codex' | 'quill' | 'cosmos';

interface ThreeLiterarySceneProps {
  initialMode?: SceneMode;
  heightClass?: string;
  showControls?: boolean;
  interactive?: boolean;
  onClose?: () => void;
  isModal?: boolean;
}

export const ThreeLiteraryScene: React.FC<ThreeLiterarySceneProps> = ({
  initialMode = 'codex',
  heightClass = 'h-[440px] sm:h-[520px]',
  showControls = true,
  interactive = true,
  onClose,
  isModal = false
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activeSceneMode, setActiveSceneMode] = useState<SceneMode>(initialMode);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isVibrantParticles, setIsVibrantParticles] = useState(true);

  // References for live animation loop control
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const activeGroupRef = useRef<THREE.Group | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const runesParticlesRef = useRef<THREE.Points | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const reqIdRef = useRef<number | null>(null);

  // Mouse interaction state
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, isDragging: false, lastMouseX: 0, lastMouseY: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // 2. Cinematic 3-Point Lighting
    const ambientLight = new THREE.AmbientLight(0x0a1428, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x06b6d4, 3.2); // Cyan Key Light
    keyLight.position.set(4, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd946ef, 2.6); // Fuchsia Rim Light
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    const goldPointLight = new THREE.PointLight(0xf59e0b, 2.8, 12); // Amber Solar Core Light
    goldPointLight.position.set(0, 0.5, 1.8);
    scene.add(goldPointLight);

    // 3. Floating Stardust Particles
    const particleCount = 450;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const colorPalette = [
      new THREE.Color(0x06b6d4), // Cyan
      new THREE.Color(0xd946ef), // Fuchsia
      new THREE.Color(0xf59e0b), // Amber
      new THREE.Color(0xe0e7ff)  // Pale starlight
    ];

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      particlePositions[idx] = (Math.random() - 0.5) * 14;
      particlePositions[idx + 1] = (Math.random() - 0.5) * 8;
      particlePositions[idx + 2] = (Math.random() - 0.5) * 8;

      const col = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      particleColors[idx] = col.r;
      particleColors[idx + 1] = col.g;
      particleColors[idx + 2] = col.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    // 4. Build Active 3D Scene Group based on mode
    const buildSceneObject = (mode: SceneMode): THREE.Group => {
      const rootGroup = new THREE.Group();

      if (mode === 'codex') {
        // ==========================================
        // SCENE 1: THE ILLUMINATED CODEX (3D BOOK & MANUSCRIPT)
        // ==========================================
        const bookGroup = new THREE.Group();

        // Leather Cover Backing (Dark Sapphire Blue with Gold Edges)
        const coverMat = new THREE.MeshStandardMaterial({
          color: 0x0a1226,
          roughness: 0.35,
          metalness: 0.65,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.08
        });

        const goldFiligreeMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.25,
          metalness: 0.95,
          emissive: 0xd97706,
          emissiveIntensity: 0.2
        });

        const paperMat = new THREE.MeshStandardMaterial({
          color: 0xfdfbf7,
          roughness: 0.85,
          metalness: 0.05
        });

        // Left Cover
        const leftCoverGeom = new THREE.BoxGeometry(1.4, 0.08, 1.9);
        const leftCover = new THREE.Mesh(leftCoverGeom, coverMat);
        leftCover.position.set(-0.72, 0, 0);
        leftCover.rotation.z = THREE.MathUtils.degToRad(-12);
        bookGroup.add(leftCover);

        // Right Cover
        const rightCoverGeom = new THREE.BoxGeometry(1.4, 0.08, 1.9);
        const rightCover = new THREE.Mesh(rightCoverGeom, coverMat);
        rightCover.position.set(0.72, 0, 0);
        rightCover.rotation.z = THREE.MathUtils.degToRad(12);
        bookGroup.add(rightCover);

        // Book Spine (Cylinder)
        const spineGeom = new THREE.CylinderGeometry(0.12, 0.12, 1.9, 16);
        const spine = new THREE.Mesh(spineGeom, goldFiligreeMat);
        spine.rotation.x = Math.PI / 2;
        spine.position.set(0, -0.05, 0);
        bookGroup.add(spine);

        // Pages Block Left
        const leftPagesGeom = new THREE.BoxGeometry(1.3, 0.14, 1.78);
        const leftPages = new THREE.Mesh(leftPagesGeom, paperMat);
        leftPages.position.set(-0.68, 0.08, 0);
        leftPages.rotation.z = THREE.MathUtils.degToRad(-8);
        bookGroup.add(leftPages);

        // Pages Block Right
        const rightPagesGeom = new THREE.BoxGeometry(1.3, 0.14, 1.78);
        const rightPages = new THREE.Mesh(rightPagesGeom, paperMat);
        rightPages.position.set(0.68, 0.08, 0);
        rightPages.rotation.z = THREE.MathUtils.degToRad(8);
        bookGroup.add(rightPages);

        // Golden Corner Protectors
        for (let i = -1; i <= 1; i += 2) {
          for (let j = -1; j <= 1; j += 2) {
            const cornerGeom = new THREE.BoxGeometry(0.2, 0.1, 0.2);
            const corner = new THREE.Mesh(cornerGeom, goldFiligreeMat);
            corner.position.set(i * 1.35, 0, j * 0.9);
            bookGroup.add(corner);
          }
        }

        // Bookmark Ribbon (Fuchsia / Purple)
        const ribbonMat = new THREE.MeshStandardMaterial({
          color: 0xd946ef,
          roughness: 0.4,
          metalness: 0.3,
          emissive: 0xd946ef,
          emissiveIntensity: 0.35
        });
        const ribbonGeom = new THREE.BoxGeometry(0.08, 0.02, 1.2);
        const ribbon = new THREE.Mesh(ribbonGeom, ribbonMat);
        ribbon.position.set(0.1, 0.18, 0.3);
        ribbon.rotation.x = THREE.MathUtils.degToRad(18);
        bookGroup.add(ribbon);

        // Floating Illuminated Text Leaf fluttering in the breeze
        const flutteringPageGeom = new THREE.PlaneGeometry(1.2, 1.6, 8, 8);
        const flutteringPageMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.6,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide
        });
        const flutteringPage = new THREE.Mesh(flutteringPageGeom, flutteringPageMat);
        flutteringPage.name = 'flutterPage';
        flutteringPage.position.set(0.4, 0.35, 0);
        flutteringPage.rotation.x = -Math.PI / 2 + 0.1;
        flutteringPage.rotation.z = -0.2;
        bookGroup.add(flutteringPage);

        // Glowing Orbiting Literary Halo Ring
        const haloGeom = new THREE.TorusGeometry(1.8, 0.02, 16, 64);
        const haloMat = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.9,
          roughness: 0.2
        });
        const halo = new THREE.Mesh(haloGeom, haloMat);
        halo.name = 'haloRing';
        halo.rotation.x = Math.PI / 3;
        bookGroup.add(halo);

        bookGroup.position.set(0, -0.2, 0);
        rootGroup.add(bookGroup);
      } else if (mode === 'quill') {
        // ==========================================
        // SCENE 2: THE CELESTIAL GOLDEN QUILL & INKWELL
        // ==========================================
        const quillGroup = new THREE.Group();

        // Inkwell Base (Crystal / Deep Glass)
        const inkwellGeom = new THREE.CylinderGeometry(0.55, 0.7, 0.5, 24);
        const inkwellMat = new THREE.MeshPhysicalMaterial({
          color: 0x070c1e,
          roughness: 0.1,
          transmission: 0.7,
          thickness: 0.6,
          ior: 1.5,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.2
        });
        const inkwell = new THREE.Mesh(inkwellGeom, inkwellMat);
        inkwell.position.set(0, -1.0, 0);
        quillGroup.add(inkwell);

        // Golden Lip Ring on Inkwell
        const lipGeom = new THREE.TorusGeometry(0.56, 0.05, 16, 32);
        const goldMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          metalness: 0.9,
          roughness: 0.2,
          emissive: 0xd97706,
          emissiveIntensity: 0.25
        });
        const lip = new THREE.Mesh(lipGeom, goldMat);
        lip.rotation.x = Math.PI / 2;
        lip.position.set(0, -0.75, 0);
        quillGroup.add(lip);

        // Undulating Liquid Ink Surface inside the well
        const inkSurfaceGeom = new THREE.CircleGeometry(0.48, 24);
        const inkSurfaceMat = new THREE.MeshStandardMaterial({
          color: 0x030712,
          roughness: 0.05,
          metalness: 0.8,
          emissive: 0x2563eb,
          emissiveIntensity: 0.15
        });
        const inkSurface = new THREE.Mesh(inkSurfaceGeom, inkSurfaceMat);
        inkSurface.rotation.x = -Math.PI / 2;
        inkSurface.position.set(0, -0.76, 0);
        quillGroup.add(inkSurface);

        // The Floating Golden Quill Pen
        const penShaft = new THREE.Group();
        penShaft.name = 'penShaft';

        // 1. Pointed Golden Nib (Cone)
        const nibGeom = new THREE.ConeGeometry(0.08, 0.35, 12);
        const nib = new THREE.Mesh(nibGeom, goldMat);
        nib.position.set(0, 0, 0);
        penShaft.add(nib);

        // 2. Metallic Ferrule
        const ferruleGeom = new THREE.CylinderGeometry(0.09, 0.07, 0.3, 16);
        const ferrule = new THREE.Mesh(ferruleGeom, goldMat);
        ferrule.position.set(0, 0.3, 0);
        penShaft.add(ferrule);

        // 3. Central Calamus / Spine
        const calamusGeom = new THREE.CylinderGeometry(0.05, 0.07, 2.2, 16);
        const calamusMat = new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          roughness: 0.3,
          metalness: 0.3
        });
        const calamus = new THREE.Mesh(calamusGeom, calamusMat);
        calamus.position.set(0, 1.45, 0);
        penShaft.add(calamus);

        // 4. Feather Vane Barbs (Layered Wing Shapes)
        const featherMat = new THREE.MeshPhysicalMaterial({
          color: 0xf1f5f9,
          roughness: 0.4,
          metalness: 0.2,
          transmission: 0.4,
          thickness: 0.2,
          emissive: 0xd946ef,
          emissiveIntensity: 0.15,
          side: THREE.DoubleSide
        });

        // Left Vane
        const leftVaneGeom = new THREE.PlaneGeometry(0.45, 1.6, 6, 6);
        const leftVane = new THREE.Mesh(leftVaneGeom, featherMat);
        leftVane.position.set(-0.24, 1.65, 0);
        leftVane.rotation.z = 0.12;
        penShaft.add(leftVane);

        // Right Vane
        const rightVaneGeom = new THREE.PlaneGeometry(0.35, 1.5, 6, 6);
        const rightVane = new THREE.Mesh(rightVaneGeom, featherMat);
        rightVane.position.set(0.18, 1.65, 0);
        rightVane.rotation.z = -0.1;
        penShaft.add(rightVane);

        // Tilt and position pen hovering delicately
        penShaft.rotation.z = -0.42;
        penShaft.rotation.x = 0.25;
        penShaft.position.set(0.2, -0.4, 0);
        quillGroup.add(penShaft);

        // Glowing Ink Ripple Rings hovering around the nib
        const rippleGeom = new THREE.RingGeometry(0.15, 0.2, 32);
        const rippleMat = new THREE.MeshBasicMaterial({
          color: 0x06b6d4,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide
        });
        const ripple = new THREE.Mesh(rippleGeom, rippleMat);
        ripple.name = 'rippleRing';
        ripple.rotation.x = Math.PI / 2;
        ripple.position.set(0.12, -0.68, 0.05);
        quillGroup.add(ripple);

        rootGroup.add(quillGroup);
      } else {
        // ==========================================
        // SCENE 3: THE TRILINGUAL COSMOS & ASTROLABE
        // ==========================================
        const cosmosGroup = new THREE.Group();

        // Central Luminous Literary Core (Sphere)
        const coreGeom = new THREE.SphereGeometry(0.65, 32, 32);
        const coreMat = new THREE.MeshStandardMaterial({
          color: 0x0a1936,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.8,
          roughness: 0.2,
          metalness: 0.8
        });
        const core = new THREE.Mesh(coreGeom, coreMat);
        cosmosGroup.add(core);

        // Orbiting Astrolabe Dial Rings
        const ringMaterialCyan = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.6,
          metalness: 0.9,
          roughness: 0.1
        });

        const ringMaterialAmber = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xd97706,
          emissiveIntensity: 0.5,
          metalness: 0.9,
          roughness: 0.1
        });

        const ringMaterialFuchsia = new THREE.MeshStandardMaterial({
          color: 0xd946ef,
          emissive: 0xd946ef,
          emissiveIntensity: 0.5,
          metalness: 0.9,
          roughness: 0.1
        });

        // Latitude Ring 1 (Arabic Gateway)
        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.03, 16, 64), ringMaterialAmber);
        ring1.name = 'cosmosRing1';
        ring1.rotation.x = Math.PI / 3;
        cosmosGroup.add(ring1);

        // Latitude Ring 2 (Malayalam Gateway)
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.03, 16, 64), ringMaterialCyan);
        ring2.name = 'cosmosRing2';
        ring2.rotation.y = Math.PI / 4;
        ring2.rotation.x = -Math.PI / 6;
        cosmosGroup.add(ring2);

        // Latitude Ring 3 (English Gateway)
        const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.03, 16, 64), ringMaterialFuchsia);
        ring3.name = 'cosmosRing3';
        ring3.rotation.z = Math.PI / 5;
        cosmosGroup.add(ring3);

        // Orbiting Satellite Nodes for the 3 Languages
        const languages = [
          { name: 'ar', color: 0xf59e0b, dist: 1.2, speed: 1.0 },
          { name: 'ml', color: 0x06b6d4, dist: 1.5, speed: 0.75 },
          { name: 'en', color: 0xd946ef, dist: 1.85, speed: 0.55 }
        ];

        languages.forEach((lang, i) => {
          const satGeom = new THREE.SphereGeometry(0.12, 16, 16);
          const satMat = new THREE.MeshStandardMaterial({
            color: lang.color,
            emissive: lang.color,
            emissiveIntensity: 1.2,
            metalness: 0.5,
            roughness: 0.1
          });
          const sat = new THREE.Mesh(satGeom, satMat);
          sat.name = `sat_${lang.name}`;
          sat.position.set(lang.dist * Math.cos((i * Math.PI * 2) / 3), 0, lang.dist * Math.sin((i * Math.PI * 2) / 3));
          cosmosGroup.add(sat);
        });

        rootGroup.add(cosmosGroup);
      }

      return rootGroup;
    };

    const currentSceneObject = buildSceneObject(activeSceneMode);
    scene.add(currentSceneObject);
    activeGroupRef.current = currentSceneObject;

    // 5. Interactive Mouse Parallax and Drag Handlers
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      mouseRef.current.targetX = (clientX / rect.width) * 2 - 1;
      mouseRef.current.targetY = -(clientY / rect.height) * 2 + 1;

      if (mouseRef.current.isDragging && activeGroupRef.current) {
        const deltaX = e.clientX - mouseRef.current.lastMouseX;
        const deltaY = e.clientY - mouseRef.current.lastMouseY;
        activeGroupRef.current.rotation.y += deltaX * 0.008;
        activeGroupRef.current.rotation.x += deltaY * 0.008;
      }
      mouseRef.current.lastMouseX = e.clientX;
      mouseRef.current.lastMouseY = e.clientY;
    };

    const onPointerDown = (e: PointerEvent) => {
      mouseRef.current.isDragging = true;
      mouseRef.current.lastMouseX = e.clientX;
      mouseRef.current.lastMouseY = e.clientY;
    };

    const onPointerUp = () => {
      mouseRef.current.isDragging = false;
    };

    if (interactive) {
      container.addEventListener('pointermove', onPointerMove);
      container.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointerup', onPointerUp);
    }

    // 6. Responsive Resize Handling
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 7. RequestAnimationFrame Animation Loop
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);

      const elapsedTime = clockRef.current.getElapsedTime();

      // Smooth mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Animate active 3D group
      if (activeGroupRef.current) {
        if (isAutoRotating && !mouseRef.current.isDragging) {
          activeGroupRef.current.rotation.y += 0.004;
        }

        // Parallax tilt from mouse
        camera.position.x = mouseRef.current.x * 0.6;
        camera.position.y = 1.2 + mouseRef.current.y * 0.4;
        camera.lookAt(0, 0, 0);

        // Scene specific procedural micro-animations
        if (activeSceneMode === 'codex') {
          // Fluttering parchment page wave
          const flutterPage = activeGroupRef.current.getObjectByName('flutterPage') as THREE.Mesh | undefined;
          if (flutterPage) {
            flutterPage.rotation.z = -0.2 + Math.sin(elapsedTime * 2.5) * 0.08;
            flutterPage.position.y = 0.35 + Math.cos(elapsedTime * 2.5) * 0.03;
          }
          const halo = activeGroupRef.current.getObjectByName('haloRing') as THREE.Mesh | undefined;
          if (halo) {
            halo.rotation.z += 0.008;
            halo.rotation.y = Math.sin(elapsedTime * 0.8) * 0.2;
          }
        } else if (activeSceneMode === 'quill') {
          // Hovering quill floating breathing cycle
          const pen = activeGroupRef.current.getObjectByName('penShaft') as THREE.Group | undefined;
          if (pen) {
            pen.position.y = -0.4 + Math.sin(elapsedTime * 2.0) * 0.06;
            pen.rotation.z = -0.42 + Math.cos(elapsedTime * 1.5) * 0.03;
          }
          // Expanding ink ripple ring
          const ripple = activeGroupRef.current.getObjectByName('rippleRing') as THREE.Mesh | undefined;
          if (ripple) {
            const scale = 1.0 + (elapsedTime % 2.5) * 0.8;
            ripple.scale.set(scale, scale, scale);
            const mat = ripple.material as THREE.MeshBasicMaterial;
            if (mat) {
              mat.opacity = Math.max(0, 0.7 - (elapsedTime % 2.5) * 0.28);
            }
          }
        } else if (activeSceneMode === 'cosmos') {
          // Astrolabe rotating rings
          const r1 = activeGroupRef.current.getObjectByName('cosmosRing1') as THREE.Mesh | undefined;
          const r2 = activeGroupRef.current.getObjectByName('cosmosRing2') as THREE.Mesh | undefined;
          const r3 = activeGroupRef.current.getObjectByName('cosmosRing3') as THREE.Mesh | undefined;
          if (r1) r1.rotation.z += 0.01;
          if (r2) r2.rotation.x += 0.008;
          if (r3) r3.rotation.y += 0.012;

          // Orbiting language satellites
          const satAr = activeGroupRef.current.getObjectByName('sat_ar') as THREE.Mesh | undefined;
          const satMl = activeGroupRef.current.getObjectByName('sat_ml') as THREE.Mesh | undefined;
          const satEn = activeGroupRef.current.getObjectByName('sat_en') as THREE.Mesh | undefined;
          if (satAr) {
            satAr.position.x = 1.2 * Math.cos(elapsedTime * 0.9);
            satAr.position.z = 1.2 * Math.sin(elapsedTime * 0.9);
          }
          if (satMl) {
            satMl.position.x = 1.5 * Math.cos(elapsedTime * 0.65 + 2);
            satMl.position.z = 1.5 * Math.sin(elapsedTime * 0.65 + 2);
            satMl.position.y = Math.sin(elapsedTime * 1.2) * 0.3;
          }
          if (satEn) {
            satEn.position.x = 1.85 * Math.cos(elapsedTime * 0.5 + 4);
            satEn.position.z = 1.85 * Math.sin(elapsedTime * 0.5 + 4);
            satEn.position.y = Math.cos(elapsedTime * 0.8) * 0.4;
          }
        }
      }

      // Animate Stardust Particles Drift
      if (particlesRef.current) {
        particlesRef.current.rotation.y += 0.0008;
        particlesRef.current.rotation.x = Math.sin(elapsedTime * 0.2) * 0.05;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 8. Robust Cleanup & Disposal (Skills Guideline: Resource Management)
    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener('resize', handleResize);
      if (interactive) {
        container.removeEventListener('pointermove', onPointerMove);
        container.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointerup', onPointerUp);
      }

      // Deep clean geometries & materials
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activeSceneMode, isAutoRotating, isVibrantParticles, interactive]);

  const handleResetCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 1.2, 5.2);
      cameraRef.current.lookAt(0, 0, 0);
    }
    if (activeGroupRef.current) {
      activeGroupRef.current.rotation.set(0, 0, 0);
    }
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-[2.2rem] bg-gradient-to-b from-[#050814] via-[#090F24] to-[#04060E] border border-cyan-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.8)] ${heightClass}`}>
      {/* 3D WebGL Canvas Mounting Node */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
        title="Click and drag to rotate the 3D scene"
      />

      {/* Atmospheric Radial Gradient Lighting Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#060914]/20 to-[#04060E]/80" />

      {/* Top Controls Bar */}
      {showControls && (
        <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-auto z-20">
          {/* Mode Selector Tabs with Glowing Active Indicators */}
          <div className="flex items-center gap-1.5 p-1 bg-[#0A1024]/85 border border-cyan-500/30 rounded-2xl backdrop-blur-xl shadow-lg">
            <button
              type="button"
              onClick={() => setActiveSceneMode('codex')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeSceneMode === 'codex'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>3D Codex</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSceneMode('quill')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeSceneMode === 'quill'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)] border border-fuchsia-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Feather className="w-3.5 h-3.5" />
              <span>Golden Quill</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSceneMode('cosmos')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeSceneMode === 'cosmos'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-amber-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Trilingual Cosmos</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              title={isAutoRotating ? 'Pause rotation' : 'Start auto-rotation'}
              className="p-2 rounded-xl bg-[#0A1024]/80 border border-slate-700/60 text-slate-300 hover:text-white hover:border-cyan-400 transition-all backdrop-blur-md shadow-md"
            >
              {isAutoRotating ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-amber-400" />}
            </button>

            <button
              type="button"
              onClick={handleResetCamera}
              title="Reset View Angle"
              className="p-2 rounded-xl bg-[#0A1024]/80 border border-slate-700/60 text-slate-300 hover:text-white hover:border-cyan-400 transition-all backdrop-blur-md shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-all backdrop-blur-md shadow-md"
              >
                Close 3D
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Information Watermark & Guidance */}
      <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between pointer-events-none text-xs">
        <div className="flex items-center gap-2 text-cyan-300/80 font-mono tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>Real-time Three.js WebGL &middot; Drag to inspect &middot; Arabic &middot; Malayalam &middot; English</span>
        </div>
        <div className="hidden sm:block text-[11px] font-mono text-slate-400 bg-slate-950/70 border border-slate-800 px-3 py-1 rounded-full backdrop-blur-md">
          {activeSceneMode === 'codex' && 'The Illuminated Codex · Floating Parchment & Golden Spine'}
          {activeSceneMode === 'quill' && 'The Celestial Quill · Hovering Nib with Liquid Ink Well'}
          {activeSceneMode === 'cosmos' && 'Astrolabe Gateway · Trilingual Node Orbits'}
        </div>
      </div>
    </div>
  );
};
