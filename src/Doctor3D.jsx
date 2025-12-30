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
  const headBoneRef = useRef(null);
  const spineRef = useRef(null);

  // 眨眼控制
  const blinkTimerRef = useRef(0);
  const nextBlinkTimeRef = useRef(2);

  useEffect(() => {
    console.log('=== 🔍 3D 模型完整掃描開始 ===');

    // 掃描所有 Mesh 及其 Morph Targets
    const meshesWithMorphs = [];
    const allBones = [];

    scene.traverse((child) => {
      // 收集所有 Mesh 及其 Morph Targets
      if (child.isMesh) {
        console.log(`📦 Mesh: ${child.name}`);

        if (child.morphTargetDictionary) {
          const morphs = Object.keys(child.morphTargetDictionary);
          console.log(`  ✅ Morph Targets (${morphs.length}):`, morphs);
          meshesWithMorphs.push({
            name: child.name,
            morphs: morphs
          });

          // 儲存特定 Mesh 的引用
          if (child.name === 'Wolf3D_Head') {
            faceMeshRef.current = child;
          }
          if (child.name === 'Wolf3D_Teeth') {
            teethMeshRef.current = child;
          }
        } else {
          console.log(`  ❌ 無 Morph Targets`);
        }
      }

      // 收集所有骨骼
      if (child.isBone) {
        console.log(`🦴 Bone: ${child.name}`);
        allBones.push(child.name);

        // 儲存特定骨骼的引用
        if (child.name.toLowerCase().includes('head') || child.name.toLowerCase().includes('neck')) {
          headBoneRef.current = child;
        }
        if (child.name.toLowerCase().includes('spine')) {
          spineRef.current = child;
        }
      }
    });

    console.log('=== 📊 掃描結果統計 ===');
    console.log(`總共找到 ${meshesWithMorphs.length} 個帶 Morph Targets 的 Mesh`);
    console.log(`總共找到 ${allBones.length} 個骨骼`);
    console.log('所有骨骼列表:', allBones);
    console.log('=== 🔍 掃描結束 ===');
  }, [scene]);

  const BASE_Y = -5.3; 

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (ref.current) {
      ref.current.position.y = BASE_Y + Math.sin(t) * 0.05;
    }

    // --- 眨眼動畫（自動、隨機） ---
    if (faceMeshRef.current) {
      const dict = faceMeshRef.current.morphTargetDictionary;

      // 眨眼計時器
      blinkTimerRef.current += state.clock.getDelta();

      // 當時間到達下次眨眼時間
      if (blinkTimerRef.current >= nextBlinkTimeRef.current) {
        // 重置計時器
        blinkTimerRef.current = 0;
        // 設定下次眨眼時間（說話時 1.5-3秒，不說話時 2-5秒）
        const minInterval = isSpeaking ? 1.5 : 2;
        const maxInterval = isSpeaking ? 3 : 5;
        nextBlinkTimeRef.current = minInterval + Math.random() * (maxInterval - minInterval);

        // 除錯：顯示眨眼觸發
        console.log('👁️ 眨眼觸發！下次眨眼時間:', nextBlinkTimeRef.current.toFixed(2), '秒後');
      }

      // 眨眼動畫（快速閉眼再睜開）
      const blinkProgress = blinkTimerRef.current;
      let blinkValue = 0;

      // 前 0.1 秒：眼睛閉上
      if (blinkProgress < 0.1) {
        blinkValue = blinkProgress / 0.1;
      }
      // 0.1 - 0.2 秒：眼睛睜開
      else if (blinkProgress < 0.2) {
        blinkValue = 1 - (blinkProgress - 0.1) / 0.1;
      }

      // 套用眨眼（嘗試不同的 morph target 名稱）
      const blinkNames = ['eyeBlinkLeft', 'eyeBlinkRight', 'eyesClosed', 'blink'];
      let appliedBlink = false;

      blinkNames.forEach(name => {
        const idx = dict[name];
        if (idx !== undefined) {
          faceMeshRef.current.morphTargetInfluences[idx] = blinkValue;
          if (blinkValue > 0 && !appliedBlink) {
            appliedBlink = true;
            console.log(`👁️ 套用眨眼: ${name}, 值: ${blinkValue.toFixed(2)}`);
          }
        }
      });

      // 如果沒有找到任何眨眼 morph target，顯示警告（只顯示一次）
      if (!appliedBlink && blinkProgress === 0 && !blinkTimerRef.warnedOnce) {
        console.warn('⚠️ 未找到眨眼 morph targets，可用的有:', Object.keys(dict));
        blinkTimerRef.warnedOnce = true;
      }
    }

    // --- 說話時的動畫 ---
    if (isSpeaking) {
      const talkValue = (Math.abs(Math.sin(t * 12)) * 0.55) + (Math.random() * 0.1);

      // 1. 嘴巴說話動畫
      if (faceMeshRef.current) {
        const idx = faceMeshRef.current.morphTargetDictionary['mouthOpen'];
        if (idx !== undefined) faceMeshRef.current.morphTargetInfluences[idx] = talkValue;
      }
      if (teethMeshRef.current) {
        const idx = teethMeshRef.current.morphTargetDictionary['mouthOpen'];
        if (idx !== undefined) teethMeshRef.current.morphTargetInfluences[idx] = talkValue;
      }

      // 2. 頭部自然轉動（左右搖擺）
      if (headBoneRef.current) {
        headBoneRef.current.rotation.y = Math.sin(t * 0.5) * 0.15; // 左右轉動 ±8.6度
        headBoneRef.current.rotation.x = Math.sin(t * 0.3) * 0.10; // 上下點頭 ±5.7度
      }

      // 3. 身體微微擺動
      if (spineRef.current) {
        spineRef.current.rotation.y = Math.sin(t * 0.4) * 0.08; // 身體輕微左右擺動
      }

    } else {
      // 不說話時，回到正面姿勢
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

      // 頭部和身體緩慢回到中立位置
      if (headBoneRef.current) {
        headBoneRef.current.rotation.y = THREE.MathUtils.lerp(headBoneRef.current.rotation.y, 0, 0.1);
        headBoneRef.current.rotation.x = THREE.MathUtils.lerp(headBoneRef.current.rotation.x, 0, 0.1);
      }
      if (spineRef.current) {
        spineRef.current.rotation.y = THREE.MathUtils.lerp(spineRef.current.rotation.y, 0, 0.1);
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

// 提取重點文字（從 Markdown 粗體中提取）
function extractKeywords(text) {
  if (!text) return [];

  // 提取 **粗體** 內容
  const boldRegex = /\*\*(.*?)\*\*/g;
  const keywords = [];
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    const keyword = match[1].trim();
    if (keyword && keyword.length > 1 && keyword.length < 20) {
      keywords.push(keyword);
    }
  }

  // 限制最多顯示 3 個關鍵字
  return keywords.slice(0, 3);
}

export default function Doctor3D({ isSpeaking, onStopSpeaking, isMobile = false, currentText = '' }) {
  const keywords = extractKeywords(currentText);

  // 行動版：只顯示臉部和頸部的特寫鏡頭
  const cameraSettings = isMobile
    ? { position: [0, 1.5, 3], fov: 30 } // 更近的距離，更高的角度，只看臉部
    : { position: [0, 0.5, 6.5], fov: 25 }; // 桌面版：全身

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
          minPolarAngle={isMobile ? Math.PI/2.5 : Math.PI/2.2}
          maxPolarAngle={isMobile ? Math.PI/2 : Math.PI/1.8}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
        />
      </Canvas>

      {/* 背景重點文字 */}
      {isSpeaking && keywords.length > 0 && !isMobile && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 10
        }}>
          {keywords.map((keyword, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(52, 152, 219, 0.9)',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                animation: `slideIn 0.3s ease-out ${index * 0.1}s both`,
                whiteSpace: 'nowrap'
              }}
            >
              {keyword}
            </div>
          ))}
        </div>
      )}

      {/* 關鍵字動畫 */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}