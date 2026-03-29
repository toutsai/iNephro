// src/Doctor3D.jsx - 3D 醫師模型 (動畫修復 + 增強版)
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

  // Bone refs
  const headBoneRef = useRef(null);
  const spineRef = useRef(null);
  const spine1Ref = useRef(null);
  const leftShoulderRef = useRef(null);
  const rightShoulderRef = useRef(null);
  const leftArmRef = useRef(null);
  const rightArmRef = useRef(null);
  const leftForeArmRef = useRef(null);
  const rightForeArmRef = useRef(null);
  const leftHandRef = useRef(null);
  const rightHandRef = useRef(null);
  // 手指 refs（右手食指，用於指向手勢）
  const rightIndex1Ref = useRef(null);
  const rightIndex2Ref = useRef(null);
  const rightIndex3Ref = useRef(null);

  useEffect(() => {
    scene.traverse((child) => {
      // 儲存 Mesh 引用（含 morph targets）
      if (child.isMesh && child.morphTargetDictionary) {
        if (child.name === 'Wolf3D_Head') faceMeshRef.current = child;
        if (child.name === 'Wolf3D_Teeth') teethMeshRef.current = child;
      }

      // 儲存骨骼引用 — 使用原始名稱精確匹配
      if (child.isBone) {
        const n = child.name;
        // 精確匹配 ReadyPlayerMe 骨骼名稱
        if (n === 'Head') headBoneRef.current = child;
        if (n === 'Spine') spineRef.current = child;
        if (n === 'Spine1') spine1Ref.current = child;
        if (n === 'LeftShoulder') leftShoulderRef.current = child;
        if (n === 'RightShoulder') rightShoulderRef.current = child;
        if (n === 'LeftArm') leftArmRef.current = child;
        if (n === 'RightArm') rightArmRef.current = child;
        if (n === 'LeftForeArm') leftForeArmRef.current = child;
        if (n === 'RightForeArm') rightForeArmRef.current = child;
        if (n === 'LeftHand') leftHandRef.current = child;
        if (n === 'RightHand') rightHandRef.current = child;
        if (n === 'RightHandIndex1') rightIndex1Ref.current = child;
        if (n === 'RightHandIndex2') rightIndex2Ref.current = child;
        if (n === 'RightHandIndex3') rightIndex3Ref.current = child;
      }
    });
  }, [scene]);

  const BASE_Y = -5.3;

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // 浮動呼吸動畫（始終運行）
    if (ref.current) {
      ref.current.position.y = BASE_Y + Math.sin(t * 0.8) * 0.03;
    }

    if (isSpeaking) {
      // === 說話時的動畫 ===
      const talkValue = (Math.abs(Math.sin(t * 12)) * 0.55) + (Math.random() * 0.1);
      const smileValue = 0.3 + Math.sin(t * 0.4) * 0.15; // 微笑 0.15~0.45

      // 1. 嘴巴 + 微笑
      [faceMeshRef, teethMeshRef].forEach(meshRef => {
        if (!meshRef.current) return;
        const dict = meshRef.current.morphTargetDictionary;
        const influences = meshRef.current.morphTargetInfluences;
        if (dict['mouthOpen'] !== undefined) influences[dict['mouthOpen']] = talkValue;
        if (dict['mouthSmile'] !== undefined) influences[dict['mouthSmile']] = smileValue;
      });

      // 2. 頭部自然轉動
      if (headBoneRef.current) {
        headBoneRef.current.rotation.y = Math.sin(t * 0.5) * 0.20;  // 左右 ±11°
        headBoneRef.current.rotation.x = Math.sin(t * 0.3) * 0.12;  // 點頭 ±7°
        headBoneRef.current.rotation.z = Math.sin(t * 0.25) * 0.05; // 微傾 ±3°
      }

      // 3. 身體擺動
      if (spineRef.current) {
        spineRef.current.rotation.y = Math.sin(t * 0.4) * 0.10;
      }
      if (spine1Ref.current) {
        spine1Ref.current.rotation.y = Math.sin(t * 0.35) * 0.05;
      }

      // 4. 肩膀微動
      if (leftShoulderRef.current) {
        leftShoulderRef.current.rotation.z = Math.sin(t * 0.45) * 0.06;
      }
      if (rightShoulderRef.current) {
        rightShoulderRef.current.rotation.z = Math.sin(t * 0.45 + Math.PI) * 0.06;
      }

      // 5. 手臂手勢（大幅度，明顯可見）
      if (leftArmRef.current) {
        leftArmRef.current.rotation.z = Math.sin(t * 0.6) * 0.30;  // ±17°
        leftArmRef.current.rotation.x = Math.sin(t * 0.5 + 1) * 0.15;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.z = Math.sin(t * 0.6 + Math.PI) * 0.30;
        rightArmRef.current.rotation.x = Math.sin(t * 0.5) * 0.15;
      }

      // 6. 前臂彎曲
      if (leftForeArmRef.current) {
        leftForeArmRef.current.rotation.y = Math.sin(t * 0.7) * 0.20;
      }
      if (rightForeArmRef.current) {
        rightForeArmRef.current.rotation.y = Math.sin(t * 0.7 + Math.PI / 2) * 0.20;
      }

      // 7. 右手食指指向手勢（週期性）
      const pointCycle = Math.sin(t * 0.3) * 0.5 + 0.5; // 0~1 循環
      if (pointCycle > 0.7) {
        // 指向姿勢
        if (rightIndex1Ref.current) rightIndex1Ref.current.rotation.z = -0.1;
        if (rightIndex2Ref.current) rightIndex2Ref.current.rotation.z = -0.05;
        if (rightIndex3Ref.current) rightIndex3Ref.current.rotation.z = 0;
      } else {
        // 自然彎曲
        if (rightIndex1Ref.current) {
          rightIndex1Ref.current.rotation.z = THREE.MathUtils.lerp(rightIndex1Ref.current.rotation.z, 0.3, 0.1);
        }
        if (rightIndex2Ref.current) {
          rightIndex2Ref.current.rotation.z = THREE.MathUtils.lerp(rightIndex2Ref.current.rotation.z, 0.4, 0.1);
        }
        if (rightIndex3Ref.current) {
          rightIndex3Ref.current.rotation.z = THREE.MathUtils.lerp(rightIndex3Ref.current.rotation.z, 0.3, 0.1);
        }
      }

    } else {
      // === 不說話時：平滑回到中立 ===
      const lerp = THREE.MathUtils.lerp;
      const rate = 0.08;

      // 嘴巴 + 微笑回到0
      [faceMeshRef, teethMeshRef].forEach(meshRef => {
        if (!meshRef.current) return;
        const dict = meshRef.current.morphTargetDictionary;
        const inf = meshRef.current.morphTargetInfluences;
        if (dict['mouthOpen'] !== undefined) inf[dict['mouthOpen']] = lerp(inf[dict['mouthOpen']], 0, 0.15);
        if (dict['mouthSmile'] !== undefined) inf[dict['mouthSmile']] = lerp(inf[dict['mouthSmile']], 0.1, 0.08); // 保持微微笑
      });

      // 骨骼回到中立
      if (headBoneRef.current) {
        headBoneRef.current.rotation.y = lerp(headBoneRef.current.rotation.y, 0, rate);
        headBoneRef.current.rotation.x = lerp(headBoneRef.current.rotation.x, 0, rate);
        headBoneRef.current.rotation.z = lerp(headBoneRef.current.rotation.z, 0, rate);
      }
      if (spineRef.current) spineRef.current.rotation.y = lerp(spineRef.current.rotation.y, 0, rate);
      if (spine1Ref.current) spine1Ref.current.rotation.y = lerp(spine1Ref.current.rotation.y, 0, rate);
      if (leftShoulderRef.current) leftShoulderRef.current.rotation.z = lerp(leftShoulderRef.current.rotation.z, 0, rate);
      if (rightShoulderRef.current) rightShoulderRef.current.rotation.z = lerp(rightShoulderRef.current.rotation.z, 0, rate);
      if (leftArmRef.current) {
        leftArmRef.current.rotation.z = lerp(leftArmRef.current.rotation.z, 0, rate);
        leftArmRef.current.rotation.x = lerp(leftArmRef.current.rotation.x, 0, rate);
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.z = lerp(rightArmRef.current.rotation.z, 0, rate);
        rightArmRef.current.rotation.x = lerp(rightArmRef.current.rotation.x, 0, rate);
      }
      if (leftForeArmRef.current) leftForeArmRef.current.rotation.y = lerp(leftForeArmRef.current.rotation.y, 0, rate);
      if (rightForeArmRef.current) rightForeArmRef.current.rotation.y = lerp(rightForeArmRef.current.rotation.y, 0, rate);
      if (rightIndex1Ref.current) rightIndex1Ref.current.rotation.z = lerp(rightIndex1Ref.current.rotation.z, 0.3, rate);
      if (rightIndex2Ref.current) rightIndex2Ref.current.rotation.z = lerp(rightIndex2Ref.current.rotation.z, 0.4, rate);
      if (rightIndex3Ref.current) rightIndex3Ref.current.rotation.z = lerp(rightIndex3Ref.current.rotation.z, 0.3, rate);
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

// 提取重點文字（從 Markdown 粗體中提取）
function extractKeywords(text) {
  if (!text) return [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  const keywords = [];
  let match;
  while ((match = boldRegex.exec(text)) !== null) {
    const keyword = match[1].trim();
    if (keyword && keyword.length > 1 && keyword.length < 20) {
      keywords.push(keyword);
    }
  }
  return keywords.slice(0, 3);
}

export default function Doctor3D({ isSpeaking, onStopSpeaking, isMobile = false, currentText = '' }) {
  const keywords = extractKeywords(currentText);

  const cameraSettings = isMobile
    ? { position: [0, 1.2, 3.5], fov: 28 }
    : { position: [0, 0.5, 6.5], fov: 25 };

  return (
    <div
      onClick={onStopSpeaking}
      style={{
        width: '100%',
        height: '100%',
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

      {/* 背景重點文字 */}
      {isSpeaking && keywords.length > 0 && !isMobile && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '50%',
          transform: 'translateX(-50%)', display: 'flex',
          flexDirection: 'column', gap: '8px', alignItems: 'center',
          pointerEvents: 'none', zIndex: 10
        }}>
          {keywords.map((keyword, index) => (
            <div key={index} style={{
              background: 'rgba(46, 134, 222, 0.9)', color: 'white',
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
