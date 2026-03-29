// src/Doctor3D.jsx - 3D 醫師模型（安全動畫版：只動頭和臉）
import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

function DoctorModel({ isSpeaking }) {
  const { scene } = useGLTF("/doctor.glb");
  const ref = useRef();

  // Mesh refs (morph targets)
  const faceMeshRef = useRef(null);
  const teethMeshRef = useRef(null);

  // 只控制頭部和脊椎（安全，不會破壞手臂姿勢）
  const headBoneRef = useRef(null);
  const spine2Ref = useRef(null);

  // 儲存頭部初始旋轉，以便在動畫中做增量
  const headRestX = useRef(0);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        if (child.name === 'Wolf3D_Head') faceMeshRef.current = child;
        if (child.name === 'Wolf3D_Teeth') teethMeshRef.current = child;
      }
      if (child.isBone) {
        if (child.name === 'Head') {
          headBoneRef.current = child;
          // 記錄原始 X 旋轉值，然後微調抬頭
          headRestX.current = child.rotation.x - 0.1; // 抬頭約 6°
          child.rotation.x = headRestX.current;
        }
        if (child.name === 'Spine2') spine2Ref.current = child;
      }
    });
  }, [scene]);

  const BASE_Y = -5.3;

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // 浮動呼吸
    if (ref.current) {
      ref.current.position.y = BASE_Y + Math.sin(t * 0.8) * 0.02;
    }

    if (isSpeaking) {
      const talkValue = (Math.abs(Math.sin(t * 12)) * 0.55) + (Math.random() * 0.1);
      const smileValue = 0.3 + Math.sin(t * 0.4) * 0.15;

      // 嘴巴 + 微笑
      [faceMeshRef, teethMeshRef].forEach(meshRef => {
        if (!meshRef.current) return;
        const dict = meshRef.current.morphTargetDictionary;
        const inf = meshRef.current.morphTargetInfluences;
        if (dict['mouthOpen'] !== undefined) inf[dict['mouthOpen']] = talkValue;
        if (dict['mouthSmile'] !== undefined) inf[dict['mouthSmile']] = smileValue;
      });

      // 頭部：說話動畫 + 微微朝向滑鼠方向
      if (headBoneRef.current) {
        const pointerX = state.pointer.x * 0.15;
        const pointerY = state.pointer.y * 0.08;
        headBoneRef.current.rotation.y = Math.sin(t * 0.4) * 0.08 + pointerX;
        headBoneRef.current.rotation.x = headRestX.current + Math.sin(t * 0.25) * 0.04 - pointerY;
        headBoneRef.current.rotation.z = Math.sin(t * 0.2) * 0.03;
      }

      // 上半身微微擺動
      if (spine2Ref.current) {
        spine2Ref.current.rotation.y = Math.sin(t * 0.3) * 0.03;
      }

    } else {
      // idle：平滑回到中立
      const lerp = THREE.MathUtils.lerp;
      const rate = 0.08;

      [faceMeshRef, teethMeshRef].forEach(meshRef => {
        if (!meshRef.current) return;
        const dict = meshRef.current.morphTargetDictionary;
        const inf = meshRef.current.morphTargetInfluences;
        if (dict['mouthOpen'] !== undefined) inf[dict['mouthOpen']] = lerp(inf[dict['mouthOpen']], 0, 0.15);
        if (dict['mouthSmile'] !== undefined) inf[dict['mouthSmile']] = lerp(inf[dict['mouthSmile']], 0.1, 0.08);
      });

      // 頭部：idle 時跟隨滑鼠/手指位置（像在看著你）
      const targetY = state.pointer.x * 0.25;  // 左右 ±14°
      const targetX = headRestX.current - state.pointer.y * 0.12;  // 基於抬頭姿勢 + 上下 ±7°
      if (headBoneRef.current) {
        headBoneRef.current.rotation.y = lerp(headBoneRef.current.rotation.y, targetY, 0.05);
        headBoneRef.current.rotation.x = lerp(headBoneRef.current.rotation.x, targetX, 0.05);
        headBoneRef.current.rotation.z = lerp(headBoneRef.current.rotation.z, 0, rate);
      }
      if (spine2Ref.current) {
        spine2Ref.current.rotation.y = lerp(spine2Ref.current.rotation.y, 0, rate);
      }
    }
  });

  return (
    <primitive ref={ref} object={scene} scale={3.2} position={[0, BASE_Y, 0]} />
  );
}

function extractKeywords(text) {
  if (!text) return [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  const keywords = [];
  let match;
  while ((match = boldRegex.exec(text)) !== null) {
    const keyword = match[1].trim();
    if (keyword && keyword.length > 1 && keyword.length < 20) keywords.push(keyword);
  }
  return keywords.slice(0, 3);
}

export default function Doctor3D({ isSpeaking, onStopSpeaking, isMobile = false, currentText = '' }) {
  const keywords = extractKeywords(currentText);

  const cameraSettings = isMobile
    ? { position: [0, 0.8, 3.5], fov: 26 }
    : { position: [0, 0.5, 6.5], fov: 25 };

  return (
    <div
      onClick={onStopSpeaking}
      style={{
        width: '100%', height: '100%',
        cursor: isSpeaking ? 'pointer' : 'default',
        position: 'relative'
      }}
      title={isSpeaking ? '點擊停止說話' : ''}
    >
      <Canvas camera={cameraSettings}>
        <ambientLight intensity={2} />
        <Environment preset="city" />
        <DoctorModel isSpeaking={isSpeaking} />
        {!isMobile && (
          <ContactShadows opacity={0.4} scale={10} blur={2.5} far={4} position={[0, -5.4, 0]} />
        )}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={isMobile ? Math.PI / 2.5 : Math.PI / 2.2}
          maxPolarAngle={isMobile ? Math.PI / 2 : Math.PI / 1.8}
          minAzimuthAngle={-Math.PI / 6}
          maxAzimuthAngle={Math.PI / 6}
        />
      </Canvas>

      {isSpeaking && keywords.length > 0 && !isMobile && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '50%',
          transform: 'translateX(-50%)', display: 'flex',
          flexDirection: 'column', gap: '8px', alignItems: 'center',
          pointerEvents: 'none', zIndex: 10
        }}>
          {keywords.map((keyword, index) => (
            <div key={index} style={{
              background: 'rgba(96, 165, 250, 0.9)', color: 'white',
              padding: '8px 20px', borderRadius: '20px', fontSize: '14px',
              fontWeight: '600', backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              animation: `slideIn 0.3s ease-out ${index * 0.1}s both`,
              whiteSpace: 'nowrap'
            }}>
              {keyword}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
