// src/Doctor3D.jsx - 嘴型優化版 (配合 Zhiwei 語速)
import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

function DoctorModel({ isSpeaking }) {
  const { scene } = useGLTF("/doctor.glb");
  const ref = useRef();
  const [faceMesh, setFaceMesh] = useState(null);
  const [teethMesh, setTeethMesh] = useState(null);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        if (child.name === 'Wolf3D_Head') setFaceMesh(child);
        if (child.name === 'Wolf3D_Teeth') setTeethMesh(child);
      }
    });
  }, [scene]);

  const BASE_Y = -5.3; 

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = BASE_Y + Math.sin(state.clock.elapsedTime) * 0.05;
    }

    // --- 說話動畫參數調整區 ---
    if (isSpeaking) {
      // 1. 速度 (Frequency): 從 20 改成 12 -> 變慢，比較穩重
      // 2. 幅度 (Amplitude): 從 0.25 改成 0.55 -> 嘴巴張大一點，看比較清楚
      // 3. 隨機感 (Random): 加一點點隨機變化，才不會像機械
      const t = state.clock.elapsedTime;
      const talkValue = (Math.abs(Math.sin(t * 12)) * 0.55) + (Math.random() * 0.1);

      if (faceMesh) {
        const idx = faceMesh.morphTargetDictionary['mouthOpen'];
        if (idx !== undefined) faceMesh.morphTargetInfluences[idx] = talkValue;
      }
      if (teethMesh) {
        const idx = teethMesh.morphTargetDictionary['mouthOpen'];
        if (idx !== undefined) teethMesh.morphTargetInfluences[idx] = talkValue;
      }

    } else {
      // 閉嘴時的速度
      if (faceMesh) {
        const idx = faceMesh.morphTargetDictionary['mouthOpen'];
        if (idx !== undefined) {
          faceMesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(faceMesh.morphTargetInfluences[idx], 0, 0.15);
        }
      }
      if (teethMesh) {
        const idx = teethMesh.morphTargetDictionary['mouthOpen'];
        if (idx !== undefined) {
          teethMesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(teethMesh.morphTargetInfluences[idx], 0, 0.15);
        }
      }
    }
  });

  return (
    <primitive 
      ref={ref}
      object={scene} 
      scale={3.2}
      position={[0, BASE_Y, 0]} 
    />
  );
}

export default function Doctor3D({ isSpeaking }) {
  return (
    <Canvas camera={{ position: [0, 0.5, 6.5], fov: 25 }}>
      <ambientLight intensity={2} />
      <Environment preset="city" />
      <DoctorModel isSpeaking={isSpeaking} />
      <ContactShadows opacity={0.4} scale={10} blur={2.5} far={4} position={[0, -5.4, 0]} /> 
      <OrbitControls 
        enableZoom={false} 
        minPolarAngle={Math.PI/2.2} 
        maxPolarAngle={Math.PI/1.8}
        minAzimuthAngle={-Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
      />
    </Canvas>
  );
}