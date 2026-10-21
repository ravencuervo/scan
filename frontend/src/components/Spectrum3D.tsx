import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { ScannedAP } from '../types/spectrum';
import './Spectrum3D.css';

interface Spectrum3DProps {
  accessPoints: ScannedAP[];
}

export const Spectrum3D: React.FC<Spectrum3DProps> = ({ accessPoints }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const accessPointsRef = useRef(accessPoints);
  accessPointsRef.current = accessPoints;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x290854);
    scene.fog = new THREE.FogExp2(0x290854, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 32, 50);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 2. Lighting with Purple & White Accents
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x865db1, 2.0);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    const purpleLight = new THREE.PointLight(0x583383, 3.0, 70);
    purpleLight.position.set(-20, 10, -10);
    scene.add(purpleLight);

    // 3. 3D Grid Floor & Channel Marker Lines
    const gridHelper = new THREE.GridHelper(60, 24, 0x865db1, 0x401d6b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Radar circular rings
    const ringGeo1 = new THREE.RingGeometry(14.8, 15, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x6f489a, side: THREE.DoubleSide });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat);
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.05;
    scene.add(ring1);

    const ringGeo2 = new THREE.RingGeometry(24.8, 25, 64);
    const ring2 = new THREE.Mesh(ringGeo2, ringMat);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.05;
    scene.add(ring2);

    // 4. Rotating Radar Sweep Beam
    const sweepGeo = new THREE.CircleGeometry(25, 32, 0, Math.PI / 4);
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0x865db1,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const sweepMesh = new THREE.Mesh(sweepGeo, sweepMat);
    sweepMesh.rotation.x = -Math.PI / 2;
    sweepMesh.position.y = 0.08;
    scene.add(sweepMesh);

    // 5. AP 3D Towers Group & State Map
    const towersGroup = new THREE.Group();
    scene.add(towersGroup);

    const baseCylinderGeo = new THREE.CylinderGeometry(0.85, 1.1, 1, 16);
    const baseOrbGeo = new THREE.SphereGeometry(0.55, 16, 16);

    interface TowerState {
      mesh: THREE.Mesh;
      orb: THREE.Mesh;
      material: THREE.MeshStandardMaterial;
      orbMaterial: THREE.MeshBasicMaterial;
      currentHeight: number;
      targetHeight: number;
      targetX: number;
      targetZ: number;
      opacity: number;
      targetOpacity: number;
    }

    const towersMap = new Map<string, TowerState>();

    // 6. Ambient RF Floating Particle Wave Field
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePos[i] = (Math.random() - 0.5) * 60;
      particlePos[i + 1] = Math.random() * 20 + 2;
      particlePos[i + 2] = (Math.random() - 0.5) * 50;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.75,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 7. Interactive Mouse Orbit Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let sphericalTheta = 0;
    let sphericalPhi = Math.PI / 4;
    let distance = 55;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      sphericalTheta -= deltaX * 0.008;
      sphericalPhi = Math.max(0.1, Math.min(Math.PI / 2.1, sphericalPhi - deltaY * 0.008));
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      distance = Math.max(20, Math.min(100, distance + e.deltaY * 0.05));
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });

    // 8. Continuous Smooth Animation Loop (60 FPS)
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotate radar sweep
      sweepMesh.rotation.z = -elapsedTime * 1.5;

      // Soft particles drift
      particles.rotation.y = elapsedTime * 0.04;

      // Smooth camera orbit
      camera.position.x = distance * Math.sin(sphericalPhi) * Math.sin(sphericalTheta);
      camera.position.y = distance * Math.cos(sphericalPhi);
      camera.position.z = distance * Math.sin(sphericalPhi) * Math.cos(sphericalTheta);
      camera.lookAt(0, 4, 0);

      // --- Smooth Tower LERP Update ---
      const aps = accessPointsRef.current;
      const activeKeys = new Set<string>();

      aps.forEach((ap, idx) => {
        const key = ap.bssid || `${ap.ssid}_${ap.channel}`;
        activeKeys.add(key);

        const clamped = Math.max(-100, Math.min(-30, ap.rssi));
        const targetHeight = Math.max(1.5, ((clamped + 100) / 70) * 22);

        const is24 = ap.channel <= 14;
        const targetX = is24 ? (ap.channel - 7.5) * 3.4 : (idx - aps.length / 2) * 2.8;
        const targetZ = is24 ? -6 : 10;

        let tower = towersMap.get(key);
        if (!tower) {
          const isStandardCh = ap.channel === 1 || ap.channel === 6 || ap.channel === 11;
          const towerColor = isStandardCh ? 0x865db1 : 0x583383;
          const emissiveColor = isStandardCh ? 0x6f489a : 0x401d6b;

          const towerMat = new THREE.MeshStandardMaterial({
            color: towerColor,
            roughness: 0.2,
            metalness: 0.85,
            emissive: emissiveColor,
            emissiveIntensity: 0.35,
            transparent: true,
            opacity: 0,
          });

          const mesh = new THREE.Mesh(baseCylinderGeo, towerMat);
          mesh.position.set(targetX, 0.5, targetZ);
          mesh.scale.set(1, 1, 1);
          towersGroup.add(mesh);

          const orbMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
          const orb = new THREE.Mesh(baseOrbGeo, orbMat);
          orb.position.set(targetX, 1.55, targetZ);
          towersGroup.add(orb);

          tower = {
            mesh,
            orb,
            material: towerMat,
            orbMaterial: orbMat,
            currentHeight: 1,
            targetHeight,
            targetX,
            targetZ,
            opacity: 0,
            targetOpacity: 1,
          };
          towersMap.set(key, tower);
        } else {
          tower.targetHeight = targetHeight;
          tower.targetX = targetX;
          tower.targetZ = targetZ;
          tower.targetOpacity = 1;
        }
      });

      // Towers that disappeared sink down and fade out
      towersMap.forEach((tower, key) => {
        if (!activeKeys.has(key)) {
          tower.targetHeight = 0.5;
          tower.targetOpacity = 0;
        }
      });

      // Interpolate all towers
      const toDelete: string[] = [];
      towersMap.forEach((tower, key) => {
        tower.currentHeight += (tower.targetHeight - tower.currentHeight) * 0.08;
        tower.opacity += (tower.targetOpacity - tower.opacity) * 0.08;

        tower.mesh.scale.set(1, tower.currentHeight, 1);
        tower.mesh.position.y = tower.currentHeight / 2;
        tower.mesh.position.x += (tower.targetX - tower.mesh.position.x) * 0.08;
        tower.mesh.position.z += (tower.targetZ - tower.mesh.position.z) * 0.08;

        tower.orb.position.set(tower.mesh.position.x, tower.currentHeight + 0.55, tower.mesh.position.z);

        tower.material.opacity = Math.max(0, Math.min(1, tower.opacity));
        tower.orbMaterial.opacity = Math.max(0, Math.min(1, tower.opacity));

        if (tower.opacity < 0.01 && tower.targetOpacity === 0) {
          towersGroup.remove(tower.mesh);
          towersGroup.remove(tower.orb);
          tower.material.dispose();
          tower.orbMaterial.dispose();
          toDelete.push(key);
        }
      });

      toDelete.forEach((k) => towersMap.delete(k));

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      if (domElement.parentElement) {
        domElement.parentElement.removeChild(domElement);
      }
      towersMap.forEach((t) => {
        t.material.dispose();
        t.orbMaterial.dispose();
      });
      baseCylinderGeo.dispose();
      baseOrbGeo.dispose();
      ringGeo1.dispose();
      ringGeo2.dispose();
      sweepGeo.dispose();
      particleGeo.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="three-container">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div className="three-controls-overlay">
        <i className="bi bi-arrows-move" style={{ color: 'inherit' }}></i>
        <span>Arrastrar para rotar 3D • Rueda para Zoom</span>
      </div>
    </div>
  );
};
