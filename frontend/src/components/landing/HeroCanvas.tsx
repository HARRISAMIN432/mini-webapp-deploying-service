"use client";

import { useEffect, useRef } from "react";

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    async function init() {
      const THREE = await import("three");

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
      camera.position.set(0, 0, 5);

      const renderer = new THREE.WebGLRenderer({
        canvas: canvas!,
        alpha: true,
        antialias: true,
      });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      function resize() {
        const w = canvas!.clientWidth;
        const h = canvas!.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener("resize", resize);

      // Particle field
      const count = 1800;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
        const t = Math.random();
        colors[i * 3] = 0.38 + t * 0.25;
        colors[i * 3 + 1] = 0.4 + t * 0.05;
        colors[i * 3 + 2] = 0.94;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.04,
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
      });
      const particles = new THREE.Points(geo, mat);
      scene.add(particles);

      // Wireframe icosahedron
      const icoGeo = new THREE.IcosahedronGeometry(1.4, 1);
      const icoMat = new THREE.MeshBasicMaterial({
        color: 0x6366f1,
        wireframe: true,
        transparent: true,
        opacity: 0.1,
      });
      const ico = new THREE.Mesh(icoGeo, icoMat);
      scene.add(ico);

      // Torus rings
      const torus1 = new THREE.Mesh(
        new THREE.TorusGeometry(2.2, 0.008, 8, 100),
        new THREE.MeshBasicMaterial({
          color: 0x818cf8,
          transparent: true,
          opacity: 0.18,
        }),
      );
      torus1.rotation.x = Math.PI / 2.5;
      scene.add(torus1);

      const torus2 = new THREE.Mesh(
        new THREE.TorusGeometry(3.0, 0.005, 8, 120),
        new THREE.MeshBasicMaterial({
          color: 0xc084fc,
          transparent: true,
          opacity: 0.1,
        }),
      );
      torus2.rotation.x = Math.PI / 3;
      torus2.rotation.z = Math.PI / 6;
      scene.add(torus2);

      // Mouse parallax
      let mx = 0,
        my = 0;
      const onMouse = (e: MouseEvent) => {
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = -(e.clientY / window.innerHeight - 0.5) * 2;
      };
      window.addEventListener("mousemove", onMouse);

      let t = 0;
      function animate() {
        animId = requestAnimationFrame(animate);
        t += 0.006;
        particles.rotation.y = t * 0.04;
        particles.rotation.x = Math.sin(t * 0.02) * 0.05;
        ico.rotation.y = t * 0.22;
        ico.rotation.x = t * 0.1;
        torus1.rotation.z = t * 0.06;
        torus2.rotation.y = t * 0.04;
        camera.position.x += (mx * 0.3 - camera.position.x) * 0.03;
        camera.position.y += (my * 0.2 - camera.position.y) * 0.03;
        renderer.render(scene, camera);
      }
      animate();

      return () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("mousemove", onMouse);
        cancelAnimationFrame(animId);
        renderer.dispose();
      };
    }

    let cleanup: (() => void) | undefined;
    init().then((fn) => {
      cleanup = fn;
    });
    return () => {
      cleanup?.();
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
