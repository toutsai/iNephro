// src/Doctor3D.jsx - 3D 醫師模型（生動動畫版：手勢、眨眼、身體語言）
import React, { useRef, useEffect, useMemo } from "react";
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
// 每個手勢定義各骨骼的目標旋轉（相對於 rest pose 的偏移）
const GESTURE_PRESETS = [
  {
    name: 'explain_right',  // 右手抬起解釋
    duration: [2.5, 4.0],
    bones: {
      RightArm: { x: -0.3, y: 0.2, z: -0.4 },
      RightForeArm: { x: -0.6, y: 0.1, z: 0 },
      RightHand: { x: -0.2, y: 0, z: 0.1 },
      LeftArm: { x: 0, y: 0, z: 0 },
      LeftForeArm: { x: 0, y: 0, z: 0 },
      Spine2: { x: 0, y: -0.04, z: 0 },
    }
  },
  {
    name: 'explain_left',  // 左手抬起解釋
    duration: [2.5, 4.0],
    bones: {
      LeftArm: { x: -0.3, y: -0.2, z: 0.4 },
      LeftForeArm: { x: -0.6, y: -0.1, z: 0 },
      LeftHand: { x: -0.2, y: 0, z: -0.1 },
      RightArm: { x: 0, y: 0, z: 0 },
      RightForeArm: { x: 0, y: 0, z: 0 },
      Spine2: { x: 0, y: 0.04, z: 0 },
    }
  },
  {
    name: 'both_hands_open',  // 雙手張開（強調）
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
    name: 'point_forward',  // 指向前方（強調重點）
    duration: [1.8, 3.0],
    bones: {
      RightArm: { x: -0.5, y: 0.1, z: -0.3 },
      RightForeArm: { x: -0.8, y: 0, z: 0 },
      RightHand: { x: -0.3, y: 0, z: 0 },
      LeftArm: { x: 0, y: 0, z: 0 },
      LeftForeArm: { x: 0, y: 0, z: 0 },
      Spine2: { x: 0.03, y: -0.03, z: 0 },
    }
  },
  {
    name: 'hands_together',  // 雙手合攏（思考/解釋）
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
    name: 'gentle_wave',  // 輕微揮手（親切感）
    duration: [1.5, 2.5],
    bones: {
      RightArm: { x: -0.4, y: 0.4, z: -0.5 },
      RightForeArm: { x: -0.5, y: 0.3, z: 0 },
      RightHand: { x: 0, y: 0, z: 0.3 },
      LeftArm: { x: 0, y: 0, z: 0 },
      LeftForeArm: { x: 0, y: 0, z: 0 },
      Spine2: { x: 0, y: -0.02, z: -0.02 },
    }
  },
];

// Idle 時的微動作預設
const IDLE_MICRO_GESTURES = [
  {
    name: 'chin_touch',  // 摸下巴思考
    duration: [3.0, 5.0],
    bones: {
      RightArm: { x: -0.3, y: -0.2, z: -0.2 },
      RightForeArm: { x: -1.2, y: -0.3, z: 0.3 },
      RightHand: { x: -0.4, y: 0.1, z: 0.2 },
    }
  },
  {
    name: 'arms_crossed_light',  // 輕微交叉手臂
    duration: [4.0, 7.0],
    bones: {
      RightArm: { x: -0.1, y: -0.2, z: -0.2 },
      RightForeArm: { x: -0.8, y: -0.3, z: 0.4 },
      LeftArm: { x: -0.1, y: 0.2, z: 0.2 },
      LeftForeArm: { x: -0.8, y: 0.3, z: -0.4 },
    }
  },
  {
    name: 'weight_shift',  // 重心轉移
    duration: [3.0, 5.0],
    bones: {
      Spine: { x: 0, y: 0.02, z: 0.01 },
      Spine1: { x: 0, y: -0.01, z: -0.01 },
      Hips: { x: 0, y: 0.01, z: 0 },
    }
  },
];

// ========== DoctorModel 主元件 ==========
function DoctorModel({ isSpeaking }) {
  const { scene } = useGLTF("/doctor.glb");
  const ref = useRef();

  // Mesh refs (morph targets)
  const faceMeshRef = useRef(null);
  const teethMeshRef = useRef(null);
  const eyeLeftMeshRef = useRef(null);
  const eyeRightMeshRef = useRef(null);

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
    gestureTransitionSpeed: 0.03,
    nextGestureTimer: 0,
    nextGestureInterval: randRange(2.0, 4.0),

    // Idle 微動作
    idleGesture: null,
    idleGestureProgress: 0,
    idleGestureDuration: 4.0,
    idleGestureTransitionSpeed: 0.02,
    nextIdleTimer: 0,
    nextIdleInterval: randRange(3.0, 6.0),

    // 骨骼 rest pose 記錄
    restPose: {},

    // 說話狀態追蹤
    wasSpeaking: false,
    speakingStartTime: 0,

    // 眉毛/表情
    expressionTimer: 0,
    expressionTarget: 0,

    // 呼吸
    breathPhase: 0,

    // 頭部初始旋轉
    headRestX: 0,
  });

  // 初始化：遍歷場景找到所有需要的骨骼和 mesh
  useEffect(() => {
    const bones = {};
    scene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary) {
        if (child.name === 'Wolf3D_Head') faceMeshRef.current = child;
        if (child.name === 'Wolf3D_Teeth') teethMeshRef.current = child;
        if (child.name === 'EyeLeft') eyeLeftMeshRef.current = child;
        if (child.name === 'EyeRight') eyeRightMeshRef.current = child;
      }
      if (child.isBone) {
        bones[child.name] = child;
        // 記錄 rest pose
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

    // 微調頭部初始角度（稍微抬頭看向鏡頭）
    if (bones.Head) {
      animState.current.headRestX = bones.Head.rotation.x - 0.1;
      bones.Head.rotation.x = animState.current.headRestX;
    }
  }, [scene]);

  const BASE_Y = -5.3;

  // ========== 主動畫循環 ==========
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const dt = state.clock.getDelta() || 0.016;
    const anim = animState.current;
    const bones = bonesRef.current;

    // --- 呼吸浮動 ---
    anim.breathPhase += dt * 0.8;
    if (ref.current) {
      ref.current.position.y = BASE_Y + Math.sin(anim.breathPhase) * 0.015;
    }

    // --- 眨眼系統 ---
    updateBlink(dt, anim);
    applyBlink(anim);

    // --- 呼吸動作（肩膀微微起伏）---
    applyBreathing(t, bones, anim);

    if (isSpeaking) {
      // 記錄說話開始時間
      if (!anim.wasSpeaking) {
        anim.wasSpeaking = true;
        anim.speakingStartTime = t;
        anim.nextGestureTimer = 0; // 立即觸發第一個手勢
      }

      // --- 嘴巴動畫（更自然的說話節奏）---
      applySpeakingMouth(t, anim);

      // --- 頭部動畫（說話時更活潑）---
      applySpeakingHead(t, state, bones, anim);

      // --- 上半身動畫 ---
      applySpeakingTorso(t, bones, anim);

      // --- 手勢系統 ---
      updateGestureSystem(t, dt, anim, true);
      applyGesture(anim, bones, true);

    } else {
      // 從說話切換到 idle
      if (anim.wasSpeaking) {
        anim.wasSpeaking = false;
        anim.currentGesture = null;
        anim.gestureProgress = 0;
        anim.nextIdleTimer = randRange(2.0, 4.0);
      }

      // --- Idle 嘴巴（微笑）---
      applyIdleMouth(anim);

      // --- Idle 頭部（跟隨滑鼠）---
      applyIdleHead(state, bones, anim);

      // --- Idle 上半身 ---
      applyIdleTorso(t, bones, anim);

      // --- Idle 微動作系統 ---
      updateGestureSystem(t, dt, anim, false);
      applyGesture(anim, bones, false);
    }
  });

  // ========== 眨眼 ==========
  function updateBlink(dt, anim) {
    anim.blinkTimer += dt;
    if (!anim.isBlinking && anim.blinkTimer >= anim.blinkInterval) {
      anim.isBlinking = true;
      anim.blinkProgress = 0;
      anim.blinkTimer = 0;
      // 偶爾連續眨兩次
      anim.blinkInterval = Math.random() < 0.2
        ? randRange(0.3, 0.5)
        : randRange(2.5, 5.5);
    }
    if (anim.isBlinking) {
      anim.blinkProgress += dt * 8; // 眨眼速度
      if (anim.blinkProgress >= 1.0) {
        anim.isBlinking = false;
        anim.blinkProgress = 0;
      }
    }
  }

  function applyBlink(anim) {
    // 使用眼球骨骼的 scale 模擬眨眼（因為 morph target 有限）
    const bones = bonesRef.current;
    let blinkValue = 0;
    if (anim.isBlinking) {
      // 快速閉合再張開的曲線
      blinkValue = Math.sin(anim.blinkProgress * Math.PI);
    }

    // 如果有眼睛 mesh 的 morph target 可用就用，否則用骨骼 scale
    if (bones.LeftEye) {
      bones.LeftEye.scale.y = lerp(bones.LeftEye.scale.y, 1 - blinkValue * 0.8, 0.3);
    }
    if (bones.RightEye) {
      bones.RightEye.scale.y = lerp(bones.RightEye.scale.y, 1 - blinkValue * 0.8, 0.3);
    }
  }

  // ========== 呼吸 ==========
  function applyBreathing(t, bones, anim) {
    const breathCycle = Math.sin(t * 0.7) * 0.5 + 0.5; // 0~1
    if (bones.Spine1) {
      const rest = anim.restPose.Spine1 || { x: 0, y: 0, z: 0 };
      bones.Spine1.rotation.x = lerp(
        bones.Spine1.rotation.x,
        rest.x + breathCycle * 0.01,
        0.05
      );
    }
    // 肩膀微微隨呼吸起伏
    if (bones.LeftShoulder) {
      bones.LeftShoulder.rotation.z = lerp(
        bones.LeftShoulder.rotation.z,
        (anim.restPose.LeftShoulder?.z || 0) + breathCycle * 0.008,
        0.03
      );
    }
    if (bones.RightShoulder) {
      bones.RightShoulder.rotation.z = lerp(
        bones.RightShoulder.rotation.z,
        (anim.restPose.RightShoulder?.z || 0) - breathCycle * 0.008,
        0.03
      );
    }
  }

  // ========== 說話嘴巴 ==========
  function applySpeakingMouth(t, anim) {
    // 更自然的說話節奏：混合多個頻率
    const base = Math.abs(Math.sin(t * 10));
    const variation = Math.abs(Math.sin(t * 7.3)) * 0.3;
    const pause = Math.sin(t * 1.5) > 0.7 ? 0.3 : 1.0; // 偶爾停頓
    const talkValue = clamp((base * 0.5 + variation) * pause + Math.random() * 0.05, 0, 0.7);
    const smileValue = 0.25 + Math.sin(t * 0.5) * 0.15;

    [faceMeshRef, teethMeshRef].forEach(meshRef => {
      if (!meshRef.current) return;
      const dict = meshRef.current.morphTargetDictionary;
      const inf = meshRef.current.morphTargetInfluences;
      if (dict['mouthOpen'] !== undefined) {
        inf[dict['mouthOpen']] = lerp(inf[dict['mouthOpen']], talkValue, 0.25);
      }
      if (dict['mouthSmile'] !== undefined) {
        inf[dict['mouthSmile']] = lerp(inf[dict['mouthSmile']], smileValue, 0.08);
      }
    });
  }

  // ========== 說話頭部 ==========
  function applySpeakingHead(t, state, bones, anim) {
    if (!bones.Head) return;
    const speakTime = t - anim.speakingStartTime;

    // 頭部動作更豐富：結合多個頻率的擺動
    const nodX = smoothSin(t, 0.4, 0) * 0.04 + smoothSin(t, 1.2, 1) * 0.02;
    const turnY = smoothSin(t, 0.3, 2) * 0.1 + smoothSin(t, 0.8, 0.5) * 0.04;
    const tiltZ = smoothSin(t, 0.25, 1.5) * 0.04;

    // 滑鼠追蹤（說話時減弱）
    const pointerX = state.pointer.x * 0.1;
    const pointerY = state.pointer.y * 0.05;

    bones.Head.rotation.y = lerp(bones.Head.rotation.y, turnY + pointerX, 0.06);
    bones.Head.rotation.x = lerp(bones.Head.rotation.x, anim.headRestX + nodX - pointerY, 0.06);
    bones.Head.rotation.z = lerp(bones.Head.rotation.z, tiltZ, 0.05);

    // 頸部也跟著動（更自然）
    if (bones.Neck) {
      bones.Neck.rotation.y = lerp(bones.Neck.rotation.y, turnY * 0.3, 0.04);
      bones.Neck.rotation.x = lerp(bones.Neck.rotation.x, nodX * 0.2, 0.04);
    }
  }

  // ========== 說話上半身 ==========
  function applySpeakingTorso(t, bones, anim) {
    if (!bones.Spine2) return;
    const rest = anim.restPose.Spine2 || { x: 0, y: 0, z: 0 };

    // 上半身隨說話微微擺動
    const swayY = smoothSin(t, 0.25, 0) * 0.04;
    const leanX = smoothSin(t, 0.15, 1) * 0.02;

    bones.Spine2.rotation.y = lerp(bones.Spine2.rotation.y, rest.y + swayY, 0.04);
    bones.Spine2.rotation.x = lerp(bones.Spine2.rotation.x, rest.x + leanX, 0.04);
    bones.Spine2.rotation.z = lerp(bones.Spine2.rotation.z, rest.z + smoothSin(t, 0.2, 2) * 0.02, 0.04);

    // Spine 也微微動
    if (bones.Spine) {
      const restSpine = anim.restPose.Spine || { x: 0, y: 0, z: 0 };
      bones.Spine.rotation.y = lerp(bones.Spine.rotation.y, restSpine.y + swayY * 0.3, 0.03);
    }
  }

  // ========== 手勢系統 ==========
  function updateGestureSystem(t, dt, anim, isSpeakingMode) {
    const presets = isSpeakingMode ? GESTURE_PRESETS : IDLE_MICRO_GESTURES;
    const timerKey = isSpeakingMode ? 'nextGestureTimer' : 'nextIdleTimer';
    const intervalKey = isSpeakingMode ? 'nextGestureInterval' : 'nextIdleInterval';
    const gestureKey = isSpeakingMode ? 'currentGesture' : 'idleGesture';
    const progressKey = isSpeakingMode ? 'gestureProgress' : 'idleGestureProgress';
    const durationKey = isSpeakingMode ? 'gestureDuration' : 'idleGestureDuration';
    const speedKey = isSpeakingMode ? 'gestureTransitionSpeed' : 'idleGestureTransitionSpeed';

    // 計時器
    anim[timerKey] -= dt;

    if (anim[timerKey] <= 0 && !anim[gestureKey]) {
      // 選擇新手勢
      const gesture = presets[Math.floor(Math.random() * presets.length)];
      anim[gestureKey] = gesture;
      anim[progressKey] = 0;
      anim[durationKey] = randRange(gesture.duration[0], gesture.duration[1]);
      anim[speedKey] = isSpeakingMode ? randRange(0.025, 0.045) : randRange(0.015, 0.03);
    }

    if (anim[gestureKey]) {
      anim[progressKey] += dt;
      if (anim[progressKey] >= anim[durationKey]) {
        // 手勢結束
        anim[gestureKey] = null;
        anim[progressKey] = 0;
        anim[timerKey] = isSpeakingMode
          ? randRange(0.5, 2.0)  // 說話時手勢切換快
          : randRange(3.0, 7.0); // idle 時較慢
      }
    }
  }

  function applyGesture(anim, bones, isSpeakingMode) {
    const gestureKey = isSpeakingMode ? 'currentGesture' : 'idleGesture';
    const progressKey = isSpeakingMode ? 'gestureProgress' : 'idleGestureProgress';
    const durationKey = isSpeakingMode ? 'gestureDuration' : 'idleGestureDuration';
    const speedKey = isSpeakingMode ? 'gestureTransitionSpeed' : 'idleGestureTransitionSpeed';

    const gesture = anim[gestureKey];
    const transitionSpeed = anim[speedKey];

    // 計算手勢強度（淡入淡出）
    let intensity = 0;
    if (gesture) {
      const progress = anim[progressKey];
      const duration = anim[durationKey];
      const fadeIn = 0.6;  // 淡入時間
      const fadeOut = 0.8; // 淡出時間

      if (progress < fadeIn) {
        intensity = progress / fadeIn;
      } else if (progress > duration - fadeOut) {
        intensity = (duration - progress) / fadeOut;
      } else {
        intensity = 1.0;
      }
      intensity = clamp(intensity, 0, 1);
      // 使用 ease-in-out 曲線
      intensity = intensity * intensity * (3 - 2 * intensity);
    }

    // 需要控制的手臂骨骼列表
    const armBones = [
      'RightArm', 'RightForeArm', 'RightHand',
      'LeftArm', 'LeftForeArm', 'LeftHand',
      'Spine2', 'Spine1', 'Spine', 'Hips'
    ];

    armBones.forEach(boneName => {
      const bone = bones[boneName];
      if (!bone) return;
      const rest = anim.restPose[boneName] || { x: 0, y: 0, z: 0 };

      let targetX = rest.x;
      let targetY = rest.y;
      let targetZ = rest.z;

      if (gesture && gesture.bones[boneName]) {
        const g = gesture.bones[boneName];
        targetX = rest.x + (g.x || 0) * intensity;
        targetY = rest.y + (g.y || 0) * intensity;
        targetZ = rest.z + (g.z || 0) * intensity;

        // 加入微小的動態抖動讓手勢更自然
        if (intensity > 0.3 && isSpeakingMode) {
          const t = anim[progressKey];
          targetX += smoothSin(t * 3, 2.5, boneName.length) * 0.015 * intensity;
          targetY += smoothSin(t * 3, 1.8, boneName.length * 2) * 0.01 * intensity;
        }
      }

      // 平滑過渡
      const speed = gesture ? transitionSpeed : 0.025;
      bone.rotation.x = lerp(bone.rotation.x, targetX, speed);
      bone.rotation.y = lerp(bone.rotation.y, targetY, speed);
      bone.rotation.z = lerp(bone.rotation.z, targetZ, speed);
    });

    // 手指動畫（說話時手指微微張開/收攏）
    if (isSpeakingMode && gesture && intensity > 0.2) {
      applyFingerAnimation(anim, bones, intensity);
    }
  }

  // ========== 手指動畫 ==========
  function applyFingerAnimation(anim, bones, intensity) {
    const t = anim.gestureProgress;
    const fingerBones = [
      'RightHandIndex1', 'RightHandIndex2', 'RightHandIndex3',
      'RightHandMiddle1', 'RightHandMiddle2', 'RightHandMiddle3',
      'RightHandRing1', 'RightHandRing2', 'RightHandRing3',
      'RightHandPinky1', 'RightHandPinky2', 'RightHandPinky3',
      'RightHandThumb1', 'RightHandThumb2', 'RightHandThumb3',
      'LeftHandIndex1', 'LeftHandIndex2', 'LeftHandIndex3',
      'LeftHandMiddle1', 'LeftHandMiddle2', 'LeftHandMiddle3',
      'LeftHandRing1', 'LeftHandRing2', 'LeftHandRing3',
      'LeftHandPinky1', 'LeftHandPinky2', 'LeftHandPinky3',
      'LeftHandThumb1', 'LeftHandThumb2', 'LeftHandThumb3',
    ];

    fingerBones.forEach((boneName, i) => {
      const bone = bones[boneName];
      if (!bone) return;
      const rest = anim.restPose[boneName] || { x: 0, y: 0, z: 0 };

      // 手指微微彎曲的自然動作
      const curl = smoothSin(t * 2, 1.5, i * 0.5) * 0.08 * intensity;
      bone.rotation.x = lerp(bone.rotation.x, rest.x + curl, 0.03);
    });
  }

  // ========== Idle 嘴巴 ==========
  function applyIdleMouth(anim) {
    [faceMeshRef, teethMeshRef].forEach(meshRef => {
      if (!meshRef.current) return;
      const dict = meshRef.current.morphTargetDictionary;
      const inf = meshRef.current.morphTargetInfluences;
      if (dict['mouthOpen'] !== undefined) {
        inf[dict['mouthOpen']] = lerp(inf[dict['mouthOpen']], 0, 0.12);
      }
      if (dict['mouthSmile'] !== undefined) {
        inf[dict['mouthSmile']] = lerp(inf[dict['mouthSmile']], 0.15, 0.05);
      }
    });
  }

  // ========== Idle 頭部 ==========
  function applyIdleHead(state, bones, anim) {
    if (!bones.Head) return;

    // 跟隨滑鼠/手指（像在看著你）
    const targetY = state.pointer.x * 0.25;
    const targetX = anim.headRestX - state.pointer.y * 0.12;

    bones.Head.rotation.y = lerp(bones.Head.rotation.y, targetY, 0.04);
    bones.Head.rotation.x = lerp(bones.Head.rotation.x, targetX, 0.04);
    bones.Head.rotation.z = lerp(bones.Head.rotation.z, 0, 0.05);

    // 頸部輕微跟隨
    if (bones.Neck) {
      bones.Neck.rotation.y = lerp(bones.Neck.rotation.y, targetY * 0.2, 0.03);
    }
  }

  // ========== Idle 上半身 ==========
  function applyIdleTorso(t, bones, anim) {
    if (!bones.Spine2) return;
    const rest = anim.restPose.Spine2 || { x: 0, y: 0, z: 0 };

    // 非常輕微的自然擺動
    const idleSway = smoothSin(t, 0.15, 0) * 0.01;
    bones.Spine2.rotation.y = lerp(bones.Spine2.rotation.y, rest.y + idleSway, 0.03);
    bones.Spine2.rotation.x = lerp(bones.Spine2.rotation.x, rest.x, 0.03);
    bones.Spine2.rotation.z = lerp(bones.Spine2.rotation.z, rest.z, 0.03);
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
