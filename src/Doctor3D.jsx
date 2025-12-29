// src/Doctor3D.jsx - 修復 ESLint 錯誤版 (使用 useRef)
import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

function DoctorModel({ isSpeaking }) {
  const { scene } = useGLTF("/doctor.glb");
  const ref = useRef();
  
  // ★★★ 關鍵修改：改用 useRef 來存模型引用，而不是 useState ★★★
  // useRef 的內容是可以被直接修改的，不會被 ESLint 罵
  const faceMeshRef = useRef(null);
  const teethMeshRef = useRef(null);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        if (child.name === 'Wolf3D_Head') {
          faceMeshRef.current = child; // 存入 Ref
        }
        if (child.name === 'Wolf3D_Teeth') {
          teethMeshRef.current = child; // 存入 Ref
        }
      }
    });
  }, [scene]);

  const BASE_Y = -5.3; 

  useFrame((state) => {
    if (ref.current) {
      ref.current.position.y = BASE_Y + Math.sin(state.clock.elapsedTime) * 0.05;
    }

    // --- 說話動畫 ---
    if (isSpeaking) {
      const t = state.clock.elapsedTime;
      const talkValue = (Math.abs(Math.sin(t * 12)) * 0.55) + (Math.random() * 0.1);

      // ★★★ 這裡改成讀取 Ref.current ★★★
      if (faceMeshRef.current) {
        const idx = faceMeshRef.current.morphTargetDictionary['mouthOpen'];
        if (idx !== undefined) faceMeshRef.current.morphTargetInfluences[idx] = talkValue;
      }
      if (teethMeshRef.current) {
        const idx = teethMeshRef.current.morphTargetDictionary['mouthOpen'];
        if (idx !== undefined) teethMeshRef.current.morphTargetInfluences[idx] = talkValue;
      }

    } else {
      // 閉嘴動畫
      if (faceMeshRef.current) {
        const idx = faceMeshRef.current.morphTargetDictionary['mouthOpen'];
        if (idx !== undefined) {
          faceMeshRef.current.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
            faceMeshRef.current.morphTargetInfluences[idx], 0, 0.15
          );
        }
      }
      if (teethMeshRef.current) {
        const idx = teethMeshRef.current.morphTargetDictionary['mouthOpen'];
        if (idx !== undefined) {
          teethMeshRef.current.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
            teethMeshRef.current.morphTargetInfluences[idx], 0, 0.15
          );
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

export default function Doctor3D({ isSpeaking, onStopSpeaking }) {
  return (
    <div
      onClick={onStopSpeaking}
      style={{ width: '100%', height: '100%', cursor: isSpeaking ? 'pointer' : 'default' }}
      title={isSpeaking ? '點擊停止說話' : ''}
    >
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
    </div>
  );
}