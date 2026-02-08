import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function Earth3D() {
  const containerRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initializedRef.current || !containerRef.current) return;
    initializedRef.current = true;

    // =============================================
    // THREE.JS SCENE SETUP
    // =============================================
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);

    // =============================================
    // EARTH GROUP
    // =============================================
    const earthGroup = new THREE.Group();
    earthGroup.position.y = -1.8; // Start with 25% visible
    earthGroup.rotation.z = (23.5 * Math.PI) / 180;
    scene.add(earthGroup);

    // =============================================
    // TEXTURES
    // =============================================
    const textureLoader = new THREE.TextureLoader();
    const earthMap = textureLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
    );
    const bumpMap = textureLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-topology.png'
    );
    const cloudsMap = textureLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-clouds.png'
    );

    // =============================================
    // EARTH MESH
    // =============================================
    const earthGeometry = new THREE.SphereGeometry(1, 128, 128);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthMap,
      bumpMap: bumpMap,
      bumpScale: 0.02,
      shininess: 15,
    });
    const earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earthGroup.add(earth);

    // =============================================
    // CLOUDS
    // =============================================
    const cloudGeometry = new THREE.SphereGeometry(1.005, 128, 128);
    const cloudMaterial = new THREE.MeshPhongMaterial({
      map: cloudsMap,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    earthGroup.add(clouds);

    // =============================================
    // ATMOSPHERE GLOW
    // =============================================
    const atmosphereGeometry = new THREE.SphereGeometry(1.15, 64, 64);
    const atmosphereMaterial = new THREE.ShaderMaterial({
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
          float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.0);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    earthGroup.add(atmosphere);

    // =============================================
    // STARFIELD (with mouse reactivity)
    // =============================================
    const starsGroup = new THREE.Group();
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 8000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 80;
      positions[i3 + 1] = (Math.random() - 0.5) * 80;
      positions[i3 + 2] = (Math.random() - 0.5) * 80;

      // Color variation (white, cyan, purple tints) - matching marketplace
      const colorChoice = Math.random();
      if (colorChoice < 0.6) {
        colors[i3] = 1;
        colors[i3 + 1] = 1;
        colors[i3 + 2] = 1;
      } else if (colorChoice < 0.8) {
        colors[i3] = 0.4;
        colors[i3 + 1] = 0.9;
        colors[i3 + 2] = 1;
      } else {
        colors[i3] = 0.7;
        colors[i3 + 1] = 0.6;
        colors[i3 + 2] = 1;
      }
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    starsGroup.add(stars);
    scene.add(starsGroup);

    // =============================================
    // LIGHTING
    // =============================================
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 3.0);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    // =============================================
    // MOUSE TRACKING
    // =============================================
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const onMouseMove = (e) => {
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    // =============================================
    // GSAP SCROLL ANIMATIONS
    // =============================================
    const wasteScene = document.getElementById('waste-scene');
    const wasteVideo = document.getElementById('waste-video');
    const wasteContent = document.querySelector('.waste-content');

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.scroll-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.5,
      },
    });

    // Phase 1: Earth rises (0-25%)
    tl.to(earthGroup.position, { y: 0, duration: 1, ease: 'power2.out' }, 0);

    // Phase 2: Earth rotates (25-50%)
    tl.to(earthGroup.rotation, { y: Math.PI * 0.3, duration: 1 }, 1);

    // Phase 3: Transition to waste (50-100%)
    tl.to(containerRef.current, { opacity: 0, duration: 0.5 }, 2);

    if (wasteScene) {
      tl.to(wasteScene, {
        opacity: 1,
        duration: 0.5,
        onStart: () => {
          if (wasteVideo) {
            wasteVideo.currentTime = 0;
            wasteVideo.play();
          }
        },
      }, 2);
    }

    if (wasteContent) {
      tl.to(wasteContent, { opacity: 1, y: 0, duration: 0.5 }, 2.5);
    }

    // Text reveals
    gsap.fromTo('#section-1', { opacity: 0, y: 30 }, {
      opacity: 1, y: 0,
      scrollTrigger: { trigger: '#section-1', start: 'top 70%', end: 'top 30%', scrub: true }
    });

    gsap.fromTo('#section-2', { opacity: 0, y: 30 }, {
      opacity: 1, y: 0,
      scrollTrigger: { trigger: '#section-2', start: 'top 70%', end: 'top 30%', scrub: true }
    });

    // =============================================
    // ANIMATION LOOP
    // =============================================
    let animationId;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Smooth mouse follow for stars
      mouse.x += (mouse.targetX - mouse.x) * 0.1;
      mouse.y += (mouse.targetY - mouse.y) * 0.1;
      starsGroup.rotation.y = mouse.x * 0.8;
      starsGroup.rotation.x = mouse.y * 0.5;

      // Continuous Earth rotation
      earth.rotation.y += 0.002;
      clouds.rotation.y += 0.0025;

      renderer.render(scene, camera);
    };
    animate();

    // =============================================
    // RESIZE HANDLER
    // =============================================
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // =============================================
    // CLEANUP
    // =============================================
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      ScrollTrigger.getAll().forEach((t) => t.kill());
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} id="canvas-container" />;
}
