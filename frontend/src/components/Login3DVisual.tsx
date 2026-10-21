import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './Login3DVisual.css';

export const Login3DVisual: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 480;
    let height = container.clientHeight || 560;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x290854);
    scene.fog = new THREE.FogExp2(0x290854, 0.02);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 14, 30);
    camera.lookAt(0, 5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = 'login-3d-canvas';
    container.appendChild(renderer.domElement);

    // 2. Lighting System
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0x865db1, 2.8);
    mainLight.position.set(15, 25, 20);
    scene.add(mainLight);

    const purpleLight = new THREE.PointLight(0x6f489a, 3.5, 50);
    purpleLight.position.set(-15, 8, -10);
    scene.add(purpleLight);

    const beaconLight = new THREE.PointLight(0xffffff, 2.5, 25);
    beaconLight.position.set(0, 13.5, 0);
    scene.add(beaconLight);

    // 3. Central Antenna Tower & Transmitter Array
    const towerGroup = new THREE.Group();
    scene.add(towerGroup);

    // Base podium
    const baseGeo = new THREE.CylinderGeometry(4.2, 5.0, 0.8, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x401d6b,
      metalness: 0.8,
      roughness: 0.3,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.4;
    towerGroup.add(baseMesh);

    // Base neon ring
    const baseRingGeo = new THREE.TorusGeometry(4.6, 0.08, 16, 64);
    const baseRingMat = new THREE.MeshBasicMaterial({ color: 0x865db1 });
    const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.82;
    towerGroup.add(baseRing);

    // Lower Lattice Mast (Trellis)
    const lowerMastGeo = new THREE.ConeGeometry(2.4, 5.5, 4, 3, true);
    const lowerMastMat = new THREE.MeshStandardMaterial({
      color: 0x583383,
      wireframe: true,
      metalness: 0.9,
      roughness: 0.2,
    });
    const lowerMast = new THREE.Mesh(lowerMastGeo, lowerMastMat);
    lowerMast.position.y = 3.5;
    lowerMast.rotation.y = Math.PI / 4;
    towerGroup.add(lowerMast);

    // Mid Equipment Deck
    const deckGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.3, 16);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x6f489a, metalness: 0.8 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.y = 6.4;
    towerGroup.add(deck);

    // Main Antenna Vertical Mast
    const mastPoleGeo = new THREE.CylinderGeometry(0.2, 0.35, 7.5, 16);
    const mastPoleMat = new THREE.MeshStandardMaterial({ color: 0x865db1, metalness: 0.9, roughness: 0.2 });
    const mastPole = new THREE.Mesh(mastPoleGeo, mastPoleMat);
    mastPole.position.y = 10.0;
    towerGroup.add(mastPole);

    // Rotating Radar Dish Array (Facing OUTWARDS)
    const radarDishGroup = new THREE.Group();
    radarDishGroup.position.y = 8.5;
    towerGroup.add(radarDishGroup);

    // 1. Horizontal mounting bracket arm extending out from the mast towards +Z
    const bracketArmGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 8);
    const bracketArmMat = new THREE.MeshStandardMaterial({ color: 0x583383, metalness: 0.85 });
    const bracketArm = new THREE.Mesh(bracketArmGeo, bracketArmMat);
    bracketArm.rotation.x = Math.PI / 2;
    bracketArm.position.set(0, 0, 0.75);
    radarDishGroup.add(bracketArm);

    // 2. Parabolic Dish Bowl (Opening OUTWARDS towards +Z)
    const dishRadius = 1.7;
    const dishGeo = new THREE.SphereGeometry(dishRadius, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2.4);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0x6f489a,
      side: THREE.DoubleSide,
      metalness: 0.85,
      roughness: 0.25,
    });
    const dishMesh = new THREE.Mesh(dishGeo, dishMat);
    // Rotating around X by Math.PI / 2 points the inner concave bowl OUTWARDS (+Z)
    dishMesh.rotation.x = Math.PI / 2;
    dishMesh.position.set(0, 0, 1.5 + dishRadius * Math.cos(Math.PI / 2.4));
    radarDishGroup.add(dishMesh);

    // 3. Central LNB Feed Horn & Sub-reflector pointing into/out from the dish
    const feedGeo = new THREE.CylinderGeometry(0.07, 0.14, 0.7, 12);
    const feedMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const feedMesh = new THREE.Mesh(feedGeo, feedMat);
    feedMesh.rotation.x = Math.PI / 2;
    feedMesh.position.set(0, 0, 2.5);
    radarDishGroup.add(feedMesh);

    // Feed horn supporting diagonal struts
    const strutMat = new THREE.MeshBasicMaterial({ color: 0x865db1 });
    const strutGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.1, 6);

    const strutTop = new THREE.Mesh(strutGeo, strutMat);
    strutTop.position.set(0, 0.55, 2.0);
    strutTop.rotation.x = Math.PI / 3.5;
    radarDishGroup.add(strutTop);

    const strutBottom = new THREE.Mesh(strutGeo, strutMat);
    strutBottom.position.set(0, -0.55, 2.0);
    strutBottom.rotation.x = -Math.PI / 3.5;
    radarDishGroup.add(strutBottom);

    // Glowing Apex Radome Orb (Transmitter Beacon)
    const apexOrbGeo = new THREE.SphereGeometry(0.65, 24, 24);
    const apexOrbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const apexOrb = new THREE.Mesh(apexOrbGeo, apexOrbMat);
    apexOrb.position.y = 13.8;
    towerGroup.add(apexOrb);

    // Halo around apex
    const apexHaloGeo = new THREE.RingGeometry(0.85, 0.95, 32);
    const apexHaloMat = new THREE.MeshBasicMaterial({
      color: 0x865db1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const apexHalo = new THREE.Mesh(apexHaloGeo, apexHaloMat);
    apexHalo.position.y = 13.8;
    apexHalo.rotation.x = Math.PI / 2;
    towerGroup.add(apexHalo);

    // 4. Concentric Propagating Radio Waves (Ondas Electromagnéticas RF)
    const waveCount = 6;
    const waves: { mesh: THREE.Mesh; progress: number }[] = [];
    const waveGeo = new THREE.TorusGeometry(1, 0.055, 12, 64);

    for (let i = 0; i < waveCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x865db1 : 0xffffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(waveGeo, mat);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = 13.8;
      scene.add(mesh);
      waves.push({ mesh, progress: i / waveCount });
    }

    // 5. Dynamic Electromagnetic Spectrum Terrain Grid (Malla Espectral de Frecuencia)
    const planeGeo = new THREE.PlaneGeometry(44, 44, 30, 30);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x583383,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const spectrumGrid = new THREE.Mesh(planeGeo, planeMat);
    spectrumGrid.rotation.x = -Math.PI / 2;
    spectrumGrid.position.y = 0;
    scene.add(spectrumGrid);

    // 6. Ambient Floating RF Telemetry Particles (Partículas Espectrales)
    const particleCount = 160;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 44;
      particlePos[i + 1] = Math.random() * 22 + 1;
      particlePos[i + 2] = (Math.random() - 0.5) * 44;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.35,
      transparent: true,
      opacity: 0.75,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 7. Interactive Mouse Movement Listener
    let mouseX = 0;
    let mouseY = 0;
    let targetCameraX = 0;
    let targetCameraY = 14;

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = nx;
      mouseY = ny;
    };

    container.addEventListener('mousemove', onPointerMove);

    // 8. Animation Engine
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Rotate radar dish on mast (sweeping outwards)
      radarDishGroup.rotation.y = t * 1.8;

      // Rotate tower slowly
      towerGroup.rotation.y = t * 0.15;

      // Pulse Apex Radome halo
      const scaleHalo = 1 + Math.sin(t * 4) * 0.2;
      apexHalo.scale.set(scaleHalo, scaleHalo, scaleHalo);

      // Expand Concentric Radio Waves (Propagación continua de ondas RF)
      waves.forEach((w) => {
        w.progress = (w.progress + 0.0065) % 1;
        const currentScale = 0.5 + w.progress * 20;
        w.mesh.scale.set(currentScale, currentScale, 1);
        const mat = w.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, (1 - w.progress) * 0.8);
      });

      // Spectrum Grid Wave Oscillation (Ondas del espectro de radio)
      const posAttr = planeGeo.attributes.position;
      const vCount = posAttr.count;
      for (let i = 0; i < vCount; i++) {
        const vx = posAttr.getX(i);
        const vy = posAttr.getY(i);
        const dist = Math.sqrt(vx * vx + vy * vy);
        const z = Math.sin(dist * 0.45 - t * 2.2) * 1.1 * Math.exp(-dist * 0.05);
        posAttr.setZ(i, z);
      }
      posAttr.needsUpdate = true;

      // Drift ambient RF telemetry particles
      particles.rotation.y = t * 0.04;

      // Camera Smooth Floating with Interactive Parallax
      targetCameraX = mouseX * 5;
      targetCameraY = 14 + mouseY * 3;
      camera.position.x += (targetCameraX - camera.position.x) * 0.05;
      camera.position.y += (targetCameraY - camera.position.y) * 0.05;
      camera.lookAt(0, 7.5, 0);

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousemove', onPointerMove);
      resizeObserver.disconnect();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="login-3d-container" ref={mountRef} />
  );
};
