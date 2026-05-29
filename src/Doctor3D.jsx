// src/Doctor3D.jsx - 3D 醫師模型（生動動畫版：手勢、眨眼、身體語言）
import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

// ========== 動畫工具函數 ==========
const lerp = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;

// 平滑 sin 波 (用於自然動作)
function smoothSin(t, freq, phase = 0) {
  return Math.sin(t * freq + phase);
}

// 隨機範圍
function randRange(min, max) {
  return min + Math.random() * (max - min);
}

// ========== 手勢預設 ==========
const GESTURE_PRESETS = [
  {
    name: 'explain_right',
    duration: [2.5, 4.0],
    bones: {
      RightArm: { x: -0.3, y: 0.2, z: -0.4 },
      RightForeArm: { x: -0.6, y: 0.1, z: 0 },
      RightHand: { x: -0.2, y: 0, z: 0.1 },
      Spine2: { x: 0, y: -0.04, z: 0 },
    }
  },
  {
    name: 'explain_left',
    duration: [2.5, 4.0],
    bones: {
      LeftArm: { x: -0.3, y: -0.2, z: 0.4 },
      LeftForeArm: { x: -0.6, y: -0.1, z: 0 },
      LeftHand: { x: -0.2, y: 0, z: -0.1 },
      Spine2: { x: 0, y: 0.04, z: 0 },
    }
  },
  {
    name: 'both_hands_open',
    duration: [2.0, 3.5],
    bones: {
      RightArm: { x: -0.25, y: 0.3, z: -0.5 },
      RightForeArm: { x: -0.4, y: 0.2, z: 0 },
      RightHand: { x: -0.1, y: 0, z: 0.2 },
      LeftArm: { x: -0.25, y: -0.3, z: 0.5 },
      LeftForeArm: { x: -0.4, y: -0.2, z: 0 },
      LeftHand: { x: -0.1, y: 0, z: -0.2 },
      Spine2: { x: 0.02, y: 0, z: 0 },
    }
  },
  {
    name: 'point_forward',
    duration: [1.8, 3.0],
    bones: {
      RightArm: { x: -0.5, y: 0.1, z: -0.3 },
      RightForeArm: { x: -0.8, y: 0, z: 0 },
      RightHand: { x: -0.3, y: 0, z: 0 },
      Spine2: { x: 0.03, y: -0.03, z: 0 },
    }
  },
  {
    name: 'hands_together',
    duration: [2.0, 3.5],
    bones: {
      RightArm: { x: -0.2, y: -0.1, z: -0.3 },
      RightForeArm: { x: -0.9, y: -0.2, z: 0.2 },
      RightHand: { x: -0.1, y: 0.2, z: 0.3 },
      LeftArm: { x: -0.2, y: 0.1, z: 0.3 },
      LeftForeArm: { x: -0.9, y: 0.2, z: -0.2 },
      LeftHand: { x: -0.1, y: -0.2, z: -0.3 },
      Spine2: { x: 0.02, y: 0, z: 0 },
    }
  },
  {
    name: 'gentle_wave',
    duration: [1.5, 2.5],
    bones: {
      RightArm: { x: -0.4, y: 0.4, z: -0.5 },
      RightForeArm: { x: -0.5, y: 0.3, z: 0 },
      RightHand: { x: 0, y: 0, z: 0.3 },
      Spine2: { x: 0, y: -0.02, z: -0.02 },
    }
  },
];

// Idle 微動作
const IDLE_MICRO_GESTURES = [
  {
    name: 'chin_touch',
    duration: [3.0, 5.0],
    bones: {
      RightArm: { x: -0.3, y: -0.2, z: -0.2 },
      RightForeArm: { x: -1.2, y: -0.3, z: 0.3 },
      RightHand: { x: -0.4, y: 0.1, z: 0.2 },
    }
  },
  {
    name: 'arms_crossed_light',
    duration: [4.0, 7.0],
    bones: {
      RightArm: { x: -0.1, y: -0.2, z: -0.2 },
      RightForeArm: { x: -0.8, y: -0.3, z: 0.4 },
      LeftArm: { x: -0.1, y: 0.2, z: 0.2 },
      LeftForeArm: { x: -0.8, y: 0.3, z: -0.4 },
    }
  },
  {
    name: 'weight_shift',
    duration: [3.0, 5.0],
    bones: {
      Spine: { x: 0, y: 0.02, z: 0.01 },
      Spine1: { x: 0, y: -0.01, z: -0.01 },
    }
  },
];

// ========== DoctorModel 主元件 ==========
function DoctorModel({ isSpeaking }) {
  const { scene } = useGLTF("/doctor.glb");
  const ref = useRef();

  // Mesh refs
  const faceMeshRef = useRef(null);
  const teethMeshRef = useRef(null);

  // 骨骼 refs
  const bonesRef = useRef({});

  // 動畫狀態
  const animState = useRef({
    // 眨眼
    blinkTimer: 0,
    blinkInterval: randRange(2.5, 5.0),
    isBlinking: false,
    blinkProgress: 0,

    // 手勢系統
    currentGesture: null,
    gestureProgress: 0,
    gestureDuration: 3.0,
    gestureTransitionSpeed: 0.035,
    nextGestureTimer: randRange(1.0, 2.0),

    // Idle 微動作
    idleGesture: null,
    idleGestureProgress: 0,
    idleGestureDuration: 4.0,
    idleGestureTransitionSpeed: 0.02,
    nextIdleTimer: randRange(3.0, 6.0),

    // 骨骼 rest pose
    restPose: {},

    // 說話狀態追蹤
    wasSpeaking: false,
    speakingStartTime: 0,

    // 頭部初始旋轉
    headRestX: 0,

    // 上一幀時間
    lastTime: 0,
  });

  useEffect(() => {
    const bones = {};
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        if (child.name === 'Wolf3D_Head') faceMeshRef.current = child;
        if (child.name === 'Wolf3D_Teeth') teethMeshRef.current = child;
      }
      if (child.isBone) {
        bones[child.name] = child;
        if (!animState.current.restPose[child.name]) {
          animState.current.restPose[child.name] = {
            x: child.rotation.x,
            y: child.rotation.y,
            z: child.rotation.z,
          };
        }
      }
    });
    bonesRef.current = bones;

    if (bones.Head) {
      animState.current.headRestX = bones.Head.rotation.x - 0.1;
      bones.Head.rotation.x = animState.current.headRestX;
    }
  }, [scene]);

  const BASE_Y = -5.3;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const anim = animState.current;
    const bones = bonesRef.current;

    // 計算 delta time（安全版，避免除以零）
    const dt = Math.min(t - anim.lastTime, 0.1); // 最大 100ms
    anim.lastTime = t;
    if (dt <= 0) return; // 跳過無效幀

    // --- 呼吸浮動 ---
    if (ref.current) {
      ref.current.position.y = BASE_Y + Math.sin(t * 0.8) * 0.015;
    }

    // --- 眨眼 ---
    updateBlink(dt, anim, bones);

    // --- 呼吸（肩膀）---
    applyBreathing(t, bones, anim);

    if (isSpeaking) {
      if (!anim.wasSpeaking) {
        anim.wasSpeaking = true;
        anim.speakingStartTime = t;
        anim.nextGestureTimer = 0.5;
        anim.currentGesture = null;
      }

      applySpeakingMouth(t);
      applySpeakingHead(t, state, bones, anim);
      applySpeakingTorso(t, bones, anim);
      updateSpeakingGesture(dt, anim);
      applyGestureBones(anim, bones, true);

    } else {
      if (anim.wasSpeaking) {
        anim.wasSpeaking = false;
        anim.currentGesture = null;
        anim.gestureProgress = 0;
        anim.nextIdleTimer = randRange(2.0, 4.0);
      }

      applyIdleMouth();
      applyIdleHead(state, bones, anim);
      applyIdleTorso(t, bones, anim);
      updateIdleGesture(dt, anim);
      applyGestureBones(anim, bones, false);
    }
  });

  // ========== 眨眼 ==========
  function updateBlink(dt, anim, bones) {
    anim.blinkTimer += dt;
    if (!anim.isBlinking && anim.blinkTimer >= anim.blinkInterval) {
      anim.isBlinking = true;
      anim.blinkProgress = 0;
      anim.blinkTimer = 0;
      anim.blinkInterval = Math.random() < 0.2
        ? randRange(0.3, 0.5)
        : randRange(2.5, 5.5);
    }
    if (anim.isBlinking) {
      anim.blinkProgress += dt * 8;
      if (anim.blinkProgress >= 1.0) {
        anim.isBlinking = false;
        anim.blinkProgress = 0;
      }
    }

    // 用眼球骨骼 scaleY 模擬眨眼
    let blinkValue = 0;
    if (anim.isBlinking) {
      blinkValue = Math.sin(clamp(anim.blinkProgress, 0, 1) * Math.PI);
    }
    if (bones.LeftEye) {
      bones.LeftEye.scale.y = lerp(bones.LeftEye.scale.y, 1 - blinkValue * 0.7, 0.3);
    }
    if (bones.RightEye) {
      bones.RightEye.scale.y = lerp(bones.RightEye.scale.y, 1 - blinkValue * 0.7, 0.3);
    }
  }

  // ========== 呼吸 ==========
  function applyBreathing(t, bones, anim) {
    const breathCycle = Math.sin(t * 0.7) * 0.5 + 0.5;
    if (bones.Spine1) {
      const rest = anim.restPose.Spine1 || { x: 0, y: 0, z: 0 };
      bones.Spine1.rotation.x = lerp(bones.Spine1.rotation.x, rest.x + breathCycle * 0.008, 0.04);
    }
    if (bones.LeftShoulder) {
      const rest = anim.restPose.LeftShoulder || { z: 0 };
      bones.LeftShoulder.rotation.z = lerp(bones.LeftShoulder.rotation.z, (rest.z || 0) + breathCycle * 0.006, 0.03);
    }
    if (bones.RightShoulder) {
      const rest = anim.restPose.RightShoulder || { z: 0 };
      bones.RightShoulder.rotation.z = lerp(bones.RightShoulder.rotation.z, (rest.z || 0) - breathCycle * 0.006, 0.03);
    }
  }

  // ========== 說話嘴巴 ==========
  function applySpeakingMouth(t) {
    const base = Math.abs(Math.sin(t * 10));
    const variation = Math.abs(Math.sin(t * 7.3)) * 0.3;
    const pause = Math.sin(t * 1.5) > 0.7 ? 0.3 : 1.0;
    const talkValue = clamp((base * 0.5 + variation) * pause + Math.random() * 0.05, 0, 0.65);
    const smileValue = 0.25 + Math.sin(t * 0.5) * 0.12;

    [faceMeshRef, teethMeshRef].forEach(meshRef => {
      if (!meshRef.current) return;
      const dict = meshRef.current.morphTargetDictionary;
      const inf = meshRef.current.morphTargetInfluences;
      if (!dict || !inf) return;
      if (dict['mouthOpen'] !== undefined) {
        inf[dict['mouthOpen']] = lerp(inf[dict['mouthOpen']], talkValue, 0.2);
      }
      if (dict['mouthSmile'] !== undefined) {
        inf[dict['mouthSmile']] = lerp(inf[dict['mouthSmile']], smileValue, 0.06);
      }
    });
  }

  // ========== 說話頭部 ==========
  function applySpeakingHead(t, state, bones, anim) {
    if (!bones.Head) return;

    const nodX = smoothSin(t, 0.4, 0) * 0.04 + smoothSin(t, 1.2, 1) * 0.02;
    const turnY = smoothSin(t, 0.3, 2) * 0.08 + smoothSin(t, 0.8, 0.5) * 0.03;
    const tiltZ = smoothSin(t, 0.25, 1.5) * 0.03;

    const pointerX = state.pointer.x * 0.08;
    const pointerY = state.pointer.y * 0.04;

    bones.Head.rotation.y = lerp(bones.Head.rotation.y, turnY + pointerX, 0.05);
    bones.Head.rotation.x = lerp(bones.Head.rotation.x, anim.headRestX + nodX - pointerY, 0.05);
    bones.Head.rotation.z = lerp(bones.Head.rotation.z, tiltZ, 0.04);

    if (bones.Neck) {
      bones.Neck.rotation.y = lerp(bones.Neck.rotation.y, turnY * 0.25, 0.03);
      bones.Neck.rotation.x = lerp(bones.Neck.rotation.x, nodX * 0.15, 0.03);
    }
  }

  // ========== 說話上半身 ==========
  function applySpeakingTorso(t, bones, anim) {
    if (!bones.Spine2) return;
    const rest = anim.restPose.Spine2 || { x: 0, y: 0, z: 0 };

    const swayY = smoothSin(t, 0.25, 0) * 0.03;
    const leanX = smoothSin(t, 0.15, 1) * 0.015;

    bones.Spine2.rotation.y = lerp(bones.Spine2.rotation.y, rest.y + swayY, 0.03);
    bones.Spine2.rotation.x = lerp(bones.Spine2.rotation.x, rest.x + leanX, 0.03);
    bones.Spine2.rotation.z = lerp(bones.Spine2.rotation.z, rest.z + smoothSin(t, 0.2, 2) * 0.015, 0.03);
  }

  // ========== 說話手勢更新 ==========
  function updateSpeakingGesture(dt, anim) {
    if (anim.currentGesture) {
      anim.gestureProgress += dt;
      if (anim.gestureProgress >= anim.gestureDuration) {
        anim.currentGesture = null;
        anim.gestureProgress = 0;
        anim.nextGestureTimer = randRange(0.5, 1.8);
      }
    } else {
      anim.nextGestureTimer -= dt;
      if (anim.nextGestureTimer <= 0) {
        const gesture = GESTURE_PRESETS[Math.floor(Math.random() * GESTURE_PRESETS.length)];
        anim.currentGesture = gesture;
        anim.gestureProgress = 0;
        anim.gestureDuration = randRange(gesture.duration[0], gesture.duration[1]);
        anim.gestureTransitionSpeed = randRange(0.025, 0.04);
      }
    }
  }

  // ========== Idle 微動作更新 ==========
  function updateIdleGesture(dt, anim) {
    if (anim.idleGesture) {
      anim.idleGestureProgress += dt;
      if (anim.idleGestureProgress >= anim.idleGestureDuration) {
        anim.idleGesture = null;
        anim.idleGestureProgress = 0;
        anim.nextIdleTimer = randRange(4.0, 8.0);
      }
    } else {
      anim.nextIdleTimer -= dt;
      if (anim.nextIdleTimer <= 0) {
        const gesture = IDLE_MICRO_GESTURES[Math.floor(Math.random() * IDLE_MICRO_GESTURES.length)];
        anim.idleGesture = gesture;
        anim.idleGestureProgress = 0;
        anim.idleGestureDuration = randRange(gesture.duration[0], gesture.duration[1]);
        anim.idleGestureTransitionSpeed = randRange(0.015, 0.025);
      }
    }
  }

  // ========== 套用手勢到骨骼 ==========
  function applyGestureBones(anim, bones, isSpeakingMode) {
    const gesture = isSpeakingMode ? anim.currentGesture : anim.idleGesture;
    const progress = isSpeakingMode ? anim.gestureProgress : anim.idleGestureProgress;
    const duration = isSpeakingMode ? anim.gestureDuration : anim.idleGestureDuration;
    const speed = isSpeakingMode ? anim.gestureTransitionSpeed : anim.idleGestureTransitionSpeed;

    // 計算手勢強度（淡入淡出）
    let intensity = 0;
    if (gesture && duration > 0) {
      const fadeIn = Math.min(0.6, duration * 0.2);
      const fadeOut = Math.min(0.8, duration * 0.25);

      if (progress < fadeIn) {
        intensity = fadeIn > 0 ? progress / fadeIn : 1;
      } else if (progress > duration - fadeOut) {
        intensity = fadeOut > 0 ? (duration - progress) / fadeOut : 0;
      } else {
        intensity = 1.0;
      }
      intensity = clamp(intensity, 0, 1);
      // ease-in-out
      intensity = intensity * intensity * (3 - 2 * intensity);
    }

    // 需要控制的骨骼
    const controlledBones = [
      'RightArm', 'RightForeArm', 'RightHand',
      'LeftArm', 'LeftForeArm', 'LeftHand',
    ];

    controlledBones.forEach(boneName => {
      const bone = bones[boneName];
      if (!bone) return;
      const rest = anim.restPose[boneName] || { x: 0, y: 0, z: 0 };

      let targetX = rest.x;
      let targetY = rest.y;
      let targetZ = rest.z;

      if (gesture && gesture.bones && gesture.bones[boneName] && intensity > 0) {
        const g = gesture.bones[boneName];
        targetX = rest.x + (g.x || 0) * intensity;
        targetY = rest.y + (g.y || 0) * intensity;
        targetZ = rest.z + (g.z || 0) * intensity;

        // 微小動態抖動（說話時）
        if (isSpeakingMode && intensity > 0.3) {
          targetX += smoothSin(progress * 3, 2.0, boneName.length) * 0.01 * intensity;
          targetY += smoothSin(progress * 3, 1.5, boneName.length * 2) * 0.008 * intensity;
        }
      }

      bone.rotation.x = lerp(bone.rotation.x, targetX, speed || 0.03);
      bone.rotation.y = lerp(bone.rotation.y, targetY, speed || 0.03);
      bone.rotation.z = lerp(bone.rotation.z, targetZ, speed || 0.03);
    });

    // Spine 骨骼（只在手勢有定義時才動）
    ['Spine2', 'Spine1', 'Spine'].forEach(boneName => {
      const bone = bones[boneName];
      if (!bone) return;
      // 如果手勢有定義這個骨骼就套用，否則不干預（讓其他函數控制）
      if (gesture && gesture.bones && gesture.bones[boneName] && intensity > 0) {
        const rest = anim.restPose[boneName] || { x: 0, y: 0, z: 0 };
        const g = gesture.bones[boneName];
        const targetX = rest.x + (g.x || 0) * intensity;
        const targetY = rest.y + (g.y || 0) * intensity;
        const targetZ = rest.z + (g.z || 0) * intensity;
        bone.rotation.x = lerp(bone.rotation.x, targetX, speed || 0.03);
        bone.rotation.y = lerp(bone.rotation.y, targetY, speed || 0.03);
        bone.rotation.z = lerp(bone.rotation.z, targetZ, speed || 0.03);
      }
    });
  }

  // ========== Idle 嘴巴 ==========
  function applyIdleMouth() {
    [faceMeshRef, teethMeshRef].forEach(meshRef => {
      if (!meshRef.current) return;
      const dict = meshRef.current.morphTargetDictionary;
      const inf = meshRef.current.morphTargetInfluences;
      if (!dict || !inf) return;
      if (dict['mouthOpen'] !== undefined) {
        inf[dict['mouthOpen']] = lerp(inf[dict['mouthOpen']], 0, 0.1);
      }
      if (dict['mouthSmile'] !== undefined) {
        inf[dict['mouthSmile']] = lerp(inf[dict['mouthSmile']], 0.12, 0.04);
      }
    });
  }

  // ========== Idle 頭部 ==========
  function applyIdleHead(state, bones, anim) {
    if (!bones.Head) return;

    const targetY = state.pointer.x * 0.22;
    const targetX = anim.headRestX - state.pointer.y * 0.1;

    bones.Head.rotation.y = lerp(bones.Head.rotation.y, targetY, 0.035);
    bones.Head.rotation.x = lerp(bones.Head.rotation.x, targetX, 0.035);
    bones.Head.rotation.z = lerp(bones.Head.rotation.z, 0, 0.04);

    if (bones.Neck) {
      bones.Neck.rotation.y = lerp(bones.Neck.rotation.y, targetY * 0.15, 0.025);
    }
  }

  // ========== Idle 上半身 ==========
  function applyIdleTorso(t, bones, anim) {
    if (!bones.Spine2) return;
    const rest = anim.restPose.Spine2 || { x: 0, y: 0, z: 0 };
    const idleSway = smoothSin(t, 0.12, 0) * 0.008;
    bones.Spine2.rotation.y = lerp(bones.Spine2.rotation.y, rest.y + idleSway, 0.02);
    bones.Spine2.rotation.x = lerp(bones.Spine2.rotation.x, rest.x, 0.02);
    bones.Spine2.rotation.z = lerp(bones.Spine2.rotation.z, rest.z, 0.02);
  }

  return (
    <primitive ref={ref} object={scene} scale={3.2} position={[0, BASE_Y, 0]} />
  );
}

// ========== 關鍵字提取 ==========
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

// ========== 主匯出元件 ==========
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
      <Canvas
        camera={cameraSettings}
        gl={{ antialias: true, powerPreference: 'default' }}
        dpr={[1, 1.5]}
      >
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
