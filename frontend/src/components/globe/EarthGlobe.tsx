import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { SelectedLocation } from '../../types/geography';
import { latLonToVector3 } from '../../utils/geodesic';

interface EarthGlobeProps {
  selectedLocation: SelectedLocation | null;
  onSelectLocation?: (location: SelectedLocation) => void;
  selectionRadiusKm?: number | null;
  isExploreMode?: boolean;
}

export const EarthGlobe: React.FC<EarthGlobeProps> = ({
  selectedLocation,
  onSelectLocation: _onSelectLocation,
  selectionRadiusKm = null,
  isExploreMode = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Animation and camera target references
  const animStateRef = useRef({
    distance: 4.8,
    targetDistance: 4.8,
    rotX: 0.3,
    rotY: 0.0,
    targetRotX: 0.3,
    targetRotY: 0.0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    prevRotX: 0,
    prevRotY: 0,
    isAnimatingToTarget: false,
    animStartTime: 0,
    animDuration: 1400,
    startRotX: 0,
    startRotY: 0,
    startDist: 4.8,
    endRotX: 0,
    endRotY: 0,
    endDist: 3.4,
  });

  // Smoothly rotate the globe toward a lat/lon coordinate
  const animateCameraToLatLon = useCallback((lat: number, lon: number, zoomDistance = 3.4) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const targetRotX = phi - Math.PI / 2;
    // Align longitudinal angle to face camera directly
    let targetRotY = -theta + Math.PI / 2;

    const state = animStateRef.current;
    state.startRotX = state.rotX;
    state.startRotY = state.rotY;
    state.startDist = state.distance;

    // Normalize rotational delta to take shortest angular path
    while (targetRotY - state.startRotY > Math.PI) targetRotY -= 2 * Math.PI;
    while (targetRotY - state.startRotY < -Math.PI) targetRotY += 2 * Math.PI;

    state.endRotX = targetRotX;
    state.endRotY = targetRotY;
    state.endDist = zoomDistance;
    state.animStartTime = performance.now();
    state.isAnimatingToTarget = true;
  }, []);

  // Watch for selectedLocation changes from search or presets
  useEffect(() => {
    if (selectedLocation) {
      animateCameraToLatLon(selectedLocation.lat, selectedLocation.lon, isExploreMode ? 3.0 : 3.4);
    }
  }, [selectedLocation, isExploreMode, animateCameraToLatLon]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch (err: any) {
      setWebglError('WebGL is not supported in this browser environment.');
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent canvas on dark space container
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = animStateRef.current.distance;

    // 1. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x64748b, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(-5, -2, -4);
    scene.add(rimLight);

    // 2. Starfield Background (Distant celestial points)
    const starCount = 600;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 25 + Math.random() * 25;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const sinPhi = Math.sin(phi);
      starPositions[i * 3] = radius * sinPhi * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * sinPhi * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.18,
      transparent: true,
      opacity: 0.75,
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 3. Earth Globe Mesh & Textures
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const textureLoader = new THREE.TextureLoader();
    const earthDayTexture = textureLoader.load('/textures/earth_day.jpg');
    const earthBumpTexture = textureLoader.load('/textures/earth_topology.png');

    const earthRadius = 1.6;
    const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: earthDayTexture,
      bumpMap: earthBumpTexture,
      bumpScale: 0.03,
      roughness: 0.75,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    globeGroup.add(earthMesh);

    // 4. Subtle Atmospheric Glow Halo (Custom Fresnel Shader)
    const atmosphereGeometry = new THREE.SphereGeometry(earthRadius * 1.025, 64, 64);
    const atmosphereShader = {
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.22, 0.74, 0.97, 1.0) * intensity * 0.75;
        }
      `,
    };
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereShader.vertexShader,
      fragmentShader: atmosphereShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    globeGroup.add(atmosphereMesh);

    // 5. Dynamic Marker & Area Selection Ring Groups
    const markerGroup = new THREE.Group();
    globeGroup.add(markerGroup);

    // Pulse ring mesh for active marker
    const ringGeometry = new THREE.RingGeometry(0.04, 0.08, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const pulseRing = new THREE.Mesh(ringGeometry, ringMaterial);
    pulseRing.visible = false;
    markerGroup.add(pulseRing);

    // Pin core point
    const pinGeometry = new THREE.SphereGeometry(0.025, 16, 16);
    const pinMaterial = new THREE.MeshBasicMaterial({ color: 0xff8617 });
    const pinMesh = new THREE.Mesh(pinGeometry, pinMaterial);
    pinMesh.visible = false;
    markerGroup.add(pinMesh);

    // Area selection circle ring (for Explore mode)
    const areaRingGroup = new THREE.Group();
    globeGroup.add(areaRingGroup);

    // Update marker 3D position based on selected location
    const updateMarkerPosition = () => {
      if (!selectedLocation) {
        pulseRing.visible = false;
        pinMesh.visible = false;
        areaRingGroup.clear();
        return;
      }

      const [x, y, z] = latLonToVector3(selectedLocation.lat, selectedLocation.lon, earthRadius * 1.008);
      const markerPos = new THREE.Vector3(x, y, z);

      pinMesh.position.copy(markerPos);
      pinMesh.visible = true;

      pulseRing.position.copy(markerPos);
      pulseRing.lookAt(new THREE.Vector3(0, 0, 0));
      pulseRing.visible = true;

      // Area selection ring geometry on surface
      areaRingGroup.clear();
      if (selectionRadiusKm && selectionRadiusKm > 0) {
        // Approximate radius on unit sphere
        const angularRadius = (selectionRadiusKm / 6371.0);
        const ringRadius = earthRadius * Math.sin(angularRadius);
        
        const areaGeom = new THREE.RingGeometry(Math.max(0.05, ringRadius * 0.96), ringRadius * 1.04, 64);
        const areaMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const areaMesh = new THREE.Mesh(areaGeom, areaMat);
        areaMesh.position.copy(markerPos);
        areaMesh.lookAt(new THREE.Vector3(0, 0, 0));
        areaRingGroup.add(areaMesh);
      }
    };

    updateMarkerPosition();

    // 6. User Interaction Handlers (Drag to Rotate, Scroll to Zoom)
    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Left mouse button only
      isMouseDown = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      animStateRef.current.isAnimatingToTarget = false; // Cancel programmatic camera animation on user interaction
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      const state = animStateRef.current;
      state.targetRotY += dx * 0.005;
      state.targetRotX += dy * 0.005;

      // Clamp vertical polar rotation to prevent flipping upside down
      state.targetRotX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, state.targetRotX));
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const state = animStateRef.current;
      state.targetDistance += e.deltaY * 0.003;
      state.targetDistance = Math.max(2.4, Math.min(7.0, state.targetDistance));
    };

    // Touch Support for mobile / touch devices
    let touchStartX = 0;
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        animStateRef.current.isAnimatingToTarget = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        const state = animStateRef.current;
        state.targetRotY += dx * 0.006;
        state.targetRotX += dy * 0.006;
        state.targetRotX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, state.targetRotX));
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domElement.addEventListener('wheel', onWheel, { passive: false });
    domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // Handle Window Resize
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 7. Animation Render Loop
    let animationFrameId: number;
    let ringScale = 1.0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const state = animStateRef.current;

      // Handle programmatic camera tweening
      if (state.isAnimatingToTarget) {
        const now = performance.now();
        const elapsed = now - state.animStartTime;
        const progress = Math.min(1.0, elapsed / state.animDuration);

        // Smooth cubic ease-out curve
        const easeOut = 1 - Math.pow(1 - progress, 3);

        state.rotX = state.startRotX + (state.endRotX - state.startRotX) * easeOut;
        state.rotY = state.startRotY + (state.endRotY - state.startRotY) * easeOut;
        state.distance = state.startDist + (state.endDist - state.startDist) * easeOut;

        state.targetRotX = state.rotX;
        state.targetRotY = state.rotY;
        state.targetDistance = state.distance;

        if (progress >= 1.0) {
          state.isAnimatingToTarget = false;
        }
      } else {
        // Subtle constant rotation when idle and not dragging
        if (!isMouseDown) {
          state.targetRotY += 0.0006;
        }

        // Smooth inertial interpolation
        state.rotX += (state.targetRotX - state.rotX) * 0.08;
        state.rotY += (state.targetRotY - state.rotY) * 0.08;
        state.distance += (state.targetDistance - state.distance) * 0.08;
      }

      // Apply rotations to globe
      globeGroup.rotation.x = state.rotX;
      globeGroup.rotation.y = state.rotY;
      camera.position.z = state.distance;

      // Marker ring pulsation animation
      if (pulseRing.visible) {
        ringScale += 0.018;
        if (ringScale > 2.0) ringScale = 1.0;
        pulseRing.scale.set(ringScale, ringScale, 1.0);
        (pulseRing.material as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 1.0 - (ringScale - 1.0));
      }

      // Slowly rotate starfield for depth
      starField.rotation.y += 0.0001;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domElement.removeEventListener('wheel', onWheel);
      domElement.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onResize);

      // Dispose WebGL Resources
      earthGeometry.dispose();
      earthMaterial.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      earthDayTexture.dispose();
      earthBumpTexture.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      pinGeometry.dispose();
      pinMaterial.dispose();
      renderer.dispose();

      if (container.contains(domElement)) {
        container.removeChild(domElement);
      }
    };
  }, [selectedLocation, selectionRadiusKm]);

  if (webglError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#070D17] text-[#F3F6FC]">
        <div className="p-4 rounded-xl bg-[#111B2A] border border-[#263449] max-w-md space-y-2">
          <div className="text-[#38BDF8] font-bold text-sm uppercase tracking-wider">
            3D Globe Renderer Notice
          </div>
          <p className="text-xs text-[#94A3B8]">{webglError}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
    />
  );
};
